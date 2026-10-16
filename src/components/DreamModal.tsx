import { useState } from 'react';
import type { DreamInput } from '../types';

interface Props {
  onClose: () => void;
  onSubmit: (input: DreamInput) => void;
}

// 常见梦境示例（点击可填入，降低「不知道怎么写」的门槛）
const EXAMPLES = [
  '梦见一条大蛇追我，我跑不动',
  '梦见牙齿一颗颗掉了',
  '梦见发大水，我爬到山上',
  '梦见捡到很多钱',
  '梦见和去世的亲人说话',
];

export function DreamModal({ onClose, onSubmit }: Props) {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-[rgba(10,8,6,0.66)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-line">
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">周公解梦</h3>
          <button
            className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-[18px] flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim">
            描述你的梦（越具体越准）
            <textarea
              className="field min-h-[110px] resize-y leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="如：梦见一条大蛇追我，我拼命跑却跑不动，后来掉进了水里……"
              maxLength={500}
            />
          </label>

          <div className="flex flex-col gap-1.5 text-[13px] text-fg-dim">
            不知道怎么写？试试这些
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="btn btn-ghost btn-sm text-[12px]"
                  onClick={() => setText(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <p className="modal-hint">
            系统会从 286 个传统意象中检索你梦中出现的事物，再依民俗解梦之法综合解读。
            吉凶倾向为传统说法，供文化参考，非预言。
          </p>
        </div>

        <div className="flex justify-end gap-2.5 px-[18px] py-3.5 border-t border-line">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            disabled={!trimmed}
            onClick={() => trimmed && onSubmit({ dreamText: trimmed })}
          >
            解梦
          </button>
        </div>
      </div>
    </div>
  );
}
