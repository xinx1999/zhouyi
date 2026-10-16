import { useState } from 'react';
import type { TarotInput, TarotSpread } from '../types';

interface Props {
  onClose: () => void;
  onSubmit: (input: TarotInput) => void;
}

const SPREADS: { key: TarotSpread; name: string; count: number; desc: string }[] = [
  { key: 'single', name: '单牌占卜', count: 1, desc: '一张牌看当下指引' },
  { key: 'three-time', name: '三牌阵 · 时间流', count: 3, desc: '过去 · 现在 · 未来' },
  { key: 'love', name: '爱情牌阵', count: 5, desc: '双方状态与关系走向' },
  { key: 'yesno', name: '是否牌阵', count: 3, desc: '正面 · 负面 · 综合结论' },
  { key: 'celtic', name: '凯尔特十字', count: 10, desc: '最完整的经典牌阵' },
];

export function TarotModal({ onClose, onSubmit }: Props) {
  const [question, setQuestion] = useState('');
  const [spread, setSpread] = useState<TarotSpread>('three-time');

  const chosen = SPREADS.find((s) => s.key === spread);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-[rgba(10,8,6,0.66)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-line">
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">塔罗占卜</h3>
          <button
            className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-[18px] flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim">
            所问之事（可选）
            <input
              className="field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="如：这段关系会走向何方？"
              maxLength={40}
            />
          </label>

          <div className="flex flex-col gap-1.5 text-[13px] text-fg-dim">
            选择牌阵
            <div className="grid grid-cols-2 gap-2.5">
              {SPREADS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={
                    'flex flex-col items-start gap-0.5 text-left rounded-xl p-3 border transition ' +
                    (spread === s.key
                      ? 'border-gold bg-gold-dim/25'
                      : 'border-gold-dim bg-panel-2/40 hover:border-gold')
                  }
                  onClick={() => setSpread(s.key)}
                >
                  <span className="font-serif text-[14px] text-gold-bright">{s.name}</span>
                  <span className="text-[11px] text-fg-dim">{s.desc}</span>
                  <span className="text-[10px] text-fg-faint">{s.count} 张</span>
                </button>
              ))}
            </div>
          </div>

          <p className="modal-hint">
            牌面由系统从 78 张塔罗中随机抽定（不重复），正逆位亦随机。抽牌结果可复现——
            同一问题配同一 seed 会得到同一副牌。
          </p>
        </div>

        <div className="flex justify-end gap-2.5 px-[18px] py-3.5 border-t border-line">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSubmit({ spread, question: question.trim() || undefined })
            }
          >
            抽牌
          </button>
        </div>
      </div>
    </div>
  );
}
