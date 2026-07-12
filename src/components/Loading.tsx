interface Props {
  text?: string;
  /** block：居中竖排（用于区块加载）；inline：行内小 spinner */
  variant?: 'block' | 'inline';
  /** 在金色按钮上显示深色的 spinner */
  dark?: boolean;
}

export function Loading({ text, variant = 'block', dark = false }: Props) {
  const spin = 'spinner animate-spin' + (dark ? ' spinner-dark' : '');
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={spin} />
        {text && <span className="text-[#2a2014] font-serif text-[15px] tracking-[2px]">{text}</span>}
      </span>
    );
  }
  return (
    <div className="loading-block">
      <span className={spin} />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
}
