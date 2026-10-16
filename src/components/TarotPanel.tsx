import type { TarotResult } from '../types';

// 牌组配色
const SUIT_COLOR: Record<string, string> = {
  权杖: '#c0392b',
  圣杯: '#4a7ba7',
  宝剑: '#a99c84',
  星币: '#3f7d5a',
};

export function TarotPanel({ result }: { result: TarotResult }) {
  return (
    <div className="bg-gradient-to-b from-[rgba(43,35,24,0.7)] to-[rgba(28,23,17,0.7)] border border-gold-dim rounded-card p-[14px] shadow-[inset_0_0_30px_rgba(201,169,106,0.05)]">
      {/* 头部 */}
      <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">塔罗占卜</span>
        <span className="text-fg-dim text-[13px]">{result.spreadName}</span>
        {result.question && <span className="text-fg-dim text-[13px]">「{result.question}」</span>}
        <span className="ml-auto text-[11px] text-fg-faint">{result.cards.length} 张</span>
      </div>

      {/* 牌面 */}
      <div className="flex flex-wrap gap-2.5">
        {result.cards.map((c, i) => {
          const suitColor = c.suit ? SUIT_COLOR[c.suit] : '#c9a96a';
          return (
            <div
              key={c.id + '-' + i}
              className="flex-none w-[132px] rounded-lg border border-gold-dim bg-panel-2/50 p-2.5 flex flex-col items-center gap-1.5"
            >
              <div className="text-[11px] text-fg-faint leading-none">{c.positionLabel}</div>

              {/* 牌面（逆位旋转） */}
              <div
                className="w-full rounded-md border py-2.5 flex items-center justify-center"
                style={{
                  borderColor: suitColor + '70',
                  background: `linear-gradient(160deg, ${suitColor}22, rgba(20,17,13,0.4))`,
                  transform: c.reversed ? 'rotate(180deg)' : undefined,
                }}
              >
                <span className="font-brush text-[15px] text-gold-bright text-center leading-tight px-1">
                  {c.name}
                </span>
              </div>

              <span
                className="text-[11px] px-2 py-0.5 rounded-full border"
                style={{
                  color: c.reversed ? '#c0392b' : '#3f7d5a',
                  borderColor: (c.reversed ? '#c0392b' : '#3f7d5a') + '80',
                  background: (c.reversed ? '#c0392b' : '#3f7d5a') + '14',
                }}
              >
                {c.reversed ? '逆位' : '正位'}
              </span>

              <div className="text-[11px] text-fg-dim leading-snug text-center">{c.keywords}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
