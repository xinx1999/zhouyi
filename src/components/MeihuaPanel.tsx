import type { MeihuaAnalysis, WangShuai } from '../types';

// 吉凶配色
const OUTCOME_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  吉: { color: '#3f7d5a', bg: 'rgba(63,125,90,0.16)', border: 'rgba(63,125,90,0.5)' },
  平: { color: '#c9a96a', bg: 'rgba(201,169,106,0.16)', border: 'rgba(201,169,106,0.5)' },
  凶: { color: '#c0392b', bg: 'rgba(192,57,43,0.16)', border: 'rgba(192,57,43,0.5)' },
};

// 旺衰配色
const WANG_COLOR: Record<WangShuai, string> = {
  旺: '#3f7d5a',
  相: '#6f9e7d',
  休: '#a99c84',
  囚: '#b8843a',
  死: '#c0392b',
};

function TrigramBox({ label, ref_ }: { label: string; ref_: MeihuaAnalysis['bodyTrigram'] }) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-line bg-panel-2/40 px-3 py-2.5">
      <div className="text-[11px] text-fg-faint tracking-[1px] mb-1">{label}</div>
      <div className="font-brush text-[19px] text-gold-bright leading-none">
        {ref_.name}
        <span className="font-serif text-[13px] text-gold ml-1.5">{ref_.element}</span>
      </div>
      <div className="text-[11px] text-fg-dim mt-1">{ref_.nature}</div>
    </div>
  );
}

export function MeihuaPanel({ data }: { data: MeihuaAnalysis }) {
  const oc = OUTCOME_STYLE[data.judgement.outcome] ?? OUTCOME_STYLE['平'];

  return (
    <div className="mt-3.5 p-4 border border-gold-dim rounded-xl bg-gradient-to-b from-[rgba(201,169,106,0.06)] to-[rgba(192,57,43,0.04)]">
      {/* 头部：标题 + 吉凶 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-[13px] text-gold px-2 py-0.5 rounded-full border border-gold-dim">
          梅花断卦
        </span>
        <span className="text-[15px] text-gold-bright font-medium">体用推演</span>
        <span
          className="ml-auto text-[13px] font-medium px-3 py-0.5 rounded-full"
          style={{ color: oc.color, background: oc.bg, border: `1px solid ${oc.border}` }}
        >
          {data.judgement.outcome}
        </span>
      </div>

      {/* 体用两栏 */}
      <div className="flex items-stretch gap-2.5 mb-3">
        <TrigramBox label="体卦（己方）" ref_={data.bodyTrigram} />
        <div className="flex items-center text-[15px] text-gold px-0.5">⇄</div>
        <TrigramBox label="用卦（事方）" ref_={data.useTrigram} />
      </div>

      {/* 体用生克 */}
      <div
        className="rounded-lg px-3 py-2.5 mb-3 text-center border"
        style={{
          background: data.bodyUseFavorable ? 'rgba(63,125,90,0.1)' : 'rgba(192,57,43,0.08)',
          borderColor: data.bodyUseFavorable ? 'rgba(63,125,90,0.4)' : 'rgba(192,57,43,0.35)',
        }}
      >
        <span className="text-[14px] text-fg">体用关系：</span>
        <span className="font-brush text-[17px] text-gold-bright tracking-wide ml-1">
          {data.bodyUseText}
        </span>
        <span className="text-[12px] text-fg-dim ml-2">
          （{data.bodyUseFavorable ? '利于体' : '不利于体'}）
        </span>
      </div>

      {/* 月令旺衰 */}
      <div className="flex items-center gap-3 text-[12px] text-fg-dim mb-3 flex-wrap">
        <span>月建 {data.seasonalState.monthZhi}</span>
        <span className="text-fg-faint">|</span>
        <span>
          体卦月令
          <b className="ml-1" style={{ color: WANG_COLOR[data.seasonalState.body] }}>
            {data.seasonalState.body}
          </b>
        </span>
        <span>
          用卦月令
          <b className="ml-1" style={{ color: WANG_COLOR[data.seasonalState.use] }}>
            {data.seasonalState.use}
          </b>
        </span>
      </div>

      {/* 阶段推演 */}
      <div className="mb-3">
        <div className="text-[12px] text-fg-faint tracking-[1px] mb-1.5">阶段推演</div>
        <div className="flex flex-col border border-line rounded-lg overflow-hidden">
          {data.stages.map((s) => (
            <div
              key={s.stage}
              className="flex items-center gap-2.5 px-3 py-2 border-b border-line last:border-b-0 text-[12px]"
            >
              <span className="flex-none w-[86px] text-gold-bright">{s.stage}</span>
              <span className="flex-1 min-w-0 text-fg-dim truncate" title={s.text}>
                {s.text}
              </span>
              <span
                className="flex-none px-2 py-0.5 rounded-full text-[11px]"
                style={{
                  color: s.favorable ? '#3f7d5a' : '#c0392b',
                  background: s.favorable ? 'rgba(63,125,90,0.14)' : 'rgba(192,57,43,0.12)',
                }}
              >
                {s.favorable ? '利' : '不利'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 互卦 / 错卦 / 综卦 */}
      <div className="flex items-center gap-2 text-[12px] mb-3 flex-wrap">
        <span className="text-fg-faint">互卦</span>
        <span className="text-fg">
          {data.nuclearHexagram ? `第${data.nuclearHexagram.seq}卦 ${data.nuclearHexagram.name}` : '—'}
        </span>
        <span className="text-fg-faint">·</span>
        <span className="text-fg-faint">错卦</span>
        <span className="text-fg">第{data.oppositeHexagram.seq}卦 {data.oppositeHexagram.name}</span>
        <span className="text-fg-faint">·</span>
        <span className="text-fg-faint">综卦</span>
        <span className="text-fg">第{data.reversedHexagram.seq}卦 {data.reversedHexagram.name}</span>
      </div>

      {/* 应期线索 */}
      {data.timingHints.length > 0 && (
        <div className="text-[12px] text-fg-dim leading-relaxed border-t border-line pt-2.5">
          {data.timingHints.map((h, i) => (
            <div key={i}>· {h}</div>
          ))}
        </div>
      )}
    </div>
  );
}
