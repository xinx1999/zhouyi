import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { HomeView } from './components/HomeView';
import type { CastPreset } from './components/QuickActions';
import { CastModal, type CastType } from './components/CastModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LingQianDetailModal } from './components/LingQianDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { Composer } from './components/Composer';
import { sendChat, fetchModels, saveEnvConfig, fetchDaily, fetchHistory, loadSession, deleteHistory, recordLingQian } from './api';
import { DEFAULT_SYSTEM_PROMPT } from './prompt';
import { LINGQIAN_BY_NUM, LINGQIAN_LEVEL_COLOR, type LingQian } from './content';
import type { CastRequest, ChatMessage, DailyData, HistoryItem } from './types';

function uid(): string {
  return crypto.randomUUID();
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => uid());
  const [model, setModel] = useState('');
  const [castModal, setCastModal] = useState<null | CastType>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [daily, setDaily] = useState<DailyData | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [lingQianView, setLingQianView] = useState<{ sign: LingQian; levelColor: string } | null>(null);
  const [pendingWarn, setPendingWarn] = useState(false);
  const [pendingReturnId, setPendingReturnId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // 用于中止上一条尚未结束的流式请求（如导航离开时仍在跑的起卦解读），
  // 避免「未完成的卦」被点击续答时，旧流仍占用 isLoading 把续答请求挡掉，或两条流写同一会话
  const abortRef = useRef<AbortController | null>(null);
  // 续答锁：记录「正在续答的未完成会话 id」，防止同一记录被重复点击触发多次续答（否则会堆出多个回答）
  const resumeLockRef = useRef<string | null>(null);

  // 加载模型 + 每日数据 + 历史
  useEffect(() => {
    fetchModels()
      .then((d) => {
        if (d.defaultModel) setModel(d.defaultModel);
      })
      .catch(() => {});
    setLoadingDaily(true);
    fetchDaily()
      .then(setDaily)
      .catch(() => {})
      .finally(() => setLoadingDaily(false));
    fetchHistory(100)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refreshHistory = useCallback(() => {
    fetchHistory(100).then(setHistory).catch(() => {});
  }, []);

  const newSession = useCallback(() => {
    setMessages([]);
    setSessionId(uid());
    setError('');
    setView('chat');
  }, []);

  const goHome = useCallback(() => {
    setView('home');
    setLoadingHistory(true);
    fetchHistory(100)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const doSend = useCallback(
    async (text: string, cast?: CastRequest, targetSessionId?: string, resume?: boolean) => {
      // 续答（打开未完成的卦）不应被 isLoading 阻挡：那条记录往往是被中断的流式对话留下的，
      // 此时 isLoading 仍为 true，若直接 return 会导致「首点不续答、刷新后才续答」
      if (isLoading && !resume) return;
      const userText = text.trim();
      if (!userText && !cast && !resume) return;

      // 中止上一条仍在跑的流，避免两条流并发写同一会话产生重复助手消息
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setView('chat');
      setIsLoading(true);
      setError('');
      const sid = targetSessionId ?? sessionId;
      // 续答模式：会话里已有该用户消息，不重复追加用户气泡，仅补出助手解读
      if (!resume) {
        const userMsg: ChatMessage = { id: uid(), role: 'user', content: userText };
        setMessages((prev) => [...prev, userMsg]);
      }
      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        hexagram: null,
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await sendChat(
        {
          sessionId: sid,
          message: userText || '请为我起卦解读。',
          model,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          cast: resume ? undefined : cast,
          resume: resume || undefined,
        },
        {
          onHexagram: (h) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, hexagram: h } : m))),
          onText: (t) =>
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + t } : m))
            ),
          onDone: () => {
            // 若后端因「已完成/正在生成」而跳过（返回 init+done 无 text），本次追加的助手气泡内容为空，
            // 则直接移除，避免残留一个空白回答
            setMessages((prev) => {
              const target = prev.find((m) => m.id === assistantId);
              const isEmpty = !target || !target.content.trim();
              return prev
                .filter((m) => m.id !== assistantId || !isEmpty)
                .map((m) =>
                  m.id === assistantId && !isEmpty ? { ...m, isStreaming: false } : m
                );
            });
            refreshHistory();
          },
          onError: (msg) => {
            setError(msg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content || `⚠ ${msg}`, isStreaming: false }
                  : m
              )
            );
            refreshHistory();
          },
        },
        controller.signal
      );
      // 仅当本条流未被更新的发送中止时，才复位 loading（避免旧流复位把新流 Loading 清掉）
      if (abortRef.current === controller) setIsLoading(false);
    },
    [isLoading, sessionId, model, refreshHistory]
  );

  // 当前对话中，上一卦是否尚在演算（AI 仍在解读 / 卦象未成）
  const pendingCast = messages.some((m) => m.role === 'assistant' && m.isStreaming);
  // 历史里最近的「未完成」记录（起卦/对话中断，解读未落库）
  const mostRecentIncomplete = history.find((h) => h.incomplete);

  // 若上一卦尚未完成（当前演算中，或历史里有未完成记录），起卦前先弹确认，
  // 避免新开一局悄悄覆盖未成之卦；「返回上一卦」会打开对应的未完成记录
  const guardIncomplete = useCallback(
    (action: () => void) => {
      if (pendingCast) {
        setPendingReturnId(sessionId);
        setPendingWarn(true);
        return;
      }
      if (mostRecentIncomplete) {
        setPendingReturnId(mostRecentIncomplete.id);
        setPendingWarn(true);
        return;
      }
      action();
    },
    [pendingCast, mostRecentIncomplete, sessionId]
  );

  // 从首页（HomeView）发起的起卦：先新开一局对话，避免追加进上一个历史/对话
  const homeAsk = useCallback(
    (text: string, cast?: CastRequest) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend(text, cast, id);
      });
    },
    [guardIncomplete, doSend]
  );
  const homeRandom = useCallback(() => {
    guardIncomplete(() => {
      const id = uid();
      setMessages([]);
      setSessionId(id);
      setError('');
      doSend('请为我随机起一卦，开示当下迷津。', { method: 'coin' }, id);
    });
  }, [guardIncomplete, doSend]);
  const homeOpenCast = useCallback(
    (type: CastType) => {
      guardIncomplete(() => {
        setMessages([]);
        setSessionId(uid());
        setError('');
        setCastModal(type);
      });
    },
    [guardIncomplete]
  );

  const handlePick = (p: CastPreset) =>
    guardIncomplete(() => doSend(p.message, p.cast));
  const handleCastSubmit = (cast: CastRequest) => {
    doSend(cast.question || '', cast);
    setCastModal(null);
  };

  const openHistory = useCallback(
    async (id: string) => {
      // ① 直接复用当前正在演算的会话：不要重新 loadSession / 续答。
      //    否则会与正在进行的流重复生成多个回答（典型场景：从聊天视图点「返回上一卦」，
      //    或首页记录 tab 点开「正在生成的那条记录」）。仅切到聊天视图即可看进度。
      if (sessionId === id && isLoading) {
        setView('chat');
        return;
      }
      // ② 同一会话正在续答中：只保证切到聊天视图看进度，不重复触发生成（避免多回答）。
      //    注意：必须 setView('chat')，否则在首页再次点击同一条时 return 提前退出却没切视图 → 看似「打不开」。
      if (resumeLockRef.current === id) {
        setView('chat');
        return;
      }
      // 续答锁必须在 await loadSession 之前同步上锁：并发点击只有第一次真正进入续答，
      // 其余在 await 挂起期被挡掉，从根本上杜绝同一记录堆出多个回答。
      resumeLockRef.current = id;
      try {
        const msgs = await loadSession(id);
        setMessages(msgs);
        setSessionId(id);
        setView('chat');
        // 打开即自动续答未完成记录：判定基于「实际消息内容」（末条是 user，或末条助手解读为空），
        // 而非陈旧的列表标志——所以续答落库完成后 incomplete 自然变 false，连点不会重复生成多个回答。
        const last = msgs[msgs.length - 1];
        const incomplete =
          !msgs.some((m) => m.role === 'assistant' && m.isStreaming) &&
          !!last &&
          (last.role === 'user' || (last.role === 'assistant' && !last.content.trim()));
        // 非未完成记录：立即释放锁，仅展示已有内容，不续答（避免锁常驻挡住再次打开）
        if (!incomplete) {
          resumeLockRef.current = null;
          return;
        }
        // 清掉被中断时残留的空助手气泡，再补一条真正在流式的 assistant（自动显示「演算中」loading）
        setMessages((prev) => {
          const t = [...prev];
          while (
            t.length &&
            t[t.length - 1].role === 'assistant' &&
            !t[t.length - 1].content.trim()
          ) {
            t.pop();
          }
          return t;
        });
        const q =
          [...msgs].reverse().find((m) => m.role === 'user')?.content || '请为我起卦解读。';
        await doSend(q, undefined, id, true);
      } catch {
        setError('载入历史对话失败');
      } finally {
        // 续答结束（成功/失败）后释放该会话锁，允许下次重新打开
        if (resumeLockRef.current === id) resumeLockRef.current = null;
      }
    },
    [doSend, sessionId, isLoading]
  );

  const deleteHist = useCallback(
    async (id: string) => {
      try {
        await deleteHistory(id);
        setHistory((prev) => prev.filter((h) => h.id !== id));
        fetchHistory(100).then(setHistory).catch(() => {});
      } catch (e: any) {
        setError(e?.message || '删除记录失败');
      }
    },
    []
  );

  // 从「记录」中点开一支求签 → 弹出签文详情
  const openLingQianRecord = useCallback((item: HistoryItem) => {
    const sign = item.num != null ? LINGQIAN_BY_NUM[item.num] : undefined;
    if (!sign) return;
    setLingQianView({ sign, levelColor: LINGQIAN_LEVEL_COLOR[sign.level] || '#c9a96a' });
  }, []);

  // 每一次求签（随机 / 看今日一签）后写入历史
  const handleRecordLingQian = useCallback(
    async (num: number, name: string, level: string, source: string) => {
      try {
        await recordLingQian({ num, name, level, source });
        refreshHistory();
      } catch (e) {
        console.error('记录求签失败', e);
      }
    },
    [refreshHistory]
  );

  return (
    <div className="flex flex-col h-full max-w-app mx-auto relative">
      <Header onNew={newSession} onHome={goHome} onSettings={() => setSettingsOpen(true)} />

      {view === 'home' ? (
        <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-6">
          <HomeView
            daily={daily}
            history={history}
            loadingDaily={loadingDaily}
            loadingHistory={loadingHistory}
            onAsk={homeAsk}
            onRandom={homeRandom}
            onOpenCast={homeOpenCast}
            onOpenHistory={openHistory}
            onOpenLingQian={openLingQianRecord}
            onRecord={handleRecordLingQian}
            onDeleteHistory={deleteHist}
          />
        </main>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-[18px] pt-[14px] pb-2">
            <ChatView
              messages={messages}
              onPick={handlePick}
              onOpenCast={(type) => guardIncomplete(() => setCastModal(type))}
            />
            <div ref={bottomRef} />
          </main>

          {error && (
            <div className="fixed left-1/2 -translate-x-1/2 bottom-[92px] bg-[rgba(192,57,43,0.92)] text-white px-4 py-2.5 rounded-xl text-[13px] z-50 shadow-2xl">
              ⚠ {error}
            </div>
          )}

          <div className="p-[10px] pb-[calc(12px+env(safe-area-inset-bottom))] border-t border-line bg-gradient-to-b from-transparent to-[rgba(20,17,13,0.6)]">
            <Composer
              value={input}
              onChange={setInput}
              loading={isLoading}
              onSend={() => {
                doSend(input);
                setInput('');
              }}
            />
          </div>
        </>
      )}

      {castModal && (
        <CastModal type={castModal} onClose={() => setCastModal(null)} onSubmit={handleCastSubmit} />
      )}
      {lingQianView && (
        <LingQianDetailModal
          sign={lingQianView.sign}
          levelColor={lingQianView.levelColor}
          onClose={() => setLingQianView(null)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onSave={async (cfg) => {
            await saveEnvConfig(cfg);
          }}
        />
      )}

      {pendingWarn && (
        <ConfirmModal
          open
          title="上一卦尚未完成"
          message={
            pendingCast
              ? '当前对话里上一卦的解读尚未完成，暂不可起新卦。是否返回继续查看上一卦？'
              : '你还有未完成的占卦记录，暂不可起新卦。是否返回继续查看上一卦？'
          }
          confirmText="返回上一卦"
          cancelText="取消"
          onConfirm={() => {
            setPendingWarn(false);
            // 当前对话仍在演算：直接回到聊天视图看进度即可，切勿再 openHistory
            // （会重新 loadSession 并续答，与正在进行的流重复生成多个回答）
            if (pendingCast) {
              setView('chat');
            } else if (pendingReturnId) {
              openHistory(pendingReturnId);
            } else {
              setView('chat');
            }
          }}
          onCancel={() => setPendingWarn(false)}
        />
      )}
    </div>
  );
}
