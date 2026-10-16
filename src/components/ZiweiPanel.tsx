import type { ZiweiChart, ZiweiPalace, ZiweiStar } from '../types';

// 十二宫的传统盘面位置（4×4 格，中宫放基本信息）
const ZHI_POS: Record<string, [number, number]> = {
  巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4],
  辰: [2, 1], 酉: [2, 4],
  卯: [3, 1], 戌: [3, 4],
  寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4],
};

// 四化配色：禄绿 · 权蓝 · 科金 · 忌红
const MUTAGEN_COLOR: Record<string, string> = {
  禄: '#3f7d5a',
  权: '#4a7ba7',
  科: '#c9a96a',
  忌: '#c0392b',
};

function StarLine({ stars, empty = '' }: { stars: ZiweiStar[]; empty?: string }) {
  if (!stars.length) return empty ? <span className="text-[10px] text-fg-faint">{empty}</span> : null;
  return (
    <div className="flex flex-wrap gap-x-1.5 justify-center leading-tight">
      {stars.map((s, i) => (
        <span key={i} className="text-[11px] whitespace-nowrap">
          <span className="text-fg">{s.name}</span>
          {s.brightness && <span className="text-fg-faint text-[10px]">{s.brightness}</span>}
          {s.mutagen && (
            <span className="font-medium" style={{ color: MUTAGEN_COLOR[s.mutagen] }}>
              化{s.mutagen}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function PalaceCell({ p }: { p: ZiweiPalace }) {
  const pos = ZHI_POS[p.earthlyBranch] ?? [1, 1];
  return (
    <div
      className={
        'flex flex-col items-center justify-between p-1.5 border border-line min-h-[104px] ' +
        (p.name === '命宫' ? 'bg-[rgba(201,169,106,0.12)] ' : 'bg-panel/30 ') +
        (p.isBodyPalace ? 'ring-1 ring-inset ring-[rgba(192,57,43,0.45)]' : '')
      }
      style={{ gridRow: pos[0], gridColumn: pos[1] }}
    >
      <div className="w-full flex items-start justify-between gap-1">
        <span className="text-[10px] text-fg-faint leading-none">
          {p.decadal.range[1] > 0 ? `${p.decadal.range[0]}-${p.decadal.range[1]}` : ''}
        </span>
        <span className="text-[12px] text-gold-bright leading-none whitespace-nowrap">
          {p.name}
          {p.isBodyPalace && <span className="text-[9px] text-vermilion ml-0.5">身</span>}
          {p.isOriginalPalace && <span className="text-[9px] text-gold ml-0.5">来因</span>}
        </span>
      </div>

      <div className="flex flex-col items-center gap-0.5 my-1">
        <StarLine stars={p.majorStars} empty="空宫" />
        <StarLine stars={p.minorStars} />
      </div>

      <div className="w-full flex items-center justify-between text-[10px] text-fg-faint leading-none">
        <span>{p.changsheng12}</span>
        <span className="text-gold-dim">{p.ganZhi}</span>
      </div>
    </div>
  );
}

export function ZiweiPanel({ chart }: { chart: ZiweiChart }) {
  return (
    <div className="bg-gradient-to-b from-[rgba(43,35,24,0.7)] to-[rgba(28,23,17,0.7)] border border-gold-dim rounded-card p-[14px] shadow-[inset_0_0_30px_rgba(201,169,106,0.05)]">
      {/* 头部 */}
      <div className="flex items-baseline gap-2.5 mb-2.5 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">紫微斗数</span>
        {chart.name && <span className="text-fg-dim text-[13px]">{chart.name}</span>}
        <span className="text-fg-dim text-[13px]">{chart.gender === 'male' ? '乾造（男）' : '坤造（女）'}</span>
        <span className="ml-auto text-[11px] text-fg-faint">
          {chart.solarDate} · {chart.lunarDate} · {chart.timeRange}
        </span>
      </div>

      {/* 盘面：4×4，中宫放基本信息 */}
      <div className="overflow-x-auto no-scrollbar">
        <div
          className="grid gap-0 min-w-[560px]"
          style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gridTemplateRows: 'repeat(4, auto)' }}
        >
          {chart.palaces.map((p) => (
            <PalaceCell key={p.index} p={p} />
          ))}

          {/* 中宫 */}
          <div
            className="flex flex-col items-center justify-center gap-1.5 p-2 border border-line bg-[rgba(20,17,13,0.5)]"
            style={{ gridRow: '2 / 4', gridColumn: '2 / 4' }}
          >
            <div className="font-brush text-[19px] text-gold-bright tracking-[2px]">命盘</div>
            <div className="text-[11px] text-fg-dim text-center leading-relaxed">
              <div>
                命主 <span className="text-gold-bright">{chart.soul}</span> · 身主{' '}
                <span className="text-gold-bright">{chart.body}</span>
              </div>
              <div className="mt-0.5">{chart.fiveElementsClass}</div>
              <div className="mt-0.5 text-fg-faint">
                {chart.zodiac} · {chart.sign}
              </div>
              <div className="mt-1 text-fg-faint text-[10px]">四柱 {chart.chineseDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 四化汇总 */}
      {(() => {
        const hua: string[] = [];
        for (const p of chart.palaces) {
          for (const s of [...p.majorStars, ...p.minorStars]) {
            if (s.mutagen) hua.push(`${s.name}化${s.mutagen}（${p.name}）`);
          }
        }
        if (!hua.length) return null;
        return (
          <div className="mt-3 flex items-start gap-2 text-[12px]">
            <span className="flex-none text-fg-faint">四化</span>
            <div className="flex flex-wrap gap-1.5">
              {hua.map((h, i) => {
                const m = h.match(/化(禄|权|科|忌)/);
                const c = m ? MUTAGEN_COLOR[m[1]] : '#c9a96a';
                return (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-[11px] border"
                    style={{ color: c, borderColor: c + '80', background: c + '14' }}
                  >
                    {h}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
