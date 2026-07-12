import type { LingQian } from '../content';

interface Props {
  sign: LingQian;
  levelColor: string;
}

const TIPS: { key: keyof LingQian['tips']; seal: string; label: string }[] = [
  { key: '事业', seal: '事', label: '事业' },
  { key: '姻缘', seal: '姻', label: '姻缘' },
  { key: '求财', seal: '财', label: '求财' },
];

// 等级 → 朱印断语（取去「签」字后的前两字，如 上上签 → 上上）
function levelSeal(level: string): string {
  return level.replace('签', '').slice(0, 2);
}

// 灵签详情（纯展示）。外层容器样式由调用方决定（灵签结果卡 / 首页内联 / 详情弹窗）。
export function LingQianDetail({ sign, levelColor }: Props) {
  return (
    <div className="flex flex-col">
      {/* 顶部：签号 + 等级 + 朱印断语 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="font-serif text-[14px] text-fg-dim tracking-wide">第 {sign.num} 签</span>
          <span
            className="px-2.5 py-0.5 rounded-full text-[12px] font-serif tracking-[2px]"
            style={{ color: levelColor, background: `${levelColor}1f`, border: `1px solid ${levelColor}66` }}
          >
            {sign.level}
          </span>
        </div>
        <span
          className="font-brush text-[15px] text-[#fbe9d6] flex items-center justify-center rounded-[6px]"
          style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg,#b8554a,#8f3a32)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), 0 2px 6px rgba(143,58,50,0.4)',
            border: '1px solid rgba(255,233,214,0.35)',
            letterSpacing: 1,
          }}
        >
          {levelSeal(sign.level)}
        </span>
      </div>

      {/* 签名：毛笔大标题，两侧金线 */}
      <div className="flex items-center gap-3 mb-5">
        <span className="flex-1 h-px bg-gradient-to-r from-transparent to-gold-dim" />
        <span className="font-brush text-[28px] text-gold-bright tracking-[4px] whitespace-nowrap">
          「{sign.name}」
        </span>
        <span className="flex-1 h-px bg-gradient-to-l from-transparent to-gold-dim" />
      </div>

      {/* 签诗：仿签纸卡（右上角「签诗」朱题） */}
      <div
        className="relative rounded-xl mb-4 px-5 py-5 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(245,235,214,0.07), rgba(201,169,106,0.05))',
          border: '1px solid rgba(201,169,106,0.4)',
          boxShadow: 'inset 0 0 0 3px rgba(201,169,106,0.08)',
        }}
      >
        <span className="absolute left-3 top-3 font-brush text-[12px] text-gold-dim tracking-[3px]">
          签诗
        </span>
        <div className="font-serif text-[17px] leading-[2.3] text-gold-bright tracking-wide mt-2">
          {sign.poem.map((line, i) => (
            <p key={i} className="m-0">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* 解曰 */}
      <div
        className="rounded-xl p-4 mb-4 text-left"
        style={{ background: 'rgba(32,28,22,0.5)', border: '1px solid rgba(201,169,106,0.22)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1 h-4 rounded bg-gold" />
          <span className="font-brush text-[16px] text-gold-bright tracking-[2px]">解曰</span>
        </div>
        <p className="m-0 text-[14.5px] leading-[1.95] text-fg">{sign.interpret}</p>
      </div>

      {/* 分项指引：三枚印章卡（事业 / 姻缘 / 求财） */}
      <div className="grid grid-cols-3 gap-2.5">
        {TIPS.map((t) => (
          <div
            key={t.key}
            className="rounded-xl p-[12px] text-center"
            style={{
              background: 'rgba(32,28,22,0.5)',
              border: '1px solid rgba(201,169,106,0.22)',
              borderTop: '2px solid rgba(201,169,106,0.45)',
            }}
          >
            <span
              className="inline-flex items-center justify-center font-brush text-[13px] text-[#fbe9d6] rounded-md mb-2"
              style={{
                width: 26,
                height: 26,
                background: 'linear-gradient(135deg,#b8554a,#8f3a32)',
                border: '1px solid rgba(255,233,214,0.3)',
              }}
            >
              {t.seal}
            </span>
            <div className="font-brush text-[14px] text-gold tracking-wide mb-1">{t.label}</div>
            <p className="m-0 text-[12px] leading-[1.6] text-fg">{sign.tips[t.key]}</p>
          </div>
        ))}
      </div>

      {/* 收尾装饰 */}
      <div className="text-center font-serif text-[12px] text-fg-faint tracking-[3px] mt-5">
        心诚则灵 · 善易者不卜
      </div>
    </div>
  );
}
