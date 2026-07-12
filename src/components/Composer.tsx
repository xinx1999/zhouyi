import { Loading } from './Loading';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
}

export function Composer({ value, onChange, onSend, loading }: Props) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  return (
    <div className="flex gap-2.5 items-end bg-[rgba(24,20,15,0.85)] border border-[rgba(201,169,106,0.5)] rounded-2xl p-2 pl-3.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] transition focus-within:border-gold-bright focus-within:shadow-[inset_0_1px_3px_rgba(0,0,0,0.35),0_0_0_3px_rgba(201,169,106,0.22)]">
      <textarea
        className="flex-1 bg-transparent border-0 outline-none resize-none text-fg font-serif text-[15px] leading-[1.6] max-h-[120px] py-1.5 placeholder:text-[#8a7c62]"
        value={value}
        placeholder="心有所惑，默念于胸，再问于卦…"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
      />
      <button
        className="btn btn-primary flex-none"
        onClick={onSend}
        disabled={loading || !value.trim()}
      >
        {loading ? <Loading variant="inline" dark text="演卦中" /> : '起卦'}
      </button>
    </div>
  );
}
