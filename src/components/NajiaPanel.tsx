import type { NajiaData, LiuyaoAnalysis, WangShuai } from '../types';

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

// 空亡状态标签
const KONG_LABEL: Record<string, string> = {
  not_kong: '',
  kong_static: '空',
  kong_changing: '动空',
  kong_ri_chong: '冲空',
  kong_yue_jian: '临建',
};

// 旺衰配色
const WANG_COLOR: Record<WangShuai, string> = {
  旺: '#3f7d5a',
  相: '#6f9e7d',
  休: '#a99c84',
  囚: '#b8843a',
  死: '#c0392b',
};

export function NajiaPanel({
  data,
  title,
  hideTip,
  analysis,
}: {
  data: NajiaData;
  title?: string;
  hideTip?: boolean;
  analysis?: LiuyaoAnalysis | null;
}) {
  const rows = [...data.lines].reverse(); // 上爻 → 初爻
  const lineOf = (pos: number) => analysis?.lines.find((l) => l.pos === pos);

  return (
    <div className="mt-3.5 p-4 border border-gold-dim rounded-xl bg-gradient-to-b from-[rgba(201,169,106,0.06)] to-[rgba(192,57,43,0.04)]">
      <div className="flex items-center gap-3 mb-2.5 flex-wrap">
        {title && (
          <span className="text-[13px] text-gold px-2 py-0.5 rounded-full border border-gold-dim">
            {title}
          </span>
        )}
        <span className="text-[15px] text-gold-bright font-medium">{data.palace}</span>
        <span className="text-xs text-fg-dim px-2 py-0.5 rounded-full border border-line">
          宫属{data.palaceElement}
        </span>
        {analysis?.isLiuChongGua && (
          <span className="text-xs text-vermilion px-2 py-0.5 rounded-full border border-[rgba(192,57,43,0.4)]">
            六冲卦
          </span>
        )}
        {analysis?.isLiuHeGua && (
          <span className="text-xs text-jade px-2 py-0.5 rounded-full border border-[rgba(63,125,90,0.45)]">
            六合卦
          </span>
        )}
      </div>

      <div className="flex flex-col border border-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[34px_46px_58px_46px_56px_46px] md:grid-cols-[44px_56px_72px_56px_68px_56px] items-center px-1.5 md:px-2.5 py-[7px] md:py-2 border-b border-line bg-gold-dim/30 text-fg-dim text-xs">
          <span>世应</span>
          <span>爻位</span>
          <span>阴阳</span>
          <span>六神</span>
          <span>干支</span>
          <span>六亲</span>
        </div>
        {rows.map((ln) => {
          const a = lineOf(ln.pos);
          const isYong = !!a?.isYongShen;
          const kongLabel = a ? KONG_LABEL[a.kongWang] : '';
          // 六亲标记：用神 / 原神 / 忌神 / 仇神
          const marks: string[] = [];
          if (a?.isYongShen) marks.push('用');
          if (a?.isYuanShen) marks.push('原');
          if (a?.isJiShen) marks.push('忌');
          if (a?.isChouShen) marks.push('仇');
          return (
            <div
              key={ln.pos}
              className={
                'grid grid-cols-[34px_46px_58px_46px_56px_46px] md:grid-cols-[44px_56px_72px_56px_68px_56px] items-center px-1.5 md:px-2.5 py-[7px] md:py-2 border-b border-line text-xs md:text-[13px] ' +
                (ln.changing ? 'bg-[rgba(192,57,43,0.1)] ' : '') +
                (isYong ? 'bg-[rgba(201,169,106,0.14)]' : '')
              }
            >
              <span className="text-gold-bright font-medium">
                {ln.pos === data.world ? '世' : ln.pos === data.ying ? '应' : ''}
              </span>
              <span className="text-fg">{yaoName(ln.pos - 1, ln.yin)}</span>
              <span className="text-fg-dim">
                {ln.yin ? '阴' : '阳'}
                {ln.changing ? (ln.yin ? ' ×' : ' ○') : ''}
                {a && (
                  <b className="ml-1 font-medium" style={{ color: WANG_COLOR[a.wangShuai] }}>
                    {a.wangShuai}
                  </b>
                )}
              </span>
              <span className="text-fg-dim">{ln.liuShen}</span>
              <span className="text-fg tracking-wide">
                {ln.ganzhi}
                {kongLabel && (
                  <em className="ml-1 not-italic text-[11px] text-vermilion">{kongLabel}</em>
                )}
              </span>
              <span className={'font-medium ' + (QIN_CLASS[ln.liuQin] || '')}>
                {ln.liuQin}
                {marks.length > 0 && (
                  <em className="ml-0.5 not-italic text-[11px] text-gold-bright">
                    {marks.join('/')}
                  </em>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* 断卦要素（月建 / 日辰 / 旬空 / 用神系统 / 应期） */}
      {analysis && (
        <div className="mt-3 pt-2.5 border-t border-line text-[12px] text-fg-dim leading-relaxed">
          <div>
            <span className="text-fg-faint">月建</span> {analysis.monthZhi}
            <span className="text-fg-faint ml-2">日辰</span> {analysis.dayGanZhi}
            <span className="text-fg-faint ml-2">旬空</span> {analysis.kongWang.xun}（
            {analysis.kongWang.kong.join('、')}）
          </div>
          <div className="mt-1">
            <span className="text-fg-faint">用神</span>
            <span className="text-gold-bright font-medium ml-1">{analysis.yongShenLiuQin}</span>
            <span className="text-fg-faint ml-2 text-[11px]">
              （表中六亲旁标注：用=用神 原=原神 忌=忌神 仇=仇神）
            </span>
          </div>
          {analysis.timingHints.length > 0 && (
            <div className="mt-1">
              <span className="text-fg-faint">应期</span>
              <span className="ml-1">{analysis.timingHints.join('；')}</span>
            </div>
          )}
        </div>
      )}

      {!hideTip && (
        <div className="mt-2.5 text-xs text-fg-faint leading-relaxed">
          世爻为问事之主，应爻为所问之人事物；动爻（○老阳 ×老阴）主变化之机。
        </div>
      )}
    </div>
  );
}
