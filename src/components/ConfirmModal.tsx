import { useEffect } from 'react';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-[rgba(10,8,6,0.6)] backdrop-blur-sm fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] bg-gradient-to-b from-panel-2 to-panel border border-gold-dim rounded-2xl p-[22px] pb-[18px] shadow-2xl pop-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <div className="font-brush text-[21px] tracking-[2px] text-gold-bright mb-2.5">{title}</div>}
        <div className="text-[14.5px] leading-[1.7] text-fg mb-5">{message}</div>
        <div className="flex gap-2.5 justify-end">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
