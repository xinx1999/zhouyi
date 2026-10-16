import { useState } from 'react';
import type { BirthInput } from '../types';

// ---------- 可复用的出生信息字段（八字 / 紫微 / 合盘共用）----------

export interface BirthValue {
  name: string;
  gender: 'male' | 'female';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export const EMPTY_BIRTH: BirthValue = { name: '', gender: 'male', date: '1990-01-01', time: '12:00' };

// 校验并转成 BirthInput；不合法时返回错误文案
export function birthValueToInput(v: BirthValue): { input: BirthInput } | { error: string } {
  const [y, mo, d] = v.date.split('-').map(Number);
  const [h, mi] = v.time.split(':').map(Number);
  if (!y || !mo || !d || Number.isNaN(h)) return { error: '请填写完整的出生日期与时间' };
  if (y < 1900 || y > 2100) return { error: '年份需在 1900–2100 之间' };
  return {
    input: {
      name: v.name.trim() || undefined,
      gender: v.gender,
      year: y,
      month: mo,
      day: d,
      hour: h,
      minute: Number.isNaN(mi) ? 0 : mi,
    },
  };
}

export function BirthFields({
  value,
  onChange,
  heading,
}: {
  value: BirthValue;
  onChange: (v: BirthValue) => void;
  heading?: string;
}) {
  const set = (patch: Partial<BirthValue>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-3">
      {heading && <div className="text-[13px] text-gold-bright font-serif">{heading}</div>}

      <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim">
        姓名（可选）
        <input
          className="field"
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="如：张三"
          maxLength={20}
        />
      </label>

      <div className="flex flex-col gap-1.5 text-[13px] text-fg-dim">
        性别
        <div className="flex gap-2.5">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={
                'btn btn-ghost btn-sm flex-1 ' +
                (value.gender === g ? 'border-gold bg-gold-dim/30 text-gold-bright' : 'text-fg-dim')
              }
              onClick={() => set({ gender: g })}
            >
              {g === 'male' ? '男' : '女'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
          出生日期（公历）
          <input
            type="date"
            className="bg-ink-2 border border-gold-dim rounded-lg px-3 py-2.5 text-fg font-serif text-[15px] outline-none focus:border-gold"
            value={value.date}
            onChange={(e) => set({ date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim w-[128px]">
          出生时刻
          <input
            type="time"
            className="bg-ink-2 border border-gold-dim rounded-lg px-3 py-2.5 text-fg font-serif text-[15px] outline-none focus:border-gold"
            value={value.time}
            onChange={(e) => set({ time: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

// ---------- 单人出生信息弹窗（八字 / 紫微 / 奇门 / 大六壬共用）----------

interface Props {
  title: string;
  hint: string;
  submitText?: string;
  onClose: () => void;
  onSubmit: (input: BirthInput) => void;
}

export function BirthModal({ title, hint, submitText = '排盘', onClose, onSubmit }: Props) {
  const [value, setValue] = useState<BirthValue>(EMPTY_BIRTH);
  const [err, setErr] = useState('');

  const submit = () => {
    const r = birthValueToInput(value);
    if ('error' in r) {
      setErr(r.error);
      return;
    }
    onSubmit(r.input);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-[rgba(10,8,6,0.66)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-line">
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">{title}</h3>
          <button
            className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-[18px] flex flex-col gap-3.5">
          <BirthFields value={value} onChange={setValue} />
          <p className="modal-hint">{hint}</p>
          {err && <p className="text-[13px] text-vermilion m-0">{err}</p>}
        </div>

        <div className="flex justify-end gap-2.5 px-[18px] py-3.5 border-t border-line">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
