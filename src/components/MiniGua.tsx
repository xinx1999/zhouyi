import type { DailyHexagram } from '../types';

interface Props {
  hex: DailyHexagram;
  size?: number;
  label?: boolean;
}

const POS = ['初', '二', '三', '四', '五', '上'];

// 由 上/下 经卦画出六爻符号（下→上：初、二、三、四、五、上）
// label=true 时在每个爻左侧标注「初九 / 六二 …」爻位，呼应传统卦象读法。
export function MiniGua({ hex, size = 1, label = false }: Props) {
  const bins = [...hex.lower.binary, ...hex.upper.binary]; // 下卦 + 上卦
  const pad = 3 * size;
  const lineH = 12 * size;
  const gap = 7 * size;
  const bar = 6 * size;
  const w = 64 * size; // 单爻长度
  const labelW = label ? 30 * size : 0;
  const labelGap = label ? 8 * size : 0;
  const yaoX = pad + labelW + labelGap;
  const yaoLen = w - 2 * pad;
  const svgW = label ? yaoX + yaoLen + pad : w;
  const h = bins.length * lineH + (bins.length - 1) * gap;

  return (
    <svg
      className="mini-gua"
      width={svgW}
      height={h}
      viewBox={`0 0 ${svgW} ${h}`}
      aria-label={`${hex.name} 卦象`}
      role="img"
    >
      {bins.map((v, i) => {
        const y = i * (lineH + gap) + pad;
        const labelText = POS[i] + (v === 1 ? '九' : '六');
        return (
          <g key={i}>
            {label && (
              <text
                x={pad}
                y={y + bar / 2}
                fill="rgba(201,169,106,0.7)"
                fontFamily='"Noto Serif SC",serif'
                fontSize={13 * size}
                textAnchor="start"
                dominantBaseline="central"
              >
                {labelText}
              </text>
            )}
            {v === 1 ? (
              <rect x={yaoX} y={y} width={yaoLen} height={bar} rx={bar / 2} fill="currentColor" />
            ) : (
              <g>
                <rect x={yaoX} y={y} width={yaoLen / 2 - gap / 2} height={bar} rx={bar / 2} fill="currentColor" />
                <rect
                  x={yaoX + yaoLen / 2 + gap / 2}
                  y={y}
                  width={yaoLen / 2 - gap / 2}
                  height={bar}
                  rx={bar / 2}
                  fill="currentColor"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
