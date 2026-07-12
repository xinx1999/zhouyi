import { useState } from 'react';
import { LINGQIAN, dailyLingQian, LINGQIAN_LEVEL_COLOR, type LingQian } from '../content';
import { LingQianDetail } from './LingQianDetail';
import { Loading } from './Loading';

interface Props {
  onRecord?: (sign: LingQian, source: 'random' | 'daily') => void;
}

export function LingQian({ onRecord }: Props) {
  const today = dailyLingQian();
  const [drawn, setDrawn] = useState<LingQian | null>(null);
  const [source, setSource] = useState<'random' | 'daily'>('random');
  // idle：待求；shaking：摇签
  const [phase, setPhase] = useState<'idle' | 'shaking'>('idle');

  const draw = () => {
    if (phase !== 'idle') return;
    setDrawn(null); // 重新求签时先回到竹筒，露出摇签动画
    setSource('random');
    setPhase('shaking');
    // 摇签 440ms 后停止晃动、再等一小段揭晓签文
    window.setTimeout(() => {
      setPhase('idle');
      const pick = LINGQIAN[Math.floor(Math.random() * LINGQIAN.length)];
      setDrawn(pick);
      setPhase('idle');
      onRecord?.(pick, 'random');
    }, 700);
  };

  const drawDaily = () => {
    setSource('daily');
    setDrawn(today);
    onRecord?.(today, 'daily');
  };

  return (
    <div className="flex flex-col gap-[22px] fade-up">
      <section className="flex flex-col gap-3">
        <h2 className="font-brush text-[19px] text-gold-bright tracking-[2px] m-0 pl-[11px] border-l-[3px] border-vermilion leading-[1.1]">
          灵签求签
        </h2>
        <p className="m-0 mb-[18px] text-[13.5px] leading-[1.8] text-fg-dim">
          心有所问，先默念其事，再诚心求签。签文示象，吉凶在心——上签勉之，下签戒之，皆借天意照见当下。
        </p>

        {!drawn ? (
          <div className={'qian-barrel' + (phase !== 'idle' ? ' is-active' : '')}>
            {/* 真实签筒图片，摇签时整体左右晃动 */}
            <img
              src="/qian-barrel.png"
              alt="灵签筒"
              className={
                'w-[180px] mx-auto mb-4 select-none drop-shadow-lg' +
                (phase === 'shaking' ? ' animate-[qian-shake_0.18s_linear_infinite]' : '')
              }
              draggable={false}
            />
            <button
              className="btn btn-primary qian-draw-btn"
              onClick={draw}
              disabled={phase !== 'idle'}
            >
              {phase === 'idle' ? (
                <>
                  <span className="qian-draw-badge" aria-hidden>求</span>
                  诚心求签
                </>
              ) : (
                <Loading variant="inline" dark text={phase === 'shaking' ? '摇签中' : '请签中'} />
              )}
            </button>
            <div className="qian-barrel-cap">共 {LINGQIAN.length} 签 · 心诚则灵</div>
          </div>
        ) : null}
      </section>

      {/* 抽中后：签文以弹出层呈现，关闭即回到竹筒可再求 */}
      {drawn && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-[rgba(10,8,6,0.66)] backdrop-blur-sm fade-in"
          onClick={() => setDrawn(null)}
        >
          <div
            className="modal relative max-h-[86vh] overflow-y-auto p-[22px] pt-[30px] fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 w-[30px] h-[30px] rounded-full border border-gold-dim bg-transparent text-fg-faint cursor-pointer text-[14px] leading-none transition hover:text-[#e0a39c] hover:border-[#b8554a] hover:bg-[rgba(192,57,43,0.12)]"
              onClick={() => setDrawn(null)}
              aria-label="关闭"
            >
              ✕
            </button>
            <LingQianDetail sign={drawn} levelColor={LINGQIAN_LEVEL_COLOR[drawn.level] || '#c9a96a'} />
            <div className="flex gap-2.5 mt-4">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => {
                  setDrawn(null);
                  draw();
                }}
              >
                再求一签
              </button>
              <button className="btn btn-ghost flex-1" onClick={drawDaily}>
                看今日一签
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
