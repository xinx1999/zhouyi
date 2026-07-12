import type { NajiaData } from '../types';

const POS = ['初', '二', '三', '四', '五', '上'];

function yaoName(idx: number, yin: boolean): string {
  return POS[idx] + (yin ? '六' : '九');
}

const QIN_CLASS: Record<string, string> = {
  父母: 'qin-parent',
  官鬼: 'qin-gui',
  妻财: 'qin-wealth',
  子孙: 'qin-child',
  兄弟: 'qin-bro',
};

export function NajiaPanel({
  data,
  title,
  hideTip,
}: {
  data: NajiaData;
  title?: string;
  hideTip?: boolean;
}) {
  const rows = [...data.lines].reverse(); // 上爻 → 初爻
  return (
    <div className="mt-3.5 p-4 border border-gold-dim rounded-xl bg-gradient-to-b from-[rgba(201,169,106,0.06)] to-[rgba(192,57,43,0.04)]">
      <div className="flex items-center gap-3 mb-2.5">
        {title && (
          <span className="text-[13px] text-gold px-2 py-0.5 rounded-full border border-gold-dim">
            {title}
          </span>
        )}
        <span className="text-[15px] text-gold-bright font-medium">{data.palace}</span>
        <span className="text-xs text-fg-dim px-2 py-0.5 rounded-full border border-line">
          宫属{data.palaceElement}
        </span>
      </div>
      <div className="flex flex-col border border-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[34px_46px_50px_46px_46px_46px] md:grid-cols-[44px_56px_64px_56px_56px_56px] items-center px-1.5 md:px-2.5 py-[7px] md:py-2 border-b border-line bg-gold-dim/30 text-fg-dim text-xs">
          <span>世应</span>
          <span>爻位</span>
          <span>阴阳</span>
          <span>六神</span>
          <span>干支</span>
          <span>六亲</span>
        </div>
        {rows.map((ln) => (
          <div
            key={ln.pos}
            className={
              'grid grid-cols-[34px_46px_50px_46px_46px_46px] md:grid-cols-[44px_56px_64px_56px_56px_56px] items-center px-1.5 md:px-2.5 py-[7px] md:py-2 border-b border-line text-xs md:text-[13px] ' +
              (ln.changing ? ' bg-[rgba(192,57,43,0.1)]' : '')
            }
          >
            <span className="text-gold-bright font-medium">
              {ln.pos === data.world ? '世' : ln.pos === data.ying ? '应' : ''}
            </span>
            <span className="text-fg">{yaoName(ln.pos - 1, ln.yin)}</span>
            <span className="text-fg-dim">
              {ln.yin ? '阴' : '阳'}
              {ln.changing ? (ln.yin ? ' ×' : ' ○') : ''}
            </span>
            <span className="text-fg-dim">{ln.liuShen}</span>
            <span className="text-fg tracking-wide">{ln.ganzhi}</span>
            <span className={'font-medium ' + (QIN_CLASS[ln.liuQin] || '')}>{ln.liuQin}</span>
          </div>
        ))}
      </div>
      {!hideTip && (
        <div className="mt-2.5 text-xs text-fg-faint leading-relaxed">
          世爻为问事之主，应爻为所问之人事物；动爻（○老阳 ×老阴）主变化之机。
        </div>
      )}
    </div>
  );
}
