import { useState } from 'react';
import type { HepanInput } from '../types';
import { BirthFields, EMPTY_BIRTH, birthValueToInput, type BirthValue } from './BirthModal';

interface Props {
  onClose: () => void;
  onSubmit: (input: HepanInput) => void;
}

// 合盘：双人出生信息表单
export function HepanModal({ onClose, onSubmit }: Props) {
  // 双方默认值刻意错开，避免用户直接提交时算成「自己与自己合盘」
  const [a, setA] = useState<BirthValue>({ ...EMPTY_BIRTH, gender: 'male' });
  const [b, setB] = useState<BirthValue>({ ...EMPTY_BIRTH, gender: 'female', date: '1992-01-01' });
  const [err, setErr] = useState('');

  const submit = () => {
    const ra = birthValueToInput(a);
    if ('error' in ra) {
      setErr('甲方：' + ra.error);
      return;
    }
    const rb = birthValueToInput(b);
    if ('error' in rb) {
      setErr('乙方：' + rb.error);
      return;
    }
    onSubmit({ personA: ra.input, personB: rb.input });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-[rgba(10,8,6,0.66)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-line">
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">合盘 · 合婚</h3>
          <button
            className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-[18px] flex flex-col gap-4 max-h-[64vh] overflow-y-auto">
          <BirthFields heading="甲方" value={a} onChange={setA} />
          <div className="border-t border-line/60" />
          <BirthFields heading="乙方" value={b} onChange={setB} />
          <p className="modal-hint">
            系统依双方八字做传统合婚比对：日柱（夫妻宫）、生肖、五行互补、月柱与时柱关系。
            合婚分数为传统说法，供文化参考，非定论。
          </p>
          {err && <p className="text-[13px] text-vermilion m-0">{err}</p>}
        </div>

        <div className="flex justify-end gap-2.5 px-[18px] py-3.5 border-t border-line">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={submit}>
            合盘
          </button>
        </div>
      </div>
    </div>
  );
}
