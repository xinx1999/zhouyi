import type { BaziChart } from '../types';

// 五行配色
const WUXING_COLOR: Record<string, string> = {
  金: '#d4af37',
  木: '#3f7d5a',
  水: '#4a7ba7',
  火: '#c0392b',
  土: '#a9825a',
};

const LABEL_CLS = 'text-[11px] text-fg-faint flex items-center justify-end pr-1.5';
const CELL_CLS = 'text-[12px] text-fg-dim py-[3px] leading-snug';

export function BaziPanel({ chart }: { chart: BaziChart }) {
  const missing = new Set(chart.wuXingMissing);

  return (
    <div className="bg-gradient-to-b from-[rgba(43,35,24,0.7)] to-[rgba(28,23,17,0.7)] border border-gold-dim rounded-card p-[14px] shadow-[inset_0_0_30px_rgba(201,169,106,0.05)]">
      {/* 头部 */}
      <div className="flex items-baseline gap-2.5 mb-2.5 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">八字命盘</span>
        {chart.name && <span className="text-fg-dim text-[13px]">{chart.name}</span>}
        <span className="text-fg-dim text-[13px]">{chart.gender === 'male' ? '乾造（男）' : '坤造（女）'}</span>
        <span className="ml-auto text-[11px] text-fg-faint">
          公历 {chart.solarText} · 农历 {chart.lunarText}
        </span>
      </div>

      {/* 日主 */}
      <div className="flex items-center gap-2 mb-3 text-[13px]">
        <span className="text-fg-faint">日主</span>
        <span
          className="font-brush text-[20px] leading-none"
          style={{ color: WUXING_COLOR[chart.dayMasterElement] }}
        >
          {chart.dayMaster}
        </span>
        <span className="text-fg-dim">{chart.dayMasterElement}命</span>
        <span className="text-fg-faint ml-2">起运 {chart.startYunText}</span>
      </div>

      {/* 四柱盘 */}
      <div className="border border-line rounded-lg overflow-hidden bg-panel/40">
        <div className="grid grid-cols-[46px_repeat(4,1fr)]">
          {/* 表头 */}
          <div className="bg-gold-dim/25" />
          {chart.pillars.map((p) => (
            <div
              key={p.label}
              className="bg-gold-dim/25 text-center text-[12px] text-gold-bright py-1.5 border-l border-line tracking-[1px]"
            >
              {p.label}柱
            </div>
          ))}

          {/* 十神（天干） */}
          <div className={LABEL_CLS}>十神</div>
          {chart.pillars.map((p) => (
            <div key={p.label} className={CELL_CLS + ' text-center border-l border-line'}>
              <span className={p.shiShenGan === '日主' ? 'text-gold-bright' : ''}>{p.shiShenGan}</span>
            </div>
          ))}

          {/* 天干 */}
          <div className={LABEL_CLS}>天干</div>
          {chart.pillars.map((p) => (
            <div key={p.label} className="text-center border-l border-line py-1.5">
              <span
                className="font-brush text-[26px] leading-none"
                style={{ color: WUXING_COLOR[p.ganElement] }}
              >
                {p.gan}
              </span>
            </div>
          ))}

          {/* 地支 */}
          <div className={LABEL_CLS}>地支</div>
          {chart.pillars.map((p) => (
            <div key={p.label} className="text-center border-l border-line py-1.5">
              <span
                className="font-brush text-[26px] leading-none"
                style={{ color: WUXING_COLOR[p.zhiElement] }}
              >
                {p.zhi}
              </span>
            </div>
          ))}

          {/* 藏干 + 十神 */}
          <div className={LABEL_CLS}>藏干</div>
          {chart.pillars.map((p) => (
            <div key={p.label} className={CELL_CLS + ' text-center border-l border-line'}>
              <div>{p.hideGan.join(' ')}</div>
              <div className="text-[10px] text-fg-faint">{p.shiShenZhi.join(' ')}</div>
            </div>
          ))}

          {/* 纳音 */}
          <div className={LABEL_CLS}>纳音</div>
          {chart.pillars.map((p) => (
            <div key={p.label} className={CELL_CLS + ' text-center border-l border-line'}>
              {p.naYin}
            </div>
          ))}

          {/* 十二长生 */}
          <div className={LABEL_CLS}>长生</div>
          {chart.pillars.map((p) => (
            <div key={p.label} className={CELL_CLS + ' text-center border-l border-line'}>
              {p.diShi}
            </div>
          ))}

          {/* 旬空 */}
          <div className={LABEL_CLS}>旬空</div>
          {chart.pillars.map((p) => (
            <div key={p.label} className={CELL_CLS + ' text-center border-l border-line'}>
              {p.xunKong}
            </div>
          ))}
        </div>
      </div>

      {/* 五行统计 */}
      <div className="mt-3">
        <div className="text-[11px] text-fg-faint tracking-[1px] mb-1.5">五行统计（四柱本气）</div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['金', '木', '水', '火', '土'] as const).map((wx) => {
            const n = chart.wuXingCount[wx] ?? 0;
            const isMissing = missing.has(wx);
            return (
              <div
                key={wx}
                className={
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] ' +
                  (isMissing ? 'border-[rgba(192,57,43,0.45)] bg-[rgba(192,57,43,0.1)]' : 'border-line bg-panel-2/40')
                }
              >
                <span style={{ color: WUXING_COLOR[wx] }} className="font-medium">
                  {wx}
                </span>
                <span className={isMissing ? 'text-vermilion' : 'text-fg'}>{n}</span>
                {isMissing && <span className="text-[10px] text-vermilion">缺</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 神煞 + 干支关系 */}
      {(chart.shenSha.length > 0 || chart.relations.length > 0) && (
        <div className="mt-3 flex flex-col gap-1.5 text-[12px]">
          {chart.shenSha.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="flex-none text-fg-faint">神煞</span>
              <div className="flex flex-wrap gap-1.5">
                {chart.shenSha.map((s) => (
                  <span key={s} className="text-gold bg-gold-dim/20 border border-gold-dim px-2 py-0.5 rounded-full text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {chart.relations.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="flex-none text-fg-faint">关系</span>
              <span className="text-fg-dim">{chart.relations.join('；')}</span>
            </div>
          )}
        </div>
      )}

      {/* 胎元 / 命宫 / 身宫 */}
      <div className="mt-3 pt-2.5 border-t border-line flex items-center gap-4 text-[12px] text-fg-dim flex-wrap">
        <span>
          <span className="text-fg-faint">胎元</span> {chart.taiYuan}
        </span>
        <span>
          <span className="text-fg-faint">命宫</span> {chart.mingGong}
        </span>
        <span>
          <span className="text-fg-faint">身宫</span> {chart.shenGong}
        </span>
      </div>

      {/* 大运 */}
      {chart.daYun.filter((d) => d.ganZhi).length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] text-fg-faint tracking-[1px] mb-1.5">大运</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {chart.daYun
              .filter((d) => d.ganZhi)
              .map((d) => (
                <div
                  key={d.startAge}
                  className="flex-none text-center px-3 py-1.5 border border-gold-dim rounded-lg bg-panel-2/40"
                >
                  <div className="text-[10px] text-fg-faint">{d.startAge}岁</div>
                  <div className="font-brush text-[17px] text-gold-bright leading-tight">{d.ganZhi}</div>
                  <div className="text-[10px] text-fg-faint">{d.startYear}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
