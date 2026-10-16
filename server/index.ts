import 'dotenv/config';
import express from "express";
import { v4 as uuidv4 } from "uuid";
import * as db from "./db.js";
import { castDivination, hexagramToPrompt, getDailyData, type CastRequest } from "./divination.js";
import { castBazi, baziToPrompt, type BaziInput } from "./bazi.js";
import { castZiwei, ziweiToPrompt, type ZiweiInput } from "./ziwei.js";
import { castTarot, tarotToPrompt, type TarotInput, type TarotSpread } from "./tarot.js";
import { MBTI_QUESTIONS, scoreMbti } from "./mbti.js";
import { castQimen, qimenToPrompt, type QimenInput } from "./qimen.js";
import { castDaliuren, daliurenToPrompt, type DaliurenInput } from "./daliuren.js";
import { castDream, dreamToPrompt, DREAM_SYMBOL_COUNT, type DreamResult } from "./dream.js";
import { castHepan, hepanToPrompt, type HepanPerson } from "./hepan.js";
import { FACE_INTERPRETATION, PALM_INTERPRETATION } from "./interpretation.js";

const app = express();
const PORT = process.env.PORT || 3000;

// 续答「正在生成」内存锁：防止同一会话的并发 resume 各自调用模型并落库，
// 导致一条未完成记录出现多个回答（前端已做锁 + 拦截，这里是后端兜底）
const generating = new Set<string>();

// Middleware
app.use(express.json({ limit: "10mb" }));

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

// Agnes 模型回复开头的自我介绍（需剥除，避免每条回答都顶着「我是…」）。
// 用正则而非固定候选列表 —— 换模型后文案会变，且同一模型也可能变体：
//   2.0-flash：「你好。我是 Agnes-2.0-Flash，由 Sapiens AI 开发。」
//   3.0-flash：「你好，我是Agnes-3.0-flash。」／「我是 Agnes-3.0-flash。以下是…」
// 注意「你好/您好」前缀必须可选 —— 3.0-flash 常直接以「我是 Agnes-…」开头。
// 终止符**只能是全角句号**（。．）：模型名形如「Agnes-3.0-flash」，其中含半角句点，
// 若把 `.` 也算终止符，非贪婪匹配会在「-3.」处停下，残留「0-flash。」（真实踩过）。
// 同时要求出现「Agnes」字样，不会误伤「我是命理师…」这类正文。
const AGNES_INTRO_RE = /^(?:你好|您好)?[，,。.\s]*我是\s*Agnes[^\n。．]{0,48}[。．]\s*/;
// 缓冲上限：超过此长度仍未匹配到开场白，即判定本条回答无开场白，整体放行
// （取 100 是为了让「我是 Agnes-3.0-flash。以下是…」这类较长的自我介绍能等到句号）
const AGNES_INTRO_MAXLEN = 100;

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
  // 可选管理令牌：若设置了 APP_ADMIN_TOKEN，则要求请求头 x-admin-token 与之匹配，
  // 否则任何人（含公网访客）都能在运行时覆盖你的 API Key。
  const guard = process.env.APP_ADMIN_TOKEN;
  if (guard && req.headers["x-admin-token"] !== guard) {
    return res.status(403).json({ error: "需要管理令牌（APP_ADMIN_TOKEN）才能修改运行配置" });
  }

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

// ============= 八字排盘 =============

// 八字排盘：四柱 / 十神 / 藏干 / 纳音 / 五行统计 / 神煞 / 大运流年
app.post('/api/bazi', (req, res) => {
  try {
    const { name, gender, year, month, day, hour, minute } = req.body || {};
    if (gender !== 'male' && gender !== 'female') {
      return res.status(400).json({ error: '请指定性别（male / female）' });
    }
    const y = Number(year);
    const mo = Number(month);
    const d = Number(day);
    const h = Number(hour);
    if (!y || !mo || !d || Number.isNaN(h)) {
      return res.status(400).json({ error: '请提供完整的出生年、月、日、时' });
    }
    if (y < 1900 || y > 2100) {
      return res.status(400).json({ error: '年份需在 1900–2100 之间' });
    }
    const chart = castBazi({
      name: name ? String(name) : undefined,
      gender,
      year: y,
      month: mo,
      day: d,
      hour: h,
      minute: Number(minute) || 0,
    });
    res.json({ chart });
  } catch (error: any) {
    console.error('[Bazi] Error:', error);
    res.status(500).json({ error: error?.message || '八字排盘失败' });
  }
});

// ============= 紫微斗数排盘 =============

// 紫微斗数排盘：十二宫 / 主星辅星 / 四化 / 大限 / 命主身主 / 五行局
app.post('/api/ziwei', (req, res) => {
  try {
    const { name, gender, year, month, day, hour, minute } = req.body || {};
    if (gender !== 'male' && gender !== 'female') {
      return res.status(400).json({ error: '请指定性别（male / female）' });
    }
    const y = Number(year);
    const mo = Number(month);
    const d = Number(day);
    const h = Number(hour);
    if (!y || !mo || !d || Number.isNaN(h)) {
      return res.status(400).json({ error: '请提供完整的出生年、月、日、时' });
    }
    if (y < 1900 || y > 2100) {
      return res.status(400).json({ error: '年份需在 1900–2100 之间' });
    }
    const chart = castZiwei({
      name: name ? String(name) : undefined,
      gender,
      year: y,
      month: mo,
      day: d,
      hour: h,
      minute: Number(minute) || 0,
    });
    res.json({ chart });
  } catch (error: any) {
    console.error('[Ziwei] Error:', error);
    res.status(500).json({ error: error?.message || '紫微斗数排盘失败' });
  }
});

// ============= 塔罗占卜 =============

const TAROT_SPREADS: TarotSpread[] = ['single', 'three-time', 'celtic', 'love', 'yesno'];

// 塔罗抽牌（牌阵 + 正逆位）
app.post('/api/tarot', (req, res) => {
  try {
    const { spread, question, seed } = req.body || {};
    if (!TAROT_SPREADS.includes(spread)) {
      return res.status(400).json({ error: `牌阵需为：${TAROT_SPREADS.join(' / ')}` });
    }
    const result = castTarot({
      spread,
      question: question ? String(question) : undefined,
      seed: seed ? String(seed) : undefined,
    });
    res.json({ result });
  } catch (error: any) {
    console.error('[Tarot] Error:', error);
    res.status(500).json({ error: error?.message || '塔罗抽牌失败' });
  }
});

// ============= MBTI 性格测评 =============

// 提交答案（与题库对齐的数组，0=选 a / 1=选 b / null=未答），返回型与各维得分
app.post('/api/mbti', (req, res) => {
  try {
    const { answers } = req.body || {};
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: '请提交答案数组' });
    }
    if (answers.length !== MBTI_QUESTIONS.length) {
      return res.status(400).json({ error: `答案数量应为 ${MBTI_QUESTIONS.length}` });
    }
    const result = scoreMbti({ answers });
    res.json({ result });
  } catch (error: any) {
    console.error('[MBTI] Error:', error);
    res.status(500).json({ error: error?.message || 'MBTI 测评失败' });
  }
});

// 题库（前端问卷用）
app.get('/api/mbti/questions', (req, res) => {
  res.json({ questions: MBTI_QUESTIONS });
});

// ============= 奇门遁甲排盘 =============

// 奇门遁甲排盘：按指定时刻定局（拆补法）并排出九宫五层盘
app.post('/api/qimen', (req, res) => {
  try {
    const { year, month, day, hour, minute } = req.body || {};
    const y = Number(year);
    const mo = Number(month);
    const d = Number(day);
    const h = Number(hour);
    if (!y || !mo || !d || Number.isNaN(h)) {
      return res.status(400).json({ error: '请提供完整的年、月、日、时' });
    }
    if (y < 1900 || y > 2100) {
      return res.status(400).json({ error: '年份需在 1900–2100 之间' });
    }
    const chart = castQimen({ year: y, month: mo, day: d, hour: h, minute: Number(minute) || 0 });
    res.json({ chart });
  } catch (error: any) {
    console.error('[Qimen] Error:', error);
    res.status(500).json({ error: error?.message || '奇门遁甲排盘失败' });
  }
});

// ============= 大六壬起课 ============

app.post("/api/daliuren", (req, res) => {
  try {
    const input: DaliurenInput = {
      year: Number(req.body.year),
      month: Number(req.body.month),
      day: Number(req.body.day),
      hour: Number(req.body.hour),
      minute: Number(req.body.minute) || 0,
    };
    const chart = castDaliuren(input);
    res.json({ chart });
  } catch (error: any) {
    console.error("[Daliuren] Error:", error);
    res.status(500).json({ error: error?.message || "大六壬起课失败" });
  }
});

// ============= 周公解梦 ============

app.post("/api/dream", (req, res) => {
  try {
    const dreamText = String(req.body.dreamText ?? req.body.dream ?? "");
    if (!dreamText.trim()) {
      return res.status(400).json({ error: "请描述你的梦境" });
    }
    const result = castDream({ dreamText });
    res.json({ result, symbolCount: DREAM_SYMBOL_COUNT });
  } catch (error: any) {
    console.error("[Dream] Error:", error);
    res.status(500).json({ error: error?.message || "解梦失败" });
  }
});

// ============= 合盘（合婚） ============

app.post("/api/hepan", (req, res) => {
  try {
    const { personA, personB } = req.body ?? {};
    const norm = (p: any): HepanPerson | null => {
      if (!p || typeof p !== "object") return null;
      const year = Number(p.year);
      if (!year) return null;
      return {
        name: p.name ? String(p.name) : undefined,
        gender: p.gender === 'female' ? 'female' : 'male',
        year,
        month: Number(p.month) || 1,
        day: Number(p.day) || 1,
        hour: Number(p.hour) || 0,
        minute: Number(p.minute) || 0,
      };
    };
    const a = norm(personA);
    const b = norm(personB);
    if (!a || !b) {
      return res.status(400).json({ error: "请完整填写双方的出生信息" });
    }
    const result = castHepan(a, b);
    res.json({ result });
  } catch (error: any) {
    console.error("[Hepan] Error:", error);
    res.status(500).json({ error: error?.message || "合盘失败" });
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
      sdk_session_id: null,
      meta: null,
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

// 清空所有数据（可选管理令牌保护）
app.post("/api/clear-all", (req, res) => {
  const guard = process.env.APP_ADMIN_TOKEN;
  if (guard && req.headers["x-admin-token"] !== guard) {
    return res.status(403).json({ error: "需要管理令牌（APP_ADMIN_TOKEN）才能清空数据" });
  }
  try {
    db.clearAllData();
    res.json({ success: true, message: "已清空全部数据" });
  } catch (error: any) {
    console.error("[Clear All] Error:", error);
    res.status(500).json({ error: error?.message || "清空数据失败" });
  }
});

// ============= 聊天 API（Agnes 流式） =============

// 发送消息并获取流式响应（SSE）
app.post("/api/chat", async (req, res) => {
  let { sessionId, message, model, systemPrompt, cast, resume, bazi, ziwei, tarot, qimen, daliuren, dream, hepan, face, palm } = req.body;
  // resume=true：续答一条「未完成」记录（起卦中断、助手解读未落库）。
  // 此时不再新存用户消息，而是复用会话里已有的最后一条用户消息，仅补生成助手回答，避免重复。
  const isResume = resume === true;

  // 续答模式下，从会话 meta 还原完整起卦请求（首次起卦时已持久化），复现卦象，无需前端重传
  let castReq: CastRequest | null =
    cast && typeof cast === "object" && (cast as CastRequest).method ? (cast as CastRequest) : null;
  // 八字排盘请求（与起卦平行的一种命理输入）
  let baziReq: BaziInput | null =
    bazi && typeof bazi === "object" && (bazi as BaziInput).year ? (bazi as BaziInput) : null;
  // 紫微斗数排盘请求
  let ziweiReq: ZiweiInput | null =
    ziwei && typeof ziwei === "object" && (ziwei as ZiweiInput).year ? (ziwei as ZiweiInput) : null;
  // 塔罗抽牌请求
  let tarotReq: TarotInput | null =
    tarot && typeof tarot === "object" && TAROT_SPREADS.includes((tarot as TarotInput).spread)
      ? (tarot as TarotInput)
      : null;
  // 奇门遁甲排盘请求
  let qimenReq: QimenInput | null =
    qimen && typeof qimen === "object" && (qimen as QimenInput).year ? (qimen as QimenInput) : null;
  let daliurenReq: DaliurenInput | null =
    daliuren && typeof daliuren === "object" && (daliuren as DaliurenInput).year
      ? (daliuren as DaliurenInput)
      : null;
  // 解梦请求（输入为梦境描述文本）
  let dreamReq: { dreamText: string } | null =
    dream && typeof dream === "object" && typeof (dream as { dreamText?: unknown }).dreamText === "string"
      ? { dreamText: (dream as { dreamText: string }).dreamText }
      : null;
  // 合盘请求（双方出生信息）
  const normHepanPerson = (p: any): HepanPerson | null => {
    if (!p || typeof p !== "object") return null;
    const year = Number(p.year);
    if (!year) return null;
    return {
      name: p.name ? String(p.name) : undefined,
      gender: p.gender === 'female' ? 'female' : 'male',
      year,
      month: Number(p.month) || 1,
      day: Number(p.day) || 1,
      hour: Number(p.hour) || 0,
      minute: Number(p.minute) || 0,
    };
  };
  let hepanReq: { personA: HepanPerson; personB: HepanPerson } | null = null;
  if (hepan && typeof hepan === "object") {
    const a = normHepanPerson((hepan as any).personA);
    const b = normHepanPerson((hepan as any).personB);
    if (a && b) hepanReq = { personA: a, personB: b };
  }

  // 面相 / 手相：图片直传模型（后端不做图像计算），仅校验与规范化
  // base64 体积上限：约 8MB 字符（对应原图 ~6MB），超出直接拒绝，避免拖垮请求
  const MAX_IMAGE_B64 = 8 * 1024 * 1024;
  const normImageReq = (v: any): { imageBase64: string; mimeType: string; note: string } | null => {
    if (!v || typeof v !== "object") return null;
    let b64 = typeof v.imageBase64 === "string" ? v.imageBase64 : "";
    if (!b64) return null;
    // 容错：前端若误传完整 data URL，剥掉前缀
    const comma = b64.indexOf(",");
    if (b64.startsWith("data:") && comma > 0) b64 = b64.slice(comma + 1);
    if (!b64 || b64.length > MAX_IMAGE_B64) return null;
    const mt = typeof v.mimeType === "string" && /^image\/(jpeg|jpg|png|webp)$/i.test(v.mimeType)
      ? v.mimeType.toLowerCase().replace("jpg", "jpeg")
      : "image/jpeg";
    const note = typeof v.note === "string" ? v.note.trim().slice(0, 200) : "";
    return { imageBase64: b64, mimeType: mt, note };
  };
  const faceReq = normImageReq(face);
  const palmReq = normImageReq(palm);
  // 一次请求只处理一种（面相优先）
  const imagePayload = faceReq ?? palmReq;
  // 用户的补充说明并入提问（会一并存库，保证历史记录完整）
  if (imagePayload?.note) {
    message = message ? `${message}\n\n（补充说明：${imagePayload.note}）` : `（补充说明：${imagePayload.note}）`;
  }
  if (isResume && sessionId) {
    const sess = db.getSession(sessionId);
    const meta = sess?.meta ? safeJsonParse(sess.meta) : null;
    if (meta?.cast && typeof meta.cast === "object" && (meta.cast as CastRequest).method) {
      castReq = meta.cast as CastRequest;
    }
    if (meta?.bazi && typeof meta.bazi === "object" && (meta.bazi as BaziInput).year) {
      baziReq = meta.bazi as BaziInput;
    }
    if (meta?.ziwei && typeof meta.ziwei === "object" && (meta.ziwei as ZiweiInput).year) {
      ziweiReq = meta.ziwei as ZiweiInput;
    }
    if (meta?.tarot && typeof meta.tarot === "object" && (meta.tarot as TarotInput).spread) {
      tarotReq = meta.tarot as TarotInput;
    }
    if (meta?.qimen && typeof meta.qimen === "object" && (meta.qimen as QimenInput).year) {
      qimenReq = meta.qimen as QimenInput;
    }
    if (meta?.daliuren && typeof meta.daliuren === "object" && (meta.daliuren as DaliurenInput).year) {
      daliurenReq = meta.daliuren as DaliurenInput;
    }
    if (meta?.dream && typeof meta.dream === "object" && typeof (meta.dream as { dreamText?: unknown }).dreamText === "string") {
      dreamReq = { dreamText: (meta.dream as { dreamText: string }).dreamText };
    }
    if (meta?.hepan && typeof meta.hepan === "object") {
      const a = normHepanPerson((meta.hepan as any).personA);
      const b = normHepanPerson((meta.hepan as any).personB);
      if (a && b) hepanReq = { personA: a, personB: b };
    }
  }

  console.log(`\n[Chat] ========== 新请求 ==========`);
  console.log(`[Chat] SessionId: ${sessionId}`);
  console.log(`[Chat] Model: ${model}`);
  console.log(`[Chat] Message: ${message?.slice(0, 100)}${message?.length > 100 ? "..." : ""}`);
  console.log(`[Chat] Cast: ${castReq ? JSON.stringify(castReq) : "无"}${isResume ? " (resume)" : ""}`);

  // 若带起卦参数，则先由服务端算出卦象（结构化数据 + 注入解读提示）
  let castResult: ReturnType<typeof castDivination> | null = null;
  let baziChart: ReturnType<typeof castBazi> | null = null;
  let ziweiChart: ReturnType<typeof castZiwei> | null = null;
  let tarotResult: ReturnType<typeof castTarot> | null = null;
  let qimenChart: ReturnType<typeof castQimen> | null = null;
  let daliurenChart: ReturnType<typeof castDaliuren> | null = null;
  let dreamResult: DreamResult | null = null;
  let hepanResult: ReturnType<typeof castHepan> | null = null;
  let augmentedSystemPrompt = systemPrompt;
  // 面相 / 手相：不做计算，直接注入「相术方法论」+ 观察清单，图片由多模态消息承载
  if (imagePayload && systemPrompt) {
    const isFace = !!faceReq;
    const method = isFace ? FACE_INTERPRETATION : PALM_INTERPRETATION;
    const checklist = isFace
      ? '【观察要求】请先逐项描述你在图中实际看到的：脸型轮廓、上/中/下三停比例、额、眉、眼（含神态）、鼻、颧、口唇、下巴、气色。\n若某项因角度、光线或清晰度看不清，请如实说明，不要凭空推断。描述之后再据此论断。\n'
      : '【观察要求】请先逐项描述你在图中实际看到的：哪只手、掌形（长/方/圆）、掌丘饱满度、生命线/智慧线/感情线的起止与走向、其他可见纹路。\n若照片模糊、反光或角度不佳导致某条纹看不清，请如实说明，不要凭空推断。描述之后再据此论断。\n';
    augmentedSystemPrompt = systemPrompt + '\n\n' + checklist + '\n' + method;
    console.log(`[Chat] ${isFace ? '面相' : '手相'}图片已就绪（${Math.round(imagePayload.imageBase64.length / 1024)} KB base64）`);
  }
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

  // 若带八字参数，则先由服务端排盘（结构化命盘 + 注入解读提示）
  if (baziReq && baziReq.year) {
    try {
      baziChart = castBazi(baziReq);
      console.log(`[Chat] 八字排盘成功：${baziChart.pillars.map((p) => p.ganZhi).join(" ")}（日主 ${baziChart.dayMaster}）`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + baziToPrompt(baziChart);
      }
    } catch (baziErr: any) {
      console.error(`[Chat] 八字排盘失败:`, baziErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "八字排盘失败：" + (baziErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  // 若带紫微斗数参数，则先由服务端排盘
  if (ziweiReq && ziweiReq.year) {
    try {
      ziweiChart = castZiwei(ziweiReq);
      const ming = ziweiChart.palaces.find((p) => p.name === '命宫');
      console.log(`[Chat] 紫微排盘成功：命宫 ${ming?.ganZhi ?? '?'}（${ziweiChart.fiveElementsClass}）`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + ziweiToPrompt(ziweiChart);
      }
    } catch (ziweiErr: any) {
      console.error(`[Chat] 紫微排盘失败:`, ziweiErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "紫微排盘失败：" + (ziweiErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  // 若带塔罗参数，则先由服务端抽牌
  if (tarotReq && tarotReq.spread) {
    try {
      tarotResult = castTarot(tarotReq);
      console.log(`[Chat] 塔罗抽牌成功：${tarotResult.spreadName}，共 ${tarotResult.cards.length} 张`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + tarotToPrompt(tarotResult);
      }
    } catch (tarotErr: any) {
      console.error(`[Chat] 塔罗抽牌失败:`, tarotErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "塔罗抽牌失败：" + (tarotErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  // 若带奇门遁甲参数，则先由服务端排盘
  if (qimenReq && qimenReq.year) {
    try {
      qimenChart = castQimen(qimenReq);
      console.log(`[Chat] 奇门排盘成功：${qimenChart.yinYang}遁${qimenChart.juShu}局（${qimenChart.jieQiName}）`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + qimenToPrompt(qimenChart);
      }
    } catch (qimenErr: any) {
      console.error(`[Chat] 奇门排盘失败:`, qimenErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "奇门排盘失败：" + (qimenErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  if (daliurenReq && (daliurenReq.year || daliurenReq.timestamp)) {
    try {
      daliurenChart = castDaliuren(daliurenReq);
      console.log(`[Chat] 大六壬起课成功：${daliurenChart.dateInfo.date}，课体 ${daliurenChart.sanChuan.keTi}`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + daliurenToPrompt(daliurenChart);
      }
    } catch (daliurenErr: any) {
      console.error(`[Chat] 大六壬起课失败:`, daliurenErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "大六壬起课失败：" + (daliurenErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  if (dreamReq && dreamReq.dreamText.trim()) {
    try {
      dreamResult = castDream(dreamReq);
      console.log(`[Chat] 解梦检索成功：命中意象 ${dreamResult.hits.length} 个`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + dreamToPrompt(dreamResult);
      }
    } catch (dreamErr: any) {
      console.error(`[Chat] 解梦失败:`, dreamErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "解梦失败：" + (dreamErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  if (hepanReq) {
    try {
      hepanResult = castHepan(hepanReq.personA, hepanReq.personB);
      console.log(`[Chat] 合盘成功：${hepanResult.totalScore} 分（${hepanResult.grade}）`);
      if (systemPrompt) {
        augmentedSystemPrompt = systemPrompt + "\n\n" + hepanToPrompt(hepanResult);
      }
    } catch (hepanErr: any) {
      console.error(`[Chat] 合盘失败:`, hepanErr);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "error", message: "合盘失败：" + (hepanErr?.message || "未知错误") })}\n\n`);
      return res.end();
    }
  }

  if (!message && !imagePayload) {
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
      model: model || process.env.AGNES_MODEL || defaultModel,
      sdk_session_id: null,
      meta: null,
      created_at: now,
      updated_at: now,
    });
  }

  // 模型回退链：请求指定 → 会话既有 → .env 配置 → /api/models 拉取的默认
  // 加 .env 一层是因为 defaultModel 只在 /api/models 被调用后才填充，
  // 若前端未先拉模型列表（或拉取失败），这里不能为空
  const selectedModel = model || session.model || process.env.AGNES_MODEL || defaultModel;

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
  // content 可为字符串（纯文本）或内容块数组（多模态：面相/手相带图）
  type MsgContent = string | Array<Record<string, unknown>>;
  const messages: Array<{ role: string; content: MsgContent }> = [];
  if (augmentedSystemPrompt) {
    messages.push({ role: "system", content: augmentedSystemPrompt });
  }
  for (const m of history) {
    if (m.content) messages.push({ role: m.role, content: m.content });
  }
  // 续答模式：会话里已有该用户消息，不再重复追加，避免发给模型时重复
  if (!isResume) {
    if (imagePayload) {
      // 面相/手相：把图片作为多模态内容块，与文字一同发出
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message },
          {
            type: "image_url",
            image_url: { url: `data:${imagePayload.mimeType};base64,${imagePayload.imageBase64}` },
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: message });
    }
  } else if (imagePayload) {
    // 续答时图片不随历史持久化，此处仅提示模型（避免它以为有图却看不到）
    messages.push({
      role: "user",
      content: `${message}\n\n（说明：本次为续答，原图未随会话保存，请依据上文已有的描述继续，或提示用户重新上传照片。）`,
    });
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

  // 若有八字排盘结果，推送命盘事件（前端可视化用）
  if (baziChart) {
    res.write(`data: ${JSON.stringify({ type: "bazi", data: baziChart })}\n\n`);
    try {
      db.setSessionMeta(session.id, {
        type: 'bazi',
        method: 'bazi',
        hexName: `八字 ${baziChart.pillars.map((p) => p.ganZhi).join(' ')}`,
        // 持久化排盘请求，供「续答」时复现命盘
        bazi: baziReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 bazi meta 失败:', metaErr);
    }
  }

  // 若有紫微排盘结果，推送星盘事件（前端可视化用）
  if (ziweiChart) {
    res.write(`data: ${JSON.stringify({ type: "ziwei", data: ziweiChart })}\n\n`);
    try {
      const ming = ziweiChart.palaces.find((p) => p.name === '命宫');
      db.setSessionMeta(session.id, {
        type: 'ziwei',
        method: 'ziwei',
        hexName: `紫微 ${ziweiChart.fiveElementsClass} 命宫${ming?.ganZhi ?? ''}`,
        // 持久化排盘请求，供「续答」时复现星盘
        ziwei: ziweiReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 ziwei meta 失败:', metaErr);
    }
  }

  // 若有塔罗抽牌结果，推送牌面事件（前端可视化用）
  if (tarotResult) {
    res.write(`data: ${JSON.stringify({ type: "tarot", data: tarotResult })}\n\n`);
    try {
      db.setSessionMeta(session.id, {
        type: 'tarot',
        method: 'tarot',
        hexName: `塔罗 · ${tarotResult.spreadName}`,
        // 持久化抽牌请求，供「续答」时复现同一牌面
        tarot: tarotReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 tarot meta 失败:', metaErr);
    }
  }

  // 若有奇门排盘结果，推送九宫盘局事件（前端可视化用）
  if (qimenChart) {
    res.write(`data: ${JSON.stringify({ type: "qimen", data: qimenChart })}\n\n`);
    try {
      db.setSessionMeta(session.id, {
        type: 'qimen',
        method: 'qimen',
        hexName: `奇门 ${qimenChart.yinYang}遁${qimenChart.juShu}局`,
        qimen: qimenReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 qimen meta 失败:', metaErr);
    }
  }

  // 若有大六壬课盘，推送课盘事件（前端可视化用）
  if (daliurenChart) {
    res.write(`data: ${JSON.stringify({ type: "daliuren", data: daliurenChart })}\n\n`);
    try {
      db.setSessionMeta(session.id, {
        type: 'daliuren',
        method: 'daliuren',
        hexName: `大六壬 ${daliurenChart.sanChuan.keTi}课`,
        daliuren: daliurenReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 daliuren meta 失败:', metaErr);
    }
  }

  // 若有解梦结果，推送命中意象事件（前端可视化用）
  if (dreamResult) {
    res.write(`data: ${JSON.stringify({ type: "dream", data: dreamResult })}\n\n`);
    try {
      db.setSessionMeta(session.id, {
        type: 'dream',
        method: 'dream',
        hexName: `解梦 · 命中 ${dreamResult.hits.length} 象`,
        dream: dreamReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 dream meta 失败:', metaErr);
    }
  }

  // 若有合盘结果，推送比对事件（前端可视化用）
  if (hepanResult) {
    res.write(`data: ${JSON.stringify({ type: "hepan", data: hepanResult })}\n\n`);
    try {
      db.setSessionMeta(session.id, {
        type: 'hepan',
        method: 'hepan',
        hexName: `合盘 ${hepanResult.totalScore}分（${hepanResult.grade}）`,
        hepan: hepanReq,
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 hepan meta 失败:', metaErr);
    }
  }

  // 若有面相/手相请求，写入 meta 标记（图片不持久化，仅记类型）
  if (imagePayload) {
    try {
      db.setSessionMeta(session.id, {
        type: faceReq ? 'face' : 'palm',
        method: faceReq ? 'face' : 'palm',
        hexName: faceReq ? '面相' : '手相',
      });
    } catch (metaErr) {
      console.error('[Chat] 写入 face/palm meta 失败:', metaErr);
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
    let fullResponse = "";        // 模型原始输出（含可能的开场白前缀）
    let cleanResponse = "";       // 已剥除开场白后的干净输出
    let introStripped = false;   // 是否已判定过开场白（前几段缓冲期内为 false）

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
            // 剥除 Agnes 模型自带的开场白前缀（仅在回答开头出现一次）
            if (!introStripped) {
              const m = fullResponse.match(AGNES_INTRO_RE);
              if (m) {
                const tail = fullResponse.slice(m[0].length);
                if (tail) {
                  cleanResponse += tail;
                  res.write(`data: ${JSON.stringify({ type: "text", content: tail })}\n\n`);
                }
                introStripped = true;
              } else if (fullResponse.length > AGNES_INTRO_MAXLEN) {
                // 已超过缓冲上限仍未匹配 → 本回答无开场白，整体放行
                const tail = fullResponse.slice(cleanResponse.length);
                if (tail) {
                  cleanResponse += tail;
                  res.write(`data: ${JSON.stringify({ type: "text", content: tail })}\n\n`);
                }
                introStripped = true;
              }
              // 否则继续累积，等待开场白完整到达
            } else {
              cleanResponse += delta;
              res.write(`data: ${JSON.stringify({ type: "text", content: delta })}\n\n`);
            }
          }
        } catch {
          // 忽略无法解析的片段
        }
      }
    }

    // 流结束：若仍有未 emit 的残留（如极短回答未达判定阈值），统一放行
    if (!introStripped) {
      const tail = fullResponse.slice(cleanResponse.length);
      if (tail) {
        cleanResponse += tail;
        res.write(`data: ${JSON.stringify({ type: "text", content: tail })}\n\n`);
      }
      introStripped = true;
    }

    // 保存助手消息
    db.createMessage({
      id: assistantMessageId,
      session_id: session.id,
      role: "assistant",
      content: cleanResponse,
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
    console.log(`[Chat] 请求完成 ✓ (共 ${cleanResponse.length} 字)`);
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
