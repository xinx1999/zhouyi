import 'dotenv/config';
import express from "express";
import { v4 as uuidv4 } from "uuid";
import * as db from "./db.js";
import { castDivination, hexagramToPrompt, getDailyData, type CastRequest } from "./divination.js";

const app = express();
const PORT = process.env.PORT || 3000;

// 续答「正在生成」内存锁：防止同一会话的并发 resume 各自调用模型并落库，
// 导致一条未完成记录出现多个回答（前端已做锁 + 拦截，这里是后端兜底）
const generating = new Set<string>();

// Middleware
app.use(express.json());

// ============= Agnes AI 配置 =============
// Agnes AI API 兼容 OpenAI 风格接口
const AGNES_BASE_URL = () => process.env.AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1";
const AGNES_API_KEY = () => process.env.AGNES_API_KEY || "";

// 模型缓存
let cachedModels: Array<{ modelId: string; name: string; description?: string }> = [];
let defaultModel = "";

function maskKey(k?: string): string | undefined {
  if (!k) return undefined;
  if (k.length <= 12) return "****";
  return k.slice(0, 8) + "****" + k.slice(-4);
}

// 安全解析 JSON（meta 等字符串字段）
function safeJsonParse(s: string): any | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", provider: "agnes", timestamp: new Date().toISOString() });
});

// 检查登录（Agnes：只要配置了 API Key 即视为已登录）
app.get("/api/check-login", (req, res) => {
  const apiKey = AGNES_API_KEY();
  res.json({
    isLoggedIn: !!apiKey,
    method: apiKey ? "env" : "none",
    envConfigured: !!apiKey,
    cliConfigured: false,
    apiKey: maskKey(apiKey),
    envVars: {
      apiKey: maskKey(apiKey),
      baseUrl: AGNES_BASE_URL(),
    },
  });
});

// 保存 Agnes 配置（仅在当前进程有效）
app.post("/api/save-env-config", (req, res) => {
  const { apiKey, baseUrl, model } = req.body;

  if (!apiKey && !baseUrl && !model) {
    return res.status(400).json({ error: "请至少配置 API Key、Base URL 或默认模型" });
  }

  const configured: string[] = [];
  if (apiKey) {
    process.env.AGNES_API_KEY = apiKey;
    configured.push("AGNES_API_KEY");
  }
  if (baseUrl) {
    process.env.AGNES_BASE_URL = baseUrl;
    configured.push("AGNES_BASE_URL");
  }
  if (model) {
    process.env.AGNES_MODEL = model;
    configured.push("AGNES_MODEL");
  }

  // 清除模型缓存，以便重新获取
  cachedModels = [];
  defaultModel = "";

  res.json({
    success: true,
    message: `已设置: ${configured.join(", ")}`,
    note: "配置仅在当前服务器进程有效，重启后需重新设置（建议写入 .env）",
  });
});

// 获取可用模型列表（从 Agnes 拉取）
app.get("/api/models", async (req, res) => {
  try {
    if (cachedModels.length === 0) {
      const key = AGNES_API_KEY();
      if (!key) {
        return res.json({
          models: [],
          defaultModel: "",
          error: "未配置 AGNES_API_KEY，请在 .env 或设置页配置",
        });
      }

      console.log("[Models] 从 Agnes 拉取模型列表...");
      const resp = await fetch(`${AGNES_BASE_URL()}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Agnes 模型接口返回 ${resp.status}: ${txt.slice(0, 300)}`);
      }

      const data = (await resp.json()) as any;
      const list: any[] = Array.isArray(data) ? data : data?.data || [];

      // 过滤出文本/对话类模型，排除图像、视频、音频、embedding 等
      const textModels = list.filter((m) => {
        const id = String(m.id || "").toLowerCase();
        return !/(image|img|video|tts|speech|audio|embedding|realtime|vector)/.test(id);
      });
      const chosen = textModels.length ? textModels : list;

      cachedModels = chosen.map((m) => ({
        modelId: m.id,
        name: m.id,
        description: m.description || "",
      }));

      // 默认模型：优先使用 AGNES_MODEL 环境变量中指定的
      const envModel = process.env.AGNES_MODEL;
      if (envModel && cachedModels.some((m) => m.modelId === envModel)) {
        defaultModel = envModel;
      } else {
        defaultModel = cachedModels[0]?.modelId || "";
      }
      console.log(`[Models] 获取到 ${cachedModels.length} 个文本模型，默认: ${defaultModel}`);
    }

    res.json({ models: cachedModels, defaultModel });
  } catch (error: any) {
    console.error("[Models] Error:", error);
    res.json({
      models: cachedModels,
      defaultModel,
      error: error?.message || String(error),
    });
  }
});

// ============= 每日数据 / 历史 =============

// 今日一卦 / 今日宜忌 / 每日一句（按日期确定，全天一致）
app.get("/api/daily", (req, res) => {
  try {
    // 可选 ?date=YYYY-MM-DD 覆盖（默认今天）
    let date = new Date();
    const q = (req.query.date as string) || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(q)) {
      const [Y, M, D] = q.split('-').map(Number);
      date = new Date(Y, M - 1, D);
    }
    const data = getDailyData(date);
    res.json({ daily: data });
  } catch (error: any) {
    console.error('[Daily] Error:', error);
    res.status(500).json({ error: error?.message || '获取每日数据失败' });
  }
});

// 最近使用记录（含起卦信息 / 求签记录）
app.get("/api/history", (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const rows = db.getRecentSessions(limit);
    const list = rows.map((r) => {
      const meta = r.metaParsed;
      const type = meta?.type || 'chat';
      const base: any = {
        id: r.id,
        title: r.title,
        updatedAt: r.updated_at,
        type,
      };
      if (type === 'lingqian') {
        base.num = meta.num;
        base.name = meta.name;
        base.level = meta.level;
        base.source = meta.source;
      } else {
        base.hexName = meta?.hexName || null;
        base.hexSeq = meta?.hexSeq || null;
        base.method = meta?.method || null;
        // 未完成：起卦/对话中断，助手解读未完整落库（灵签记录恒为已完成）
        base.incomplete = db.isSessionIncomplete(r.id);
      }
      return base;
    });
    res.json({ history: list });
  } catch (error: any) {
    console.error('[History] Error:', error);
    res.status(500).json({ error: error?.message || '获取历史失败' });
  }
});

// 记录一次求签（灵签）到「最近使用」
app.post("/api/lingqian", (req, res) => {
  try {
    const { num, name, level, source } = req.body || {};
    if (!num || !name) {
      return res.status(400).json({ error: '缺少签号或签名' });
    }
    const session = db.recordLingQian(
      Number(num),
      String(name),
      String(level || ''),
      String(source || 'random')
    );
    res.json({ id: session.id });
  } catch (error: any) {
    console.error('[LingQian] Error:', error);
    res.status(500).json({ error: error?.message || '记录求签失败' });
  }
});

// ============= 会话 API =============

// 获取所有会话（包含消息数量）
app.get("/api/sessions", (req, res) => {
  try {
    const sessions = db.getAllSessions();
    const sessionsWithMessages = sessions.map((session) => {
      const messages = db.getMessagesBySession(session.id);
      return { ...session, messageCount: messages.length };
    });
    res.json({ sessions: sessionsWithMessages });
  } catch (error: any) {
    console.error("[Sessions] Error:", error);
    res.status(500).json({ error: error?.message || "获取会话失败" });
  }
});

// 获取单个会话及其消息
app.get("/api/sessions/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = db.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "会话不存在" });
    }

    const messages = db.getMessagesBySession(sessionId);
    const parsedMessages = messages.map((msg) => ({
      ...msg,
      tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls) : null,
    }));

    res.json({ session, messages: parsedMessages });
  } catch (error: any) {
    console.error("[Session] Error:", error);
    res.status(500).json({ error: error?.message || "获取会话失败" });
  }
});

// 创建新会话
app.post("/api/sessions", (req, res) => {
  try {
    const { model = defaultModel, title = "新对话" } = req.body;
    const now = new Date().toISOString();

    const session = db.createSession({
      id: uuidv4(),
      title,
      model,
      created_at: now,
      updated_at: now,
    });

    res.json({ session });
  } catch (error: any) {
    console.error("[Create Session] Error:", error);
    res.status(500).json({ error: error?.message || "创建会话失败" });
  }
});

// 更新会话
app.patch("/api/sessions/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, model } = req.body;

    const success = db.updateSession(sessionId, { title, model });

    if (!success) {
      return res.status(404).json({ error: "会话不存在" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Update Session] Error:", error);
    res.status(500).json({ error: error?.message || "更新会话失败" });
  }
});

// 删除会话
app.delete("/api/sessions/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const success = db.deleteSession(sessionId);

    if (!success) {
      return res.status(404).json({ error: "会话不存在" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Session] Error:", error);
    res.status(500).json({ error: error?.message || "删除会话失败" });
  }
});

// ============= 聊天 API（Agnes 流式） =============

// 发送消息并获取流式响应（SSE）
app.post("/api/chat", async (req, res) => {
  const { sessionId, message, model, systemPrompt, cast, resume } = req.body;
  // resume=true：续答一条「未完成」记录（起卦中断、助手解读未落库）。
  // 此时不再新存用户消息，而是复用会话里已有的最后一条用户消息，仅补生成助手回答，避免重复。
  const isResume = resume === true;

  // 续答模式下，从会话 meta 还原完整起卦请求（首次起卦时已持久化），复现卦象，无需前端重传
  let castReq: CastRequest | null =
    cast && typeof cast === "object" && (cast as CastRequest).method ? (cast as CastRequest) : null;
  if (isResume && sessionId) {
    const sess = db.getSession(sessionId);
    const meta = sess?.meta ? safeJsonParse(sess.meta) : null;
    if (meta?.cast && typeof meta.cast === "object" && (meta.cast as CastRequest).method) {
      castReq = meta.cast as CastRequest;
    }
  }

  console.log(`\n[Chat] ========== 新请求 ==========`);
  console.log(`[Chat] SessionId: ${sessionId}`);
  console.log(`[Chat] Model: ${model}`);
  console.log(`[Chat] Message: ${message?.slice(0, 100)}${message?.length > 100 ? "..." : ""}`);
  console.log(`[Chat] Cast: ${castReq ? JSON.stringify(castReq) : "无"}${isResume ? " (resume)" : ""}`);

  // 若带起卦参数，则先由服务端算出卦象（结构化数据 + 注入解读提示）
  let castResult: ReturnType<typeof castDivination> | null = null;
  let augmentedSystemPrompt = systemPrompt;
  if (castReq && castReq.method) {
    try {
      castResult = castDivination(castReq);
      console.log(`[Chat] 起卦成功：${castResult.benGua.name}${castResult.zhiGua ? " 之 " + castResult.zhiGua.name : ""}`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + hexagramToPrompt(castResult);
      }
    } catch (castErr: any) {
      console.error(`[Chat] 起卦失败:`, castErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "起卦失败：" + (castErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  if (!message) {
    return res.status(400).json({ error: "消息不能为空" });
  }

  const apiKey = AGNES_API_KEY();
  if (!apiKey) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(
      `data: ${JSON.stringify({ type: "error", message: "未配置 AGNES_API_KEY，请在 .env 或设置页配置后重试" })}\n\n`
    );
    return res.end();
  }

  // 获取或创建会话
  let session = sessionId ? db.getSession(sessionId) : null;
  const now = new Date().toISOString();

  if (!session) {
    session = db.createSession({
      id: sessionId || uuidv4(),
      title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
      model: model || defaultModel,
      sdk_session_id: null,
      created_at: now,
      updated_at: now,
    });
  }

  const selectedModel = model || session.model || defaultModel;

  // 续答幂等兜底 + 并发防重：
  // ① 会话已完成（已有完整 assistant 解读）→ 跳过生成；
  // ② 该会话正在被其它请求生成中（内存锁）→ 同样跳过，
  //    避免并发 resume 各生成一条、或「返回上一卦」与正在进行的流重复生成 → 多个回答
  const alreadyComplete = isResume && !db.isSessionIncomplete(session.id);
  const alreadyGenerating = isResume && generating.has(session.id);
  if (alreadyComplete || alreadyGenerating) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(
      `data: ${JSON.stringify({
        type: "init",
        sessionId: session.id,
        userMessageId: "",
        assistantMessageId: "",
        model: selectedModel,
      })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    return res.end();
  }
  if (isResume) generating.add(session.id);

  const userMessageId = uuidv4();
  const assistantMessageId = uuidv4();

  // 保存用户消息（续答模式下复用已有用户消息，不重复保存）
  if (!isResume) {
    try {
      db.createMessage({
        id: userMessageId,
        session_id: session.id,
        role: "user",
        content: message,
        model: null,
        created_at: now,
        tool_calls: null,
      });
    } catch (dbError: any) {
      console.error(`[Chat] 保存用户消息失败:`, dbError);
      return res.status(500).json({ error: "保存消息失败", detail: dbError?.message });
    }
  }

  // 设置 SSE 头
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 组装对话历史（排除刚保存的这条用户消息，避免重复）
  const history = db.getMessagesBySession(session.id).filter((m) => m.id !== userMessageId);
  const messages: Array<{ role: string; content: string }> = [];
  if (augmentedSystemPrompt) {
    messages.push({ role: "system", content: augmentedSystemPrompt });
  }
  for (const m of history) {
    if (m.content) messages.push({ role: m.role, content: m.content });
  }
  // 续答模式：会话里已有该用户消息，不再重复追加，避免发给模型时重复
  if (!isResume) {
    messages.push({ role: "user", content: message });
  }

  // 发送 init 事件
  res.write(
    `data: ${JSON.stringify({
      type: "init",
      sessionId: session.id,
      userMessageId,
      assistantMessageId,
      model: selectedModel,
    })}\n\n`
  );

  // 若有起卦结果，先推送结构化卦象事件（前端可视化用）
  if (castResult) {
    res.write(
      `data: ${JSON.stringify({
        type: "hexagram",
        data: castResult,
      })}\n\n`
    );
    // 记录起卦信息到会话 meta（用于首页"最近使用"展示 + 续答时复现卦象）
    try {
      db.setSessionMeta(session.id, {
        hexName: castResult.benGua.name,
        hexSeq: castResult.benGua.seq,
        method: castResult.najia ? 'najia' : castResult.method,
        // 持久化完整起卦请求，便于「续答」时无需前端重传即可复现同一卦象
        cast: castReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 session meta 失败:', metaErr);
    }
  }

  try {
    console.log(`[Chat] 调用 Agnes chat/completions，模型: ${selectedModel}`);
    const resp = await fetch(`${AGNES_BASE_URL()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
        temperature: 0.85,
      }),
    });

    if (!resp.ok || !resp.body) {
      const txt = await resp.text();
      throw new Error(`Agnes 返回 ${resp.status}: ${txt.slice(0, 500)}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") continue;
        try {
          const json = JSON.parse(dataStr);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            res.write(`data: ${JSON.stringify({ type: "text", content: delta })}\n\n`);
          }
        } catch {
          // 忽略无法解析的片段
        }
      }
    }

    // 保存助手消息
    db.createMessage({
      id: assistantMessageId,
      session_id: session.id,
      role: "assistant",
      content: fullResponse,
      model: selectedModel,
      created_at: new Date().toISOString(),
      tool_calls: null,
    });

    // 第一条消息时更新会话标题
    const allMsgs = db.getMessagesBySession(session.id);
    if (allMsgs.length <= 2) {
      db.updateSession(session.id, {
        title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
        model: selectedModel,
      });
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    if (isResume) generating.delete(session.id);
    res.end();
    console.log(`[Chat] 请求完成 ✓ (共 ${fullResponse.length} 字)`);
  } catch (error: any) {
    console.error(`[Chat] 错误:`, error?.message);
    res.write(`data: ${JSON.stringify({ type: "error", message: error?.message || "处理请求时发生错误" })}\n\n`);
    if (isResume) generating.delete(session.id);
    res.end();
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║     ◉ 周易算 · Agnes AI 服务已启动          ║
║                                            ║
║     地址: http://localhost:${PORT}            ║
║     后端: Agnes AI (OpenAI 兼容)           ║
║     数据库: SQLite (data/chat.db)          ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});
