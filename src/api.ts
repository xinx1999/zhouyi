// 周易算 · 前端 API 层（对接 Agnes 后端 SSE）
import type {
  CastResult,
  CastRequest,
  ChatMessage,
  ModelInfo,
  DailyData,
  HistoryItem,
  BaziChart,
  BaziInput,
  ZiweiChart,
  ZiweiInput,
  TarotResult,
  TarotInput,
  MbtiQuestion,
  MbtiResult,
  QimenChart,
  QimenInput,
  DaliurenChart,
  DaliurenInput,
  DreamResult,
  DreamInput,
  HepanResult,
  HepanInput,
  ImageInput,
} from './types';

export interface ChatEvents {
  onInit?: (d: any) => void;
  onHexagram?: (h: CastResult) => void;
  onBazi?: (c: BaziChart) => void;
  onZiwei?: (c: ZiweiChart) => void;
  onTarot?: (r: TarotResult) => void;
  onQimen?: (c: QimenChart) => void;
  onDaliuren?: (c: DaliurenChart) => void;
  onDream?: (r: DreamResult) => void;
  onHepan?: (r: HepanResult) => void;
  onText?: (t: string) => void;
  onDone?: () => void;
  onError?: (msg: string) => void;
}

export async function fetchModels(): Promise<{
  models: ModelInfo[];
  defaultModel: string;
}> {
  const resp = await fetch('/api/models');
  const data = await resp.json();
  return { models: data.models || [], defaultModel: data.defaultModel || '' };
}

export async function fetchLoginStatus(): Promise<any> {
  const resp = await fetch('/api/check-login');
  return resp.json();
}

export async function fetchDaily(): Promise<DailyData> {
  const resp = await fetch('/api/daily');
  const data = await resp.json();
  return data.daily as DailyData;
}

// 八字排盘（直接排盘，不走对话）
export async function fetchBazi(input: BaziInput): Promise<BaziChart> {
  const resp = await fetch('/api/bazi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || '八字排盘失败');
  return data.chart as BaziChart;
}

// 紫微斗数排盘（直接排盘，不走对话）
export async function fetchZiwei(input: ZiweiInput): Promise<ZiweiChart> {
  const resp = await fetch('/api/ziwei', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || '紫微斗数排盘失败');
  return data.chart as ZiweiChart;
}

// 塔罗抽牌（直接抽牌，不走对话）
export async function fetchTarot(input: TarotInput): Promise<TarotResult> {
  const resp = await fetch('/api/tarot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || '塔罗抽牌失败');
  return data.result as TarotResult;
}

// MBTI：拉题库
export async function fetchMbtiQuestions(): Promise<MbtiQuestion[]> {
  const resp = await fetch('/api/mbti/questions');
  const data = await resp.json();
  return data.questions as MbtiQuestion[];
}

// MBTI：提交答案，返回型与各维得分
export async function submitMbti(answers: (0 | 1 | null)[]): Promise<MbtiResult> {
  const resp = await fetch('/api/mbti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'MBTI 测评失败');
  return data.result as MbtiResult;
}

// 奇门遁甲排盘（直接排盘，不走对话）
export async function fetchQimen(input: QimenInput): Promise<QimenChart> {
  const resp = await fetch('/api/qimen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || '奇门遁甲排盘失败');
  return data.chart as QimenChart;
}

export async function fetchHistory(limit = 50): Promise<HistoryItem[]> {
  const resp = await fetch(`/api/history?limit=${limit}`);
  const data = await resp.json();
  return (data.history as HistoryItem[]) || [];
}

export async function deleteHistory(id: string): Promise<void> {
  const resp = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || '删除失败');
  }
}

// 记录一次求签（灵签）到「最近使用」，返回新建记录 id
export async function recordLingQian(sign: {
  num: number;
  name: string;
  level: string;
  source: string;
}): Promise<{ id: string }> {
  const resp = await fetch('/api/lingqian', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sign),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || '记录求签失败');
  return { id: data.id };
}

export async function loadSession(id: string): Promise<ChatMessage[]> {
  const resp = await fetch(`/api/sessions/${id}`);
  const data = await resp.json();
  const raw: any[] = data.messages || [];
  // 还原为前端消息（仅保留 role/content，忽略工具调用等）
  return raw
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content || '',
      hexagram: null,
      isStreaming: false,
    })) as ChatMessage[];
}

export async function clearAllHistory(adminToken?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminToken) headers['x-admin-token'] = adminToken;
  const resp = await fetch('/api/clear-all', { method: 'POST', headers });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || `HTTP ${resp.status}`);
  }
  return data;
}

export async function saveEnvConfig(cfg: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  adminToken?: string;
}): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.adminToken) headers['x-admin-token'] = cfg.adminToken;
  const resp = await fetch('/api/save-env-config', {
    method: 'POST',
    headers,
    body: JSON.stringify(cfg),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || `HTTP ${resp.status}`);
  }
  return data;
}

export async function sendChat(
  payload: {
    sessionId: string;
    message: string;
    model?: string;
    systemPrompt?: string;
    cast?: CastRequest;
    bazi?: BaziInput;
    ziwei?: ZiweiInput;
    tarot?: TarotInput;
    qimen?: QimenInput;
    daliuren?: DaliurenInput;
    dream?: DreamInput;
    hepan?: HepanInput;
    face?: ImageInput;
    palm?: ImageInput;
    resume?: boolean;
  },
  events: ChatEvents,
  signal?: AbortSignal
): Promise<void> {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!resp.ok) {
    let raw = '';
    try {
      raw = await resp.text();
    } catch {
      /* 读取失败则忽略 */
    }
    const snippet = raw.slice(0, 300).replace(/\s+/g, ' ');
    events.onError?.(`服务返回 ${resp.status}${snippet ? '，原文：' + snippet : '，无法连接后端'}`);
    return;
  }
  if (!resp.body) {
    events.onError?.('服务异常，响应体为空');
    return;
  }

  // 整个响应都不是 SSE（网关 / 地址错误常以 200 返回 JSON 错误或整页 HTML）
  // —— 这一步是兜底：否则每行解析失败被静默吞掉，最终只会表现成「模型没有返回内容」，误导排查。
  const contentType = resp.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    let raw = '';
    try {
      raw = await resp.text();
    } catch {
      /* 读取失败则忽略 */
    }
    const snippet = raw.slice(0, 300).replace(/\s+/g, ' ');
    events.onError?.(
      `上游返回非 SSE 响应（疑似地址或网关错误），内容类型：${contentType || '未知'}。原文前 300 字：${snippet || '（空）'}`,
    );
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let rawReceived = '';
  let gotEvent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const piece = decoder.decode(value, { stream: true });
      buf += piece;
      rawReceived += piece;

      const lines = buf.split('\n');
      buf = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;
        try {
          const json = JSON.parse(dataStr);
          gotEvent = true;
          switch (json.type) {
            case 'init':
              events.onInit?.(json);
              break;
            case 'hexagram':
              events.onHexagram?.(json.data as CastResult);
              break;
            case 'bazi':
              events.onBazi?.(json.data as BaziChart);
              break;
            case 'ziwei':
              events.onZiwei?.(json.data as ZiweiChart);
              break;
            case 'tarot':
              events.onTarot?.(json.data as TarotResult);
              break;
            case 'qimen':
              events.onQimen?.(json.data as QimenChart);
              break;
            case 'daliuren':
              events.onDaliuren?.(json.data as DaliurenChart);
              break;
            case 'dream':
              events.onDream?.(json.data as DreamResult);
              break;
            case 'hepan':
              events.onHepan?.(json.data as HepanResult);
              break;
            case 'text':
              events.onText?.(json.content as string);
              break;
            case 'done':
              events.onDone?.();
              break;
            case 'error':
              events.onError?.(json.message as string);
              break;
          }
        } catch {
          // 忽略无法解析的片段
        }
      }
    }
    rawReceived += buf;
    // 整段解析下来一个事件都没拿到（但收到了非空白内容）→ 把原文摆出来，不替用户猜原因
    if (!gotEvent && rawReceived.trim()) {
      const snippet = rawReceived.slice(0, 300).replace(/\s+/g, ' ');
      events.onError?.(`未从响应中解析到任何事件，上游可能不是 SSE 流。原文前 300 字：${snippet}`);
    }
  } catch (err: any) {
    // 被新的发送中止（AbortController.abort）时，不报错误、不触发 onError，静默退出
    if (err?.name === 'AbortError') return;
    events.onError?.(err?.message || '读取响应失败');
  }
}
