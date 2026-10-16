import type { QimenChart, QimenPalace } from '../types';

// 八门配色（吉门偏绿、凶门偏红）
const DOOR_TONE: Record<string, string> = {
  休門: '#3f7d5a',
  生門: '#3f7d5a',
  開門: '#3f7d5a',
  傷門: '#b8843a',
  杜門: '#b8843a',
  景門: '#b8843a',
  死門: '#c0392b',
  驚門: '#c0392b',
};

function PalaceCell({ p, chart }: { p: QimenPalace; chart: QimenChart }) {
  const isZhiFu = p.palace === chart.zhiFuPalace;
  const isZhiShi = p.palace === chart.zhiShiPalace;
  const isCenter = p.palace === '中';
  const doorColor = p.door ? DOOR_TONE[p.door] ?? '#a99c84' : '#6f6453';

  return (
    <div
      className={
        'relative flex flex-col items-center justify-between gap-0.5 p-2 border min-h-[112px] ' +
        (isCenter ? 'border-gold bg-[rgba(201,169,106,0.1)] ' : 'border-line bg-panel/30 ') +
        (isZhiFu || isZhiShi ? 'ring-1 ring-inset ring-gold' : '')
      }
    >
      {/* 顶部：宫名 + 方位 + 标记 */}
      <div className="w-full flex items-start justify-between gap-1">
        <span className="text-[10px] text-fg-faint leading-none">{p.direction}</span>
        <span className="font-brush text-[15px] text-gold-bright leading-none">{p.palace}</span>
        <span className="w-[10px] leading-none">
          {isZhiFu && <span className="text-[9px] text-gold">符</span>}
          {isZhiShi && <span className="text-[9px] text-vermilion">使</span>}
        </span>
      </div>

      {/* 中宫 */}
      {isCenter ? (
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="font-serif text-[12px] text-gold">{p.star}</span>
          <span className="text-[10px] text-fg-faint leading-tight">
            寄{chart.tianQinPalace}宫
            <br />
            八门八神不居中
          </span>
        </div>
      ) : (
        <>
          {/* 九星 · 八门 · 八神 */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-serif text-[13px] text-gold-bright leading-none">{p.star}</span>
            <span className="font-medium text-[12px] leading-none" style={{ color: doorColor }}>
              {p.door}
            </span>
            <span className="text-[10px] text-fg-dim leading-none">{p.god}</span>
          </div>
          {/* 地盘 / 天盘 */}
          <div className="w-full flex items-center justify-center gap-1.5 text-[10px] leading-none">
            <span className="text-fg-faint">
              地<span className="text-fg-dim ml-0.5">{p.diPan}</span>
            </span>
            <span className="text-gold-dim">/</span>
            <span className="text-fg-faint">
              天<span className="text-gold ml-0.5">{p.tianPan}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function QimenPanel({ chart }: { chart: QimenChart }) {
  // palaces 顺序为 巽離坤震中兌艮坎乾，正好对应 3×3 洛书布局
  const rows: QimenPalace[][] = [chart.palaces.slice(0, 3), chart.palaces.slice(3, 6), chart.palaces.slice(6, 9)];

  return (
    <div className="bg-gradient-to-b from-[rgba(43,35,24,0.7)] to-[rgba(28,23,17,0.7)] border border-gold-dim rounded-card p-[14px] shadow-[inset_0_0_30px_rgba(201,169,106,0.05)]">
      {/* 头部 */}
      <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">奇门遁甲</span>
        <span className="text-fg-dim text-[13px]">
          {chart.yinYang}遁{chart.juShu}局
        </span>
        <span className="text-fg-dim text-[13px]">{chart.jieQiName}</span>
        <span className="ml-auto text-[11px] text-fg-faint">
          {chart.solarText} · {chart.fourPillars}
        </span>
      </div>

      {/* 旬首 / 符首 / 值符 / 值使 */}
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[12px] mb-3">
        <span className="text-fg-dim">
          <span className="text-fg-faint">旬首</span> {chart.xunShou}
        </span>
        <span className="text-fg-dim">
          <span className="text-fg-faint">符首</span> {chart.fuShou}
        </span>
        <span>
          <span className="text-fg-faint">值符</span> <span className="text-gold-bright">{chart.zhiFu}</span>
          <span className="text-fg-faint">（{chart.zhiFuPalace}宫）</span>
        </span>
        <span>
          <span className="text-fg-faint">值使</span> <span className="text-vermilion">{chart.zhiShi}</span>
          <span className="text-fg-faint">（{chart.zhiShiPalace}宫）</span>
        </span>
      </div>

      {/* 九宫盘 */}
      <div className="border border-gold-dim rounded-lg overflow-hidden">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3">
            {row.map((p) => (
              <PalaceCell key={p.index} p={p} chart={chart} />
            ))}
          </div>
        ))}
      </div>

      {/* 孤虚 */}
      {chart.kongWang.day && (
        <div className="mt-3 text-[12px] text-fg-dim">
          <span className="text-fg-faint">日柱孤虚</span>
          <span className="ml-2">{chart.kongWang.day}</span>
        </div>
      )}

      {/* 图例 */}
      <div className="mt-2.5 text-[10px] text-fg-faint leading-relaxed">
        每宫五层：九星 · 八门 · 八神 · 地盘干 / 天盘干。「符」标值符落宫、「使」标值使落宫。
      </div>
    </div>
  );
}
