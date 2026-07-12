import { useEffect } from 'react';
import type { LingQian } from '../content';
import { LingQianDetail } from './LingQianDetail';

interface Props {
  sign: LingQian;
  levelColor: string;
  onClose: () => void;
}

// 从「记录」中点开某一支求签时，以弹窗呈现签文详情
export function LingQianDetailModal({ sign, levelColor, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-[rgba(10,8,6,0.66)] backdrop-blur-sm fade-in"
      onClick={onClose}
    >
      <div
        className="modal relative max-h-[86vh] overflow-y-auto p-[22px] pt-[30px] fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 w-[30px] h-[30px] rounded-full border border-gold-dim bg-transparent text-fg-faint cursor-pointer text-[14px] leading-none transition hover:text-[#e0a39c] hover:border-[#b8554a] hover:bg-[rgba(192,57,43,0.12)]"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>
        <LingQianDetail sign={sign} levelColor={levelColor} />
      </div>
    </div>
  );
}
