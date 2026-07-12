import { useState } from 'react';
import type { YarrowYao } from '../types';

const POS = ['初', '二', '三', '四', '五', '上'];

function yaoTag(value: number): string {
  if (value === 9) return '老阳 ○';
  if (value === 8) return '少阴 --';
  if (value === 7) return '少阳 —';
  return '老阴 ×';
}

export function YarrowSteps({ steps }: { steps: YarrowYao[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3.5">
      <button
        className="w-full flex items-center justify-between px-3.5 py-2.5 border border-gold-dim rounded-xl bg-gold-dim/20 text-gold-bright font-serif text-[14px] cursor-pointer transition hover:border-gold hover:bg-gold-dim/30"
        onClick={() => setOpen((v) => !v)}
      >
        <span>十八变演算详情</span>
        <span className="text-xs text-fg-dim">{open ? '收起 ▲' : '展开 ▼'}</span>
      </button>
      {open && (
        <div className="mt-2.5 p-3.5 border border-line rounded-xl bg-black/10">
          <p className="m-0 mb-3 text-xs text-fg-faint leading-relaxed">
            大衍之数五十，其用四十有九。每爻经「分二·挂一·揲四·归奇」三变而成，六爻共十八变。
          </p>
          {steps.map((yao) => (
            <div
              key={yao.pos}
              className={
                'p-3 mb-2 border border-line rounded-lg bg-gold-dim/10 ' +
                (yao.value === 6 || yao.value === 9 ? ' border-gold-dim bg-[rgba(192,57,43,0.08)]' : '')
              }
            >
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-[14px] text-gold-bright font-medium">第{POS[yao.pos - 1]}爻</span>
                <span className="text-xs text-fg">
                  三变余 {yao.total} 策 ÷4 = {yao.count} · {yaoTag(yao.value)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {yao.steps.map((s) => (
                  <div key={s.bian} className="flex items-baseline gap-2 text-xs leading-[1.5]">
                    <span className="flex-none w-[34px] text-gold">
                      {['一', '二', '三'][s.bian - 1]}变
                    </span>
                    <span className="text-fg-dim">
                      {s.before} 策 → 分二({s.left}/{s.right}) · 挂一 · 揲四归奇(余{s.remL}+{s.remR}) →
                      去 {s.removed}，余 <b className="text-gold-bright font-semibold">{s.after}</b>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
