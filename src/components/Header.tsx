interface Props {
  onNew: () => void;
  onHome: () => void;
  onSettings: () => void;
}

export function Header({ onNew, onHome, onSettings }: Props) {
  return (
    <header className="flex items-center justify-between px-[18px] py-3.5 border-b border-line backdrop-blur-sm">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
        <span className="seal">易</span>
        <div>
          <h1 className="m-0 font-brush text-[26px] text-gold-bright tracking-[4px] leading-none">
            周易算
          </h1>
          <p className="m-1 mt-1 text-xs tracking-[2px] text-fg-dim">易经占卜 · 三才之问</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onHome}
        >
          首页
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onNew}
        >
          新占
        </button>
        <button
          className="btn btn-ghost w-9 !px-0 h-9"
          onClick={onSettings}
          aria-label="设置"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
