import type { DreamResult, DreamOmen } from '../types';

// 解梦结果展示：命中意象卡片（名称 / 分类 / 传统倾向 / 释义）

const OMEN_STYLE: Record<DreamOmen, { cls: string; label: string }> = {
  吉: { cls: 'text-jade border-jade/40 bg-jade/10', label: '传统主吉' },
  凶: { cls: 'text-vermilion border-vermilion/40 bg-vermilion/10', label: '传统主凶' },
  中: { cls: 'text-fg-dim border-gold-dim/50 bg-panel-2/50', label: '吉凶参半' },
};

function OmenBadge({ omen }: { omen: DreamOmen }) {
  const s = OMEN_STYLE[omen] ?? OMEN_STYLE['中'];
  return (
    <span className={`flex-none text-[11px] px-1.5 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
  );
}

export function DreamPanel({ result }: { result: DreamResult }) {
  const { hits, unmatched, dreamText } = result;

  return (
    <div className="flex flex-col gap-3">
      {/* 标题 */}
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">周公解梦</span>
        <span className="text-[12px] text-fg-faint">
          {unmatched ? '未匹配到明确意象' : `命中 ${hits.length} 个传统意象`}
        </span>
      </div>

      {/* 梦境原文回显 */}
      {dreamText && (
        <div className="bg-panel-2/30 border border-gold-dim/30 rounded-lg p-2.5">
          <div className="text-[11px] text-fg-faint mb-1">所梦</div>
          <div className="text-[13px] text-fg leading-relaxed whitespace-pre-wrap">{dreamText}</div>
        </div>
      )}

      {/* 命中意象 */}
      {hits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {hits.map((h) => (
            <div
              key={h.id}
              className="bg-panel-2/40 border border-gold-dim/40 rounded-lg p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif text-gold-bright text-[15px]">{h.name}</span>
                <span className="text-[11px] text-fg-faint">{h.category}</span>
                <span className="ml-auto">
                  <OmenBadge omen={h.omen} />
                </span>
              </div>
              <div className="text-[12.5px] text-fg-dim leading-relaxed">{h.meaning}</div>
              <div className="text-[11px] text-fg-faint">梦中出现「{h.matchedKeyword}」</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-panel-2/30 border border-gold-dim/30 rounded-lg p-3 text-[13px] text-fg-dim leading-relaxed">
          词库中未匹配到明确意象。梦往往以整体情境与情绪为主，请看下文的通解。
        </div>
      )}

      <div className="text-[11px] text-fg-faint leading-relaxed">
        注：吉凶倾向为传统民俗说法，供文化参考，非预言。
      </div>
    </div>
  );
}
