// 周易算 · 前端 API 层（对接 Agnes 后端 SSE）
import type { CastResult, CastRequest, ChatMessage, ModelInfo, DailyData, HistoryItem } from './types';

export interface ChatEvents {
  onInit?: (d: any) => void;
  onHexagram?: (h: CastResult) => void;
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

export async function saveEnvConfig(cfg: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<any> {
  const resp = await fetch('/api/save-env-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  return resp.json();
}

export async function sendChat(
  payload: {
    sessionId: string;
    message: string;
    model?: string;
    systemPrompt?: string;
    cast?: CastRequest;
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

  if (!resp.ok || !resp.body) {
    events.onError?.('服务异常，无法连接后端');
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const lines = buf.split('\n');
      buf = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;
        try {
          const json = JSON.parse(dataStr);
          switch (json.type) {
            case 'init':
              events.onInit?.(json);
              break;
            case 'hexagram':
              events.onHexagram?.(json.data as CastResult);
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
  } catch (err: any) {
    // 被新的发送中止（AbortController.abort）时，不报错误、不触发 onError，静默退出
    if (err?.name === 'AbortError') return;
    events.onError?.(err?.message || '读取响应失败');
  }
}
