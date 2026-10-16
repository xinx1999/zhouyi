import type { HepanResult, BaziChart } from '../types';

// 合盘结果展示：双人命盘对照 + 各维度比对 + 加权参考分

const GRADE_STYLE: Record<string, string> = {
  上佳: 'text-jade border-jade/50 bg-jade/10',
  良好: 'text-jade border-jade/40 bg-jade/10',
  中等: 'text-gold-bright border-gold-dim/60 bg-gold-dim/20',
  需磨合: 'text-vermilion border-vermilion/40 bg-vermilion/10',
  宜慎: 'text-vermilion border-vermilion/50 bg-vermilion/10',
};

// 子分对应的条形颜色
function barColor(score: number): string {
  if (score >= 75) return 'bg-jade';
  if (score >= 60) return 'bg-gold';
  return 'bg-vermilion';
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden flex-none w-[64px]">
      <div className={`h-full rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
    </div>
  );
}

// 单人四柱速览
function PillarRow({ chart, label }: { chart: BaziChart; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] flex-wrap">
      <span className="text-fg-dim w-[34px] flex-none">{label}</span>
      <span className="font-serif text-gold-bright">{chart.name || '—'}</span>
      <span className="text-fg-faint">{chart.solarText}</span>
      <span className="text-fg">{chart.pillars.map((p) => p.ganZhi).join(' ')}</span>
      <span className="text-fg-dim">
        日主 {chart.dayMaster}
        {chart.dayMasterElement}
      </span>
    </div>
  );
}

export function HepanPanel({ result }: { result: HepanResult }) {
  const { personA, personB, aspects, totalScore, grade, gradeDesc, wuXingComplement, naYinNote } = result;
  const gradeCls = GRADE_STYLE[grade] ?? GRADE_STYLE['中等'];

  return (
    <div className="flex flex-col gap-3">
      {/* 标题 */}
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">合盘</span>
        <span className="text-[12px] text-fg-faint">双方八字比对（传统合婚法）</span>
      </div>

      {/* 参考分 */}
      <div className="bg-panel-2/40 border border-gold-dim/40 rounded-lg p-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="font-brush text-[34px] leading-none text-gold-bright">{totalScore}</span>
          <span className="text-[12px] text-fg-dim">/ 100</span>
        </div>
        <span className={`text-[13px] px-2 py-0.5 rounded border ${gradeCls}`}>{grade}</span>
        <span className="text-[12.5px] text-fg-dim flex-1 min-w-[200px] leading-relaxed">{gradeDesc}</span>
      </div>

      {/* 双方四柱 */}
      <div className="bg-panel-2/40 border border-gold-dim/40 rounded-lg p-3 flex flex-col gap-2">
        <div className="text-[12px] text-fg-dim mb-0.5">双方命盘</div>
        <PillarRow chart={personA} label="甲方" />
        <PillarRow chart={personB} label="乙方" />
      </div>

      {/* 各维度比对 */}
      <div className="flex flex-col gap-2">
        {aspects.map((a) => (
          <div key={a.key} className="bg-panel-2/40 border border-gold-dim/40 rounded-lg p-3">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <span className="font-serif text-[14px] text-gold-bright">{a.label}</span>
              <span className="text-[11px] text-fg-faint">权重 {Math.round(a.weight * 100)}%</span>
              <span className="ml-auto flex items-center gap-2">
                <ScoreBar score={a.score} />
                <span className={'text-[12px] ' + (a.favorable ? 'text-jade' : 'text-vermilion')}>{a.score}</span>
              </span>
            </div>
            <div className="text-[12.5px] text-fg-dim leading-relaxed">{a.detail}</div>
          </div>
        ))}
      </div>

      {/* 五行互补明细（可折叠） */}
      {wuXingComplement.length > 0 && (
        <details className="hex-notes">
          <summary>五行互补明细（{wuXingComplement.length} 项）</summary>
          <div className="flex flex-col gap-1 mt-2">
            {wuXingComplement.map((l, i) => (
              <div key={i} className="text-[12px] text-fg-dim leading-relaxed">
                · {l}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 纳音旁参 */}
      {naYinNote && <div className="text-[12px] text-fg-faint leading-relaxed">{naYinNote}</div>}

      <div className="text-[11px] text-fg-faint leading-relaxed">
        注：合婚分数与吉凶倾向为传统命理说法，供文化参考，非定论；相处经营才是根本。
      </div>
    </div>
  );
}
