import type { CastResult, HexagramInfo, HexLine } from '../types';
import { NajiaPanel } from './NajiaPanel';
import { YarrowSteps } from './YarrowSteps';

const POS = ['初', '二', '三', '四', '五', '上'];

function yaoLabel(idx: number, yin: boolean): string {
  return POS[idx] + (yin ? '六' : '九');
}

function methodName(m: string): string {
  switch (m) {
    case 'coin': return '三枚铜钱法';
    case 'number': return '数字起卦 · 梅花易数';
    case 'time': return '时间起卦 · 梅花易数';
    case 'char': return '汉字起卦 · 梅花易数';
    case 'direction': return '方位起卦 · 梅花易数';
    case 'sound': return '声音起卦 · 梅花易数';
    case 'report': return '报数起卦 · 梅花易数';
    case 'yarrow': return '揲蓍法 · 大衍之数';
    case 'najia': return '纳甲六爻';
    default: return m;
  }
}

function YaoRow({ line, label }: { line: HexLine; label: string }) {
  return (
    <div className={'yao-row flex items-center gap-2.5 w-[130px] justify-between' + (line.changing ? ' changing' : '')}>
      <span className="yao-label text-xs text-fg-dim w-7 text-right flex-none">{label}</span>
      <span className="yao-symbol flex-1 flex justify-center">
        {line.yin ? (
          <span className="yin">
            <i />
            <i />
          </span>
        ) : (
          <span className="yang">
            <i />
          </span>
        )}
      </span>
      <span className="yao-mark w-[18px] text-center text-vermilion text-[15px] font-bold flex-none">
        {line.changing ? (line.value === 9 ? '○' : '×') : ''}
      </span>
    </div>
  );
}

function GuaBlock({ gua, tag }: { gua: HexagramInfo; tag: string }) {
  const topDown = [...gua.lines].reverse();
  return (
    <div className="text-center min-w-[156px]">
      <div className="inline-block text-xs tracking-[3px] text-[#14110d] bg-gold px-2.5 py-0.5 rounded-full mb-2">
        {tag}
      </div>
      <div className="font-brush text-[19px] text-gold-bright tracking-wide">
        第{gua.seq}卦 · {gua.name}
      </div>
      <div className="text-xs text-fg-dim my-[3px] mb-2.5">
        上{gua.upper.nature}（{gua.upper.name}）下{gua.lower.nature}（{gua.lower.name}）
      </div>
      <div className="flex flex-col gap-1.5 items-center">
        {topDown.map((ln, i) => {
          const realIdx = gua.lines.length - 1 - i;
          return <YaoRow key={i} line={ln} label={yaoLabel(realIdx, ln.yin)} />;
        })}
      </div>
    </div>
  );
}

export function HexagramCard({ cast }: { cast: CastResult }) {
  return (
    <div className="bg-gradient-to-b from-[rgba(43,35,24,0.7)] to-[rgba(28,23,17,0.7)] border border-gold-dim rounded-card p-[14px] pb-1.5 shadow-[inset_0_0_30px_rgba(201,169,106,0.05)]">
      <div className="flex items-baseline gap-2.5 mb-2.5 flex-wrap">
        <span className="font-brush text-gold-bright text-[17px] tracking-wide">{methodName(cast.method)}</span>
        {cast.question && <span className="text-fg-dim text-[13px]">「{cast.question}」</span>}
      </div>
      <div className="flex items-center justify-center gap-[18px] flex-wrap">
        <GuaBlock gua={cast.benGua} tag="本卦" />
        {cast.zhiGua && <div className="text-[22px] text-gold">→</div>}
        {cast.zhiGua && <GuaBlock gua={cast.zhiGua} tag="之卦" />}
      </div>
      <details className="hex-notes">
        <summary>起卦过程</summary>
        <pre>{cast.notes}</pre>
      </details>
      {cast.yarrowSteps && cast.yarrowSteps.length > 0 && <YarrowSteps steps={cast.yarrowSteps} />}
      {cast.najia && (
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <NajiaPanel data={cast.najia} title="本卦排盘" hideTip={!!cast.najiaZhi} />
          {cast.najiaZhi && <NajiaPanel data={cast.najiaZhi} title="变卦排盘" />}
        </div>
      )}
    </div>
  );
}
