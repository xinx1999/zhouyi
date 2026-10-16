import type { DaliurenChart } from '../types';

// 大六壬课盘展示：天地盘十二神、四课、三传、神煞

// 天将五行属性配色（参考地支三合取色，仅作视觉区分）
const TIANJIANG_COLORS: Record<string, string> = {
  贵人: 'text-jade',
  螣蛇: 'text-vermilion',
  朱雀: 'text-vermilion',
  六合: 'text-jade',
  勾陈: 'text-gold-bright',
  青龙: 'text-jade',
  天空: 'text-fg-dim',
  白虎: 'text-vermilion',
  太常: 'text-gold-bright',
  玄武: 'text-fg-dim',
  太阴: 'text-gold-bright',
  天后: 'text-jade',
};

function TianJiangTag({ name }: { name: string }) {
  const color = TIANJIANG_COLORS[name] || 'text-fg';
  return <span className={`text-[13px] ${color}`}>{name}</span>;
}

// 天地盘：按地支顺序（子→亥）列出，天盘地支+天将
function TianDiPanSection({ chart }: { chart: DaliurenChart }) {
  const zhiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const pinyin: Record<string, string> = {
    子: 'zi', 丑: 'chou', 寅: 'yin', 卯: 'mao', 辰: 'chen', 巳: 'si',
    午: 'wu', 未: 'wei', 申: 'shen', 酉: 'you', 戌: 'xu', 亥: 'hai',
  };
  return (
    <div className="bg-panel-2/40 border border-gold-dim/40 rounded-lg p-3">
      <div className="text-[12px] text-fg-dim mb-2">天地盘（天盘·地盘·天将，自子至亥）</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {zhiOrder.map((zhi) => {
          const key = pinyin[zhi];
          const tianPan = chart.tianDiPan.tianPan[key] ?? '';
          const diPan = chart.tianDiPan.diPan[key] ?? '';
          const tianJiang = chart.tianDiPan.tianJiang[key] ?? '';
          return (
            <div key={zhi} className="flex items-center gap-2 text-[13px] whitespace-nowrap">
              <span className="font-serif text-gold-bright w-4 flex-none">{zhi}</span>
              <span className="text-fg">天{tianPan}</span>
              <span className="text-fg-dim">地{diPan}</span>
              <TianJiangTag name={tianJiang} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 三传：初传·中传·末传（含天将、六亲、遁干）
function SanChuanSection({ chart }: { chart: DaliurenChart }) {
  const { chuChuan, zhongChuan, moChuan, keTi } = chart.sanChuan;
  const rows: { label: string; chuan: typeof chuChuan; hint: string }[] = [
    { label: '初传（发用）', chuan: chuChuan, hint: '事之发起' },
    { label: '中传', chuan: zhongChuan, hint: '事之发展' },
    { label: '末传（归计）', chuan: moChuan, hint: '事之结局' },
  ];
  return (
    <div className="bg-panel-2/40 border border-gold-dim/40 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] text-fg-dim">三传</span>
        <span className="text-[12px] px-1.5 py-0.5 rounded bg-gold-dim/30 text-gold-bright font-serif">
          课体：{keTi}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 flex-wrap text-[13px]">
            <span className="text-fg-dim w-[92px]">{r.label}</span>
            <span className="font-serif text-gold-bright text-[15px]">{r.chuan[0]}</span>
            <TianJiangTag name={r.chuan[1]} />
            {r.chuan[2] && <span className="text-fg-dim">·{r.chuan[2]}</span>}
            {r.chuan[3] && <span className="text-fg-dim">·遁{r.chuan[3]}</span>}
            <span className="text-[11px] text-fg-faint ml-auto">{r.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DaliurenPanel({ chart }: { chart: DaliurenChart }) {
  const info = chart.dateInfo;
  return (
    <div className="flex flex-col gap-3">
      {/* 标题与基本盘局信息 */}
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">大六壬</span>
        <span className="text-fg-dim text-[13px]">{info.date}</span>
        <span className="text-[12px] text-fg-faint">四柱 {info.bazi}</span>
      </div>

      {/* 干支速览条 */}
      <div className="flex items-center gap-3 flex-wrap text-[12px] text-fg-dim">
        <span>月将 <span className="text-gold-bright font-serif">{info.yuejiang}</span></span>
        <span>旬首 <span className="text-gold-bright font-serif">{info.xun}</span></span>
        <span>旬空 <span className="text-gold-bright font-serif">{info.kong.join('、') || '无'}</span></span>
        <span>驿马 <span className="text-gold-bright font-serif">{info.yima}</span></span>
      </div>

      {/* 天地盘 */}
      <TianDiPanSection chart={chart} />

      {/* 四课 */}
      <div className="bg-panel-2/40 border border-gold-dim/40 rounded-lg p-3">
        <div className="text-[12px] text-fg-dim mb-2">四课（自下而上）</div>
        <div className="flex flex-col gap-1.5">
          {[chart.siKe.ke1, chart.siKe.ke2, chart.siKe.ke3, chart.siKe.ke4].map((ke, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]">
              <span className="text-fg-dim w-[64px]">{chart.keTis[i] ?? `第${i + 1}课`}</span>
              <span className="font-serif text-gold-bright text-[15px]">{ke[0]}</span>
              <TianJiangTag name={ke[1]} />
            </div>
          ))}
        </div>
      </div>

      {/* 三传 */}
      <SanChuanSection chart={chart} />

      {/* 神煞（可折叠） */}
      {chart.shenSha.length > 0 && (
        <details className="hex-notes">
          <summary>神煞（{chart.shenSha.length} 项）</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
            {chart.shenSha.map((s) => (
              <div key={s.name} className="text-[12px] leading-snug">
                <span className="text-gold-bright font-serif mr-1.5">{s.name}{s.value}</span>
                <span className="text-fg-faint">{s.description}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
