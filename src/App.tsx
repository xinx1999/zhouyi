import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { HomeView } from './components/HomeView';
import type { CastPreset } from './components/QuickActions';
import { CastModal, type CastType } from './components/CastModal';
import { BirthModal } from './components/BirthModal';
import { TarotModal } from './components/TarotModal';
import { DreamModal } from './components/DreamModal';
import { HepanModal } from './components/HepanModal';
import { ImageReadingModal } from './components/ImageReadingModal';
import { MbtiQuiz } from './components/MbtiQuiz';
import { ConfirmModal } from './components/ConfirmModal';
import { LingQianDetailModal } from './components/LingQianDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { Composer } from './components/Composer';
import { sendChat, fetchModels, saveEnvConfig, fetchDaily, fetchHistory, loadSession, deleteHistory, recordLingQian, clearAllHistory } from './api';
import { DEFAULT_SYSTEM_PROMPT } from './prompt';
import { LINGQIAN_BY_NUM, LINGQIAN_LEVEL_COLOR, type LingQian } from './content';
import type { CastRequest, ChatMessage, DailyData, HistoryItem, BaziInput, ZiweiInput, TarotInput, QimenInput, DaliurenInput, DreamInput, HepanInput, ImageReadingInput, ImageInput } from './types';

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
  const [baziOpen, setBaziOpen] = useState(false);
  const [ziweiOpen, setZiweiOpen] = useState(false);
  const [tarotOpen, setTarotOpen] = useState(false);
  const [qimenOpen, setQimenOpen] = useState(false);
  const [daliurenOpen, setDaliurenOpen] = useState(false);
  const [dreamOpen, setDreamOpen] = useState(false);
  const [hepanOpen, setHepanOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState<null | 'face' | 'palm'>(null);
  const [mbtiOpen, setMbtiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState('');
  const [backendNotice, setBackendNotice] = useState('');
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
      .then((d) => {
        setDaily(d);
        setBackendNotice('');
      })
      .catch(() =>
        setBackendNotice(
          '无法连接后端服务，请确认已运行 npm run dev（前端:5173 / 后端:3000）。今日一卦、每日一句与历史记录暂不可用。',
        ),
      )
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
    async (text: string, cast?: CastRequest, targetSessionId?: string, resume?: boolean, bazi?: BaziInput, ziwei?: ZiweiInput, tarot?: TarotInput, qimen?: QimenInput, daliuren?: DaliurenInput, dream?: DreamInput, hepan?: HepanInput, image?: ImageReadingInput) => {
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
          message: userText || (bazi ? '请为我解读这份八字命盘。' : ziwei ? '请为我论这张紫微命盘。' : tarot ? '请为我解读这副塔罗牌。' : qimen ? '请为我断这个奇门局。' : daliuren ? '请为我断这一课。' : dream ? '请为我解这个梦。' : hepan ? '请为我做一次合盘。' : image?.kind === 'face' ? '请为我看面相。' : image?.kind === 'palm' ? '请为我看手相。' : '请为我起卦解读。'),
          model,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          cast: resume ? undefined : cast,
          bazi: resume ? undefined : bazi,
          ziwei: resume ? undefined : ziwei,
          tarot: resume ? undefined : tarot,
          qimen: resume ? undefined : qimen,
          daliuren: resume ? undefined : daliuren,
          dream: resume ? undefined : dream,
          hepan: resume ? undefined : hepan,
          face: resume ? undefined : image?.kind === 'face' ? image.data : undefined,
          palm: resume ? undefined : image?.kind === 'palm' ? image.data : undefined,
          resume: resume || undefined,
        },
        {
          onHexagram: (h) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, hexagram: h } : m))),
          onBazi: (c) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, bazi: c } : m))),
          onZiwei: (c) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ziwei: c } : m))),
          onTarot: (r) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, tarot: r } : m))),
          onQimen: (c) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, qimen: c } : m))),
          onDaliuren: (c) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, daliuren: c } : m))),
          onDream: (r) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, dream: r } : m))),
          onHepan: (r) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, hepan: r } : m))),
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

  // 从首页发起的八字排盘：新开一局对话，先排盘（SSE bazi 事件）再由占卜师解读
  const homeBazi = useCallback(
    (input: BaziInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend('请为我解读这份八字命盘，重点分析日主强弱、格局用神与近年运势。', undefined, id, false, input);
      });
    },
    [guardIncomplete, doSend]
  );

  // 从首页发起的紫微排盘：同上，走 SSE ziwei 事件
  const homeZiwei = useCallback(
    (input: ZiweiInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend('请为我论这张紫微命盘，重点分析命宫格局、三方四正、四化落宫与大限流年。', undefined, id, false, undefined, input);
      });
    },
    [guardIncomplete, doSend]
  );

  // 从首页发起的塔罗抽牌：走 SSE tarot 事件
  const homeTarot = useCallback(
    (input: TarotInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend('请为我解读这副塔罗牌，逐位对应牌阵，连牌成势，最后回扣我所问之事。', undefined, id, false, undefined, undefined, input);
      });
    },
    [guardIncomplete, doSend]
  );

  // 从首页发起的奇门排盘：走 SSE qimen 事件
  const homeQimen = useCallback(
    (input: QimenInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend('请为我断这个奇门局，重点分析值符值使、九宫格局、旺相休囚，并指出宜动的方位与时辰。', undefined, id, false, undefined, undefined, undefined, input);
      });
    },
    [guardIncomplete, doSend]
  );

  // 从首页发起的大六壬起课：走 SSE daliuren 事件
  const homeDaliuren = useCallback(
    (input: DaliurenInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend('请为我断这一课，先定课体，再依次说清初传、中传、末传所主之事，并参天将与神煞。', undefined, id, false, undefined, undefined, undefined, undefined, input);
      });
    },
    [guardIncomplete, doSend]
  );

  // 从首页发起的解梦：走 SSE dream 事件
  const homeDream = useCallback(
    (input: DreamInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend(
          `我梦见：${input.dreamText}\n\n请为我解这个梦。`,
          undefined, id, false, undefined, undefined, undefined, undefined, undefined, input
        );
      });
    },
    [guardIncomplete, doSend]
  );

  // 从首页发起的合盘：走 SSE hepan 事件
  const homeHepan = useCallback(
    (input: HepanInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend(
          '请为我和对方做一次合盘，先看日柱（夫妻宫），再论生肖与五行互补，对相冲相害处给相处避就的建议。',
          undefined, id, false, undefined, undefined, undefined, undefined, undefined, undefined, input
        );
      });
    },
    [guardIncomplete, doSend]
  );

  // 从首页发起的看相：图片随多模态消息直传模型
  const homeImage = useCallback(
    (kind: 'face' | 'palm', input: ImageInput) => {
      guardIncomplete(() => {
        const id = uid();
        setMessages([]);
        setSessionId(id);
        setError('');
        doSend(
          kind === 'face' ? '请为我看面相。' : '请为我看手相。',
          undefined, id, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          { kind, data: input }
        );
      });
    },
    [guardIncomplete, doSend]
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

  const exportHist = useCallback(() => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `周易算-历史记录-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  const clearHist = useCallback(async () => {
    if (!window.confirm('确定清空全部历史记录吗？此操作不可恢复。')) return;
    try {
      const token = localStorage.getItem('adminToken') || undefined;
      await clearAllHistory(token || undefined);
      setHistory([]);
      setError('');
    } catch (e: any) {
      setError('清空失败：' + (e?.message || '未知错误'));
    }
  }, []);

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

      {backendNotice && (
        <div className="bg-[rgba(192,57,43,0.95)] text-white text-[13px] leading-[1.5] px-4 py-2 text-center z-40">
          ⚠ {backendNotice}
        </div>
      )}

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
            onOpenBazi={() => setBaziOpen(true)}
            onOpenZiwei={() => setZiweiOpen(true)}
            onOpenTarot={() => setTarotOpen(true)}
            onOpenQimen={() => setQimenOpen(true)}
            onOpenDaliuren={() => setDaliurenOpen(true)}
            onOpenDream={() => setDreamOpen(true)}
            onOpenHepan={() => setHepanOpen(true)}
            onOpenFace={() => setImageOpen('face')}
            onOpenPalm={() => setImageOpen('palm')}
            onOpenMbti={() => setMbtiOpen(true)}
            onOpenHistory={openHistory}
            onOpenLingQian={openLingQianRecord}
            onRecord={handleRecordLingQian}
            onDeleteHistory={deleteHist}
            onExportHistory={exportHist}
            onClearHistory={clearHist}
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
      {baziOpen && (
        <BirthModal
          title="八字排盘"
          hint="八字以出生时刻的四柱干支论命。请填公历生日与钟表时刻，系统自动换算节气月建与四柱。"
          onClose={() => setBaziOpen(false)}
          onSubmit={(input) => {
            setBaziOpen(false);
            homeBazi(input);
          }}
        />
      )}
      {ziweiOpen && (
        <BirthModal
          title="紫微斗数"
          hint="紫微斗数以出生时刻定十二宫与星曜。请填公历生日与钟表时刻，系统自动排星盘（含四化与大限）。"
          submitText="排星盘"
          onClose={() => setZiweiOpen(false)}
          onSubmit={(input) => {
            setZiweiOpen(false);
            homeZiwei(input);
          }}
        />
      )}
      {tarotOpen && (
        <TarotModal
          onClose={() => setTarotOpen(false)}
          onSubmit={(input) => {
            setTarotOpen(false);
            homeTarot(input);
          }}
        />
      )}
      {qimenOpen && (
        <BirthModal
          title="奇门遁甲"
          hint="奇门以起局时刻的干支排九宫五层盘（地盘/天盘/八门/九星/八神）。请填公历时刻，系统按节气自动定局（拆补法）。"
          submitText="排局"
          onClose={() => setQimenOpen(false)}
          onSubmit={(input) => {
            setQimenOpen(false);
            homeQimen(input);
          }}
        />
      )}
      {daliurenOpen && (
        <BirthModal
          title="大六壬"
          hint="大六壬以月将加占时立天地盘，观四课三传以断事之终始。请填公历起课时刻，系统自动定月将、天地盘、四课、三传。"
          submitText="起课"
          onClose={() => setDaliurenOpen(false)}
          onSubmit={(input) => {
            setDaliurenOpen(false);
            homeDaliuren(input);
          }}
        />
      )}
      {dreamOpen && (
        <DreamModal
          onClose={() => setDreamOpen(false)}
          onSubmit={(input) => {
            setDreamOpen(false);
            homeDream(input);
          }}
        />
      )}
      {hepanOpen && (
        <HepanModal
          onClose={() => setHepanOpen(false)}
          onSubmit={(input) => {
            setHepanOpen(false);
            homeHepan(input);
          }}
        />
      )}
      {imageOpen && (
        <ImageReadingModal
          kind={imageOpen}
          onClose={() => setImageOpen(null)}
          onSubmit={(input) => {
            const kind = imageOpen;
            setImageOpen(null);
            homeImage(kind, input);
          }}
        />
      )}
      {mbtiOpen && <MbtiQuiz onClose={() => setMbtiOpen(false)} />}
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
