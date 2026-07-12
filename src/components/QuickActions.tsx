import type { CastRequest } from '../types';
import type { CastType } from './CastModal';
import { CAST_META, type CastMethodKey } from '../castCategories';

export interface CastPreset {
  label: string; // 按钮显示文案（显式，不再用 message 推断）
  message: string;
  cast: CastRequest;
}

// 一键占卜：点下去立即起卦并发送（均为铜钱法，区别在问句模板）
const PRESETS: CastPreset[] = [
  { label: '随机起卦', message: '请为我随机起一卦，开示当下迷津。', cast: { method: 'coin' } },
  { label: '问事业', message: '我想问问近期的学业与事业前程。', cast: { method: 'coin' } },
  { label: '问感情', message: '我想问问近期的感情与姻缘。', cast: { method: 'coin' } },
  { label: '问健康', message: '我想问问自身的身心安康。', cast: { method: 'coin' } },
];

// 自定义起卦：覆盖全部 9 种，点开 CastModal 再填（对话区也能进声音/报数/纳甲/揲蓍）
const ALL_METHODS: CastMethodKey[] = [
  'coin',
  'number',
  'person',
  'time',
  'char',
  'direction',
  'sound',
  'report',
  'najia',
  'yarrow',
];

interface Props {
  onPick: (p: CastPreset) => void;
  onOpenCast: (type: CastType) => void;
}

export function QuickActions({ onPick, onOpenCast }: Props) {
  // 对话空态：分组展示「一键占卜」与「自定义起卦」，交互模式一目了然
  return (
    <div className="text-center">
      <div className="text-fg-dim text-[13px] tracking-[2px] mb-3">— 心有所惑，择一而起 —</div>

      <div className="text-left text-fg-faint text-[12px] tracking-[1px] mb-1.5 pl-0.5">
        一键占卜
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-w-[520px] mx-auto">
        {PRESETS.map((p) => (
          <button key={p.label} className="qa-btn" onClick={() => onPick(p)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="text-left text-fg-faint text-[12px] tracking-[1px] mt-3 mb-1.5 pl-0.5">
        自定义起卦（九法皆可）
      </div>
      <div className="grid grid-cols-3 gap-2.5 max-w-[520px] mx-auto">
        {ALL_METHODS.map((m) => (
          <button key={m} className="qa-btn" onClick={() => onOpenCast(m)}>
            {CAST_META[m].title}
          </button>
        ))}
      </div>
    </div>
  );
}
