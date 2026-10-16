import { useMemo, useState } from 'react';
import type { CastRequest, DailyData, HistoryItem } from '../types';
import type { CastPreset } from './QuickActions';
import type { CastType } from './CastModal';
import { MiniGua } from './MiniGua';
import { HOT_QUESTIONS, dailyLingQian, LINGQIAN_LEVEL_COLOR } from '../content';
import { ConfirmModal } from './ConfirmModal';
import { LingQian } from './LingQian';
import { LingQianDetailModal } from './LingQianDetailModal';
import { CAST_CATEGORIES, METHOD_META } from '../castCategories';
import { Loading } from './Loading';

type TabKey = 'today' | 'ask' | 'qian' | 'record';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'ask', label: '起卦' },
  { key: 'qian', label: '灵签' },
  { key: 'record', label: '记录' },
];

interface Props {
  daily: DailyData | null;
  history: HistoryItem[];
  loadingDaily: boolean;
  loadingHistory: boolean;
  onAsk: (text: string, cast?: CastRequest) => void;
  onRandom: () => void;
  onOpenCast: (type: CastType) => void;
  onOpenBazi: () => void;
  onOpenZiwei: () => void;
  onOpenTarot: () => void;
  onOpenQimen: () => void;
  onOpenDaliuren: () => void;
  onOpenDream: () => void;
  onOpenHepan: () => void;
  onOpenFace: () => void;
  onOpenPalm: () => void;
  onOpenMbti: () => void;
  onOpenHistory: (id: string) => void;
  onOpenLingQian: (item: HistoryItem) => void;
  onRecord: (num: number, name: string, level: string, source: string) => void;
  onDeleteHistory: (id: string) => void;
  onExportHistory: () => void;
  onClearHistory: () => void;
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  const dt = new Date(iso);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

function methodLabel(m?: string | null): string {
  const map: Record<string, string> = {
    coin: '三枚铜钱',
    number: '数字',
    time: '时间',
    char: '汉字',
    direction: '方位',
    sound: '声音',
    report: '报数',
    yarrow: '揲蓍',
    najia: '纳甲六爻',
  };
  return m ? map[m] || m : '';
}

// 阿拉伯数字转中文（用于签牌底款，如 21 → 二十一）
function toCNNum(n: number): string {
  const d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n <= 0) return '零';
  if (n < 10) return d[n];
  if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return d[t] + '十' + (o ? d[o] : '');
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return d[h] + '百' + (rest ? toCNNum(rest) : '');
}

// 本地年月日（用于记录按日期分组）
function dateKeyOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKeyStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function groupLabel(key: string, today: string): string {
  if (key === today) return '今天';
  const parts = key.split('-');
  return `${Number(parts[1])}月${Number(parts[2])}日`;
}

export function HomeView({
  daily,
  history,
  loadingDaily,
  loadingHistory,
  onAsk,
  onRandom,
  onOpenCast,
  onOpenBazi,
  onOpenZiwei,
  onOpenTarot,
  onOpenQimen,
  onOpenDaliuren,
  onOpenDream,
  onOpenHepan,
  onOpenFace,
  onOpenPalm,
  onOpenMbti,
  onOpenHistory,
  onOpenLingQian,
  onRecord,
  onDeleteHistory,
  onExportHistory,
  onClearHistory,
}: Props) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<TabKey>('today');
  const [pending, setPending] = useState<HistoryItem | null>(null);
  const [todaySignOpen, setTodaySignOpen] = useState(false);

  const todaySign = useMemo(dailyLingQian, []);

  const levelColor = LINGQIAN_LEVEL_COLOR[todaySign.level] || '#c9a96a';

  const submitQuick = (cast?: CastRequest) => {
    const text = q.trim();
    if (!text) return;
    onAsk(text, cast);
    setQ('');
  };

  const preset: CastPreset = { label: '', message: '', cast: { method: 'coin' } };

  const todayKey = todayKeyStr();
  const dateGroupsOf = (items: HistoryItem[]): [string, HistoryItem[]][] => {
    const map = new Map<string, HistoryItem[]>();
    for (const h of items) {
      const k = dateKeyOf(h.updatedAt);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(h);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  };
  // 记录先按类型（灵签 / 起卦）分块，块内再按日期分组（当天展开、其余折叠）
  const typeGroups = useMemo(() => {
    const lingqian = history.filter((h) => h.type === 'lingqian');
    const cast = history.filter((h) => h.type !== 'lingqian');
    return (
      [
        { type: 'lingqian' as const, label: '灵签', items: lingqian },
        { type: 'cast' as const, label: '起卦', items: cast },
      ] as const
    )
      .filter((g) => g.items.length > 0)
      .map((g) => ({ ...g, dateGroups: dateGroupsOf(g.items) }));
  }, [history]);

  return (
    <div className="flex flex-col gap-[18px]">
      {/* ===== 标签导航 ===== */}
      <nav className="sticky top-0 z-[6] flex gap-1.5 p-2 bg-[rgba(20,17,13,0.92)] backdrop-blur-md border border-gold-dim rounded-2xl">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'tab' + (tab === t.key ? ' tab-active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ===== 今日：AI 快速起卦（置顶）+ 今日一卦/今日一签 + 每日一句 ===== */}
      {tab === 'today' && (
        <div className="flex flex-col gap-[22px] fade-up">
          {/* AI 快速起卦 —— 置顶 */}
          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              AI 快速起卦
            </h2>
            <div className="flex gap-2.5 items-stretch">
              <input
                className="field flex-1"
                placeholder="此刻你心有何惑？一句话说与占卜师…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitQuick(preset.cast);
                }}
              />
              <button
                className="btn btn-primary"
                onClick={() => submitQuick(preset.cast)}
              >
                起卦问询
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => submitQuick(undefined)}
              >
                直接问
              </button>
            </div>
            <div className="text-xs text-fg-faint leading-relaxed">
              起卦问询＝以三枚铜钱法为你起卦解疑；直接问＝仅与占卜师对话，不起卦。
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr] gap-3.5">
            <div className="card flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-brush text-xl text-gold-bright tracking-[2px]">今日一卦</div>
                  <div className="text-xs text-fg-dim mt-1">
                    {daily ? `${daily.date} · ${daily.weekday}` : '—'}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setTab('ask')}
                  >
                    起卦
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
              {loadingDaily || !daily ? (
                <Loading text="正在推演今日之卦…" />
              ) : (
                <>
                  <div className="flex gap-[18px] items-center">
                    <div className="flex-none flex items-center justify-center p-2 border border-gold-dim rounded-xl bg-[rgba(20,17,13,0.5)] text-gold">
                      <MiniGua hex={daily.hexagram} size={1.4} label />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-brush text-[22px] text-gold-bright tracking-wide">
                        第{daily.hexagram.seq}卦 · {daily.hexagram.name}
                      </div>
                      <div className="text-[13px] text-fg-dim mt-1">
                        上{daily.hexagram.upper.nature}（{daily.hexagram.upper.name}）下
                        {daily.hexagram.lower.nature}（{daily.hexagram.lower.name}）
                      </div>
                      <div className="text-[14px] text-gold mt-2 mb-3 italic">
                        「{daily.hexagram.guaYi}」
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          onAsk(
                            `请为我详细解读今日之卦：第${daily.hexagram.seq}卦 ${daily.hexagram.name}（上${daily.hexagram.upper.nature}下${daily.hexagram.lower.nature}），并依今日宜忌给我可行的处世建议。`,
                            undefined
                          )
                        }
                      >
                        查看今日卦详解
                      </button>
                    </div>
                  </div>

                  <div className="yi-ji">
                    <div className="yi-ji-row">
                      <span className="yi-badge">宜</span>
                      <div className="yi-chips">
                        {daily.yi.map((y) => (
                          <span key={y} className="yi-chip">
                            {y}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="yi-ji-row">
                      <span className="ji-badge">忌</span>
                      <div className="ji-chips">
                        {daily.ji.map((j) => (
                          <span key={j} className="ji-chip">
                            {j}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 text-center text-[11px] text-fg-faint tracking-[1px]">
                每日自动求得 · 明日更新
              </div>
            </div>

            {/* 今日一签：古典等级印章 + 清晰层级信息，结构对齐「今日一卦」 */}
            <div className="card flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-brush text-xl text-gold-bright tracking-[2px]">今日一签</div>
                  <div className="text-xs text-fg-dim mt-1">每日一签 · 随缘而定</div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('qian')}>
                    求签
                  </button>
                </div>
              </div>

              <div className="flex-1 flex gap-[16px] items-center">
                {/* 等级印章：圆形朱印，以等级首字示吉凶，配双层描边 */}
                <div
                  className="relative flex-none rounded-full shrink-0 flex items-center justify-center"
                  style={{
                    width: 78,
                    height: 78,
                    background: `radial-gradient(circle at 34% 30%, ${levelColor}, ${levelColor}cc 80%)`,
                    boxShadow: `0 6px 18px ${levelColor}55, inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -8px 14px rgba(0,0,0,0.28)`,
                  }}
                >
                  <div className="absolute inset-[6px] rounded-full border" style={{ borderColor: 'rgba(251,233,214,0.6)' }} />
                  <div className="absolute inset-[10px] rounded-full border" style={{ borderColor: 'rgba(251,233,214,0.22)' }} />
                  <span
                    className="font-brush text-[32px] leading-none"
                    style={{ color: '#fbe9d6', textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
                  >
                    {todaySign.level[0]}
                  </span>
                </div>

                {/* 信息区 */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="font-brush text-[13px] text-gold-dim tracking-[3px] mb-1.5">灵签</div>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-[13px] text-fg-dim tracking-[1px]">第 {toCNNum(todaySign.num)} 签</span>
                    <span
                      className="px-1.5 py-[2px] rounded text-[11px] font-serif tracking-[1px]"
                      style={{ color: levelColor, background: `${levelColor}1f`, border: `1px solid ${levelColor}55` }}
                    >
                      {todaySign.level}
                    </span>
                  </div>
                  <div className="font-serif text-[19px] text-gold-bright leading-tight tracking-[1px] mb-1.5">
                    {todaySign.name}
                  </div>
                  <div className="text-[13px] text-fg-dim italic leading-snug line-clamp-2">
                    「{todaySign.poem[0]}」
                  </div>
                </div>
              </div>

              <button className="btn btn-primary w-full mt-3.5" onClick={() => setTodaySignOpen(true)}>
                查看签文详解
              </button>
              <div className="mt-3 pt-3 border-t border-white/5 text-center text-[11px] text-fg-faint tracking-[1px]">
                每日自动求得 · 明日更新
              </div>
            </div>
          </section>

          {/* 每日一句（原今日一签位置） */}
          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              每日一句 · 《易经》
            </h2>
            <div className="card flex flex-col justify-center py-5">
              {daily ? (
                <>
                  <div className="font-serif text-[19px] leading-[1.95] text-gold-bright flex-1">
                    「{daily.quote.text}」
                  </div>
                  <div className="mt-3.5 text-[13px] text-fg-dim text-right">— {daily.quote.source}</div>
                </>
              ) : (
                <div className="text-fg-faint text-center">—</div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ===== 起卦：分类聚合（梅花易数 / 铜钱法 / 揲蓍法）===== */}
      {tab === 'ask' && (
        <div className="flex flex-col gap-[22px] fade-up">
          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              热门问题
            </h2>
            <div className="hot-chips">
              {HOT_QUESTIONS.map((item) => (
                <button
                  key={item.title}
                  className="hot-chip"
                  onClick={() => onAsk(item.question, { method: 'coin' })}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              起卦有道 · 三法归一
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              《周易》起卦，法虽有别，其理一也。梅花易数取数最活，铜钱法民间最普，揲蓍法古意最浓——择一而问，诚则灵。
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              常用起卦
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                className="card-soft flex flex-col items-center gap-1.5 py-4 cursor-pointer transition hover:border-gold hover:-translate-y-px"
                onClick={() => onRandom()}
              >
                <span className="font-brush text-[22px] text-gold-bright leading-none">随机</span>
                <span className="text-xs text-fg-dim">一键起卦</span>
              </button>
              <button
                className="card-soft flex flex-col items-center gap-1.5 py-4 cursor-pointer transition hover:border-gold hover:-translate-y-px"
                onClick={() => onOpenCast('person')}
              >
                <span className="font-brush text-[22px] text-gold-bright leading-none">姓名生辰</span>
                <span className="text-xs text-fg-dim">填姓名生日</span>
              </button>
              <button
                className="card-soft flex flex-col items-center gap-1.5 py-4 cursor-pointer transition hover:border-gold hover:-translate-y-px"
                onClick={() => onOpenCast('coin')}
              >
                <span className="font-brush text-[22px] text-gold-bright leading-none">铜钱</span>
                <span className="text-xs text-fg-dim">三枚掷卦</span>
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              命理排盘
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              不占事，只论命——依生辰四柱推一生格局与大运流年。
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
                onClick={onOpenBazi}
              >
                <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                  命
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-serif text-[15px] text-gold-bright">八字排盘</span>
                  <span className="text-xs text-fg-dim mt-0.5 truncate">四柱 · 十神 · 五行 · 大运</span>
                  <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">论一生格局与流年运势</span>
                </span>
              </button>
              <button
                className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
                onClick={onOpenZiwei}
              >
                <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                  星
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-serif text-[15px] text-gold-bright">紫微斗数</span>
                  <span className="text-xs text-fg-dim mt-0.5 truncate">十二宫 · 主星 · 四化 · 大限</span>
                  <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">看星曜宫位与运限流转</span>
                </span>
              </button>
              <button
                className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
                onClick={onOpenHepan}
              >
                <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                  合
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-serif text-[15px] text-gold-bright">合盘 · 合婚</span>
                  <span className="text-xs text-fg-dim mt-0.5 truncate">夫妻宫 · 生肖 · 五行互补</span>
                  <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">看两人是否相宜</span>
                </span>
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              塔罗占卜
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              西方占术，以牌面意象观照当下——单牌速断，或凯尔特十字细论始末。
            </p>
            <button
              className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
              onClick={onOpenTarot}
            >
              <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                牌
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-serif text-[15px] text-gold-bright">塔罗抽牌</span>
                <span className="text-xs text-fg-dim mt-0.5 truncate">5 种牌阵 · 78 张牌 · 正逆位</span>
                <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">
                  单牌速断、三牌时间流、凯尔特十字
                </span>
              </span>
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              奇门遁甲
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              古之术数重「时空择吉」——以起局时刻排九宫五层盘，看值符值使与八门九星，指宜动之方位时辰。
            </p>
            <button
              className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
              onClick={onOpenQimen}
            >
              <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                奇
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-serif text-[15px] text-gold-bright">奇门遁甲排盘</span>
                <span className="text-xs text-fg-dim mt-0.5 truncate">九宫 · 八门 · 九星 · 八神</span>
                <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">按节气定局（拆补法），重时空择吉</span>
              </span>
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              大六壬
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              古称「三式」之一——以月将加占时立天地盘，观四课三传，断事之来由与终始。
            </p>
            <button
              className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
              onClick={onOpenDaliuren}
            >
              <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                壬
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-serif text-[15px] text-gold-bright">大六壬起课</span>
                <span className="text-xs text-fg-dim mt-0.5 truncate">天地盘 · 四课 · 三传 · 神煞</span>
                <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">月将加占时，断事之终始</span>
              </span>
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              周公解梦
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              把梦说给我听——从 286 个传统意象中检索你梦中出现的事物，依民俗解梦之法细细道来。
            </p>
            <button
              className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
              onClick={onOpenDream}
            >
              <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                梦
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-serif text-[15px] text-gold-bright">周公解梦</span>
                <span className="text-xs text-fg-dim mt-0.5 truncate">意象检索 · 情境通解 · 民俗参考</span>
                <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">286 个传统意象，说清梦里的暗示</span>
              </span>
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              相术看相
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              上传清晰照片，依传统相术观察面部或掌纹；仅作文化参考，不作命运断言。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
                onClick={onOpenFace}
              >
                <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                  面
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-serif text-[15px] text-gold-bright">面相</span>
                  <span className="text-xs text-fg-dim mt-0.5 truncate">三停 · 五岳 · 五官</span>
                  <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">看面部轮廓与气色</span>
                </span>
              </button>
              <button
                className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
                onClick={onOpenPalm}
              >
                <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                  掌
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-serif text-[15px] text-gold-bright">手相</span>
                  <span className="text-xs text-fg-dim mt-0.5 truncate">三大主线 · 掌丘 · 掌形</span>
                  <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">看掌纹与手型特征</span>
                </span>
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
              MBTI 性格测评
            </h2>
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">
              不靠生辰、不靠卦象——八十道题看清你自己的行事偏好。
            </p>
            <button
              className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
              onClick={onOpenMbti}
            >
              <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                性
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-serif text-[15px] text-gold-bright">MBTI 测评</span>
                <span className="text-xs text-fg-dim mt-0.5 truncate">80 题 · 四维度 · 16 型</span>
                <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">能量 · 信息 · 决策 · 生活态度</span>
              </span>
            </button>
          </section>

          <details className="hex-notes mt-1">
            <summary>进阶起卦法（梅花易数 · 纳甲六爻 · 揲蓍）</summary>
            <div className="flex flex-col gap-[22px] mt-3">
          {CAST_CATEGORIES.map((cat) => (
            <section
              key={cat.id}
              className="card-soft"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="font-brush text-[18px] text-gold-bright tracking-[2px] m-0">
                  {cat.title}
                </h3>
                <span className="flex-none text-[12px] text-fg-dim px-2.5 py-0.5 rounded-full border border-gold-dim">
                  {cat.origin}
                </span>
              </div>
              <p className="text-[13px] text-fg-dim leading-relaxed m-0">{cat.desc}</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {cat.methods.map((key) => {
                  const m = METHOD_META[key];
                  return (
                    <button
                      key={m.method}
                      className="flex items-center gap-3 text-left bg-panel-2/50 border border-gold-dim rounded-xl p-3 cursor-pointer transition hover:border-gold hover:bg-gold-dim/20 hover:-translate-y-px"
                      onClick={() => onOpenCast(m.method)}
                    >
                      <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center shadow-[0_2px_10px_rgba(192,57,43,0.3)]">
                        {m.icon}
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="font-serif text-[15px] text-gold-bright">{m.title}</span>
                        <span className="text-xs text-fg-dim mt-0.5 truncate">{m.short}</span>
                        <span className="text-[11px] text-fg-faint mt-0.5 leading-snug">{m.when}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
            </div>
          </details>
        </div>
      )}

      {/* ===== 灵签：求签 ===== */}
      {tab === 'qian' && <LingQian onRecord={(s, src) => onRecord(s.num, s.name, s.level, src)} />}

      {/* ===== 记录：最近使用记录 ===== */}
      {tab === 'record' && (
        <div className="flex flex-col gap-[22px] fade-up">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between pl-[11px] border-l-[3px] border-vermilion">
              <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 leading-[1.1] flex items-center gap-2">
                最近使用记录
                {history.length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-vermilion text-[#fbe9d6] font-serif text-[11px] leading-[18px]">
                    {history.length}
                  </span>
                )}
              </h2>
              {history.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-fg-dim border border-gold-dim rounded-full px-2.5 py-1 bg-transparent hover:text-gold-bright hover:border-gold-bright transition"
                    onClick={onExportHistory}
                  >
                    导出
                  </button>
                  <button
                    className="text-xs text-[#e0a39c] border border-[#b8554a] rounded-full px-2.5 py-1 bg-transparent hover:text-vermilion hover:border-vermilion transition"
                    onClick={onClearHistory}
                  >
                    清空
                  </button>
                </div>
              )}
            </div>
            {history.length === 0 ? (
              loadingHistory ? (
                <Loading text="正在载入记录…" />
              ) : (
                <div className="text-[13px] text-fg-faint px-0.5">
                  尚无记录。起一卦或求一支签，这里便会留下你的足迹。
                </div>
              )
            ) : (
              <div className="flex flex-col gap-3.5">
                {typeGroups.map((tg) => (
                  <section key={tg.type} className="flex flex-col gap-2.5">
                    <h3 className="font-serif text-[15px] text-gold-bright tracking-[1px] flex items-center gap-2 m-0">
                      <span
                        className="w-1 h-4 rounded-full inline-block flex-none"
                        style={{ background: tg.type === 'lingqian' ? '#c0392b' : '#c9a96a' }}
                      />
                      {tg.label}
                      <span className="text-fg-faint text-xs ml-0.5">· {tg.items.length} 条</span>
                    </h3>
                    {tg.dateGroups.map(([key, items]) => (
                      <details key={key} open={key === todayKey} className="hex-notes !mt-0">
                        <summary className="!text-[14px] !text-gold-bright tracking-[1px]">
                          <span className="font-serif">{groupLabel(key, todayKey)}</span>
                          <span className="text-fg-faint text-xs ml-1.5">· {items.length} 条</span>
                        </summary>
                        <ul className="list-none m-0 p-0 flex flex-col gap-0.5 bg-panel border border-line rounded-xl overflow-hidden mt-2">
                          {items.map((h) => (
                            <li
                              key={h.id}
                              className="flex items-center gap-2.5 px-3.5 py-3 cursor-pointer border-b border-line transition hover:bg-gold-dim/30"
                              onClick={() => (h.type === 'lingqian' ? onOpenLingQian(h) : onOpenHistory(h.id))}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-none"
                                style={{ background: tg.type === 'lingqian' ? '#c0392b' : '#c9a96a' }}
                              />
                              <span className="flex-1 min-w-0 text-[14.5px] text-fg truncate">{h.title}</span>
                              {h.type === 'lingqian' ? (
                                <span
                                  className="flex-none text-xs text-gold bg-gold-dim/20 border border-gold-dim px-2.5 py-0.5 rounded-full"
                                  style={{ color: LINGQIAN_LEVEL_COLOR[h.level || ''] || undefined }}
                                >
                                  求签 · {h.level}
                                </span>
                              ) : (
                                h.hexName && (
                                  <span className="flex-none text-xs text-gold bg-gold-dim/30 border border-gold-dim px-2.5 py-0.5 rounded-full">
                                    起卦 · {methodLabel(h.method)} · {h.hexName}
                                  </span>
                                )
                              )}
                              <span className="flex-none text-xs text-fg-faint w-16 text-right">
                                {relTime(h.updatedAt)}
                              </span>
                              <button
                                className="flex-none w-[26px] h-[26px] inline-flex items-center justify-center border border-gold-dim rounded-full bg-transparent text-fg-faint text-[13px] leading-none cursor-pointer transition hover:text-[#e0a39c] hover:border-[#b8554a] hover:bg-[rgba(192,57,43,0.12)]"
                                title="删除记录"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPending(h);
                                }}
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmModal
        open={!!pending}
        title="删除记录"
        message={
          pending
            ? `确定删除「${pending.title}」这条记录吗？对话内容将一并移除，且不可恢复。`
            : ''
        }
        confirmText="删除"
        danger
        onConfirm={() => {
          if (pending) onDeleteHistory(pending.id);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />

      {todaySignOpen && (
        <LingQianDetailModal
          sign={todaySign}
          levelColor={LINGQIAN_LEVEL_COLOR[todaySign.level] || '#c9a96a'}
          onClose={() => setTodaySignOpen(false)}
        />
      )}

      <footer className="text-center text-xs text-fg-faint tracking-[2px] py-2.5">
        周易算 · 借卦修心，善易者不卜
      </footer>
    </div>
  );
}
