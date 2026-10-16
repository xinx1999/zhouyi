// ============================================================
// 卦象基础数据与构造
//
// 八卦、六十四卦（文王卦序）、由六爻构造别卦。
// 从 divination.ts 抽出为独立模块，供 divination / meihua 共用，
// 避免相互 import 造成循环依赖。
// ============================================================
import type { WuXing } from './ganzhi.js';

// ---------- 类型 ----------

export interface HexLine {
  yin: boolean; // true=阴爻, false=阳爻
  changing: boolean; // 是否变爻（老阳/老阴）
  value: 6 | 7 | 8 | 9; // 6=老阴 7=少阳 8=少阴 9=老阳
  toss?: number[]; // 铜钱法：三次抛掷结果（1=阳，0=阴）
}

export interface TrigramInfo {
  id: string;
  name: string; // 卦名（乾兑离震巽坎艮坤）
  nature: string; // 自然属性（天泽火雷风山水地）
  binary: number[]; // 三爻，从初到上（下→上）
}

export interface HexagramInfo {
  seq: number;
  name: string;
  upper: TrigramInfo; // 上卦（外卦）
  lower: TrigramInfo; // 下卦（内卦）
  lines: HexLine[]; // 六爻，自下而上
}

// ---------- 八卦（经卦） ----------
// binary 顺序：初爻 → 二爻 → 三爻（由下而上）

export const TRIGRAMS: Record<string, TrigramInfo> = {
  qian: { id: 'qian', name: '乾', nature: '天', binary: [1, 1, 1] },
  dui: { id: 'dui', name: '兑', nature: '泽', binary: [1, 1, 0] },
  li: { id: 'li', name: '离', nature: '火', binary: [1, 0, 1] },
  zhen: { id: 'zhen', name: '震', nature: '雷', binary: [1, 0, 0] },
  xun: { id: 'xun', name: '巽', nature: '风', binary: [0, 1, 1] },
  kan: { id: 'kan', name: '坎', nature: '水', binary: [0, 1, 0] },
  gen: { id: 'gen', name: '艮', nature: '山', binary: [0, 0, 1] },
  kun: { id: 'kun', name: '坤', nature: '地', binary: [0, 0, 0] },
};

// 八卦五行（体用生克的基础）
export const TRIGRAM_ELEMENT: Record<string, WuXing> = {
  qian: '金', dui: '金', li: '火', zhen: '木', xun: '木', kan: '水', gen: '土', kun: '土',
};

// 先天八卦数 → 卦 id（1乾 2兑 3离 4震 5巽 6坎 7艮 8坤）
export const XIANTIAN: string[] = ['', 'qian', 'dui', 'li', 'zhen', 'xun', 'kan', 'gen', 'kun'];

// ---------- 六十四卦（文王卦序） ----------
// 每项：[卦序, 卦名, 上卦id, 下卦id]

export const HEXAGRAM_RAW: [number, string, string, string][] = [
  [1, '乾为天', 'qian', 'qian'],
  [2, '坤为地', 'kun', 'kun'],
  [3, '水雷屯', 'kan', 'zhen'],
  [4, '山水蒙', 'gen', 'kan'],
  [5, '水天需', 'kan', 'qian'],
  [6, '天水讼', 'qian', 'kan'],
  [7, '地水师', 'kun', 'kan'],
  [8, '水地比', 'kan', 'kun'],
  [9, '风天小畜', 'xun', 'qian'],
  [10, '天泽履', 'qian', 'dui'],
  [11, '地天泰', 'kun', 'qian'],
  [12, '天地否', 'qian', 'kun'],
  [13, '天火同人', 'qian', 'li'],
  [14, '火天大有', 'li', 'qian'],
  [15, '地山谦', 'kun', 'gen'],
  [16, '雷地豫', 'zhen', 'kun'],
  [17, '泽雷随', 'dui', 'zhen'],
  [18, '山风蛊', 'gen', 'xun'],
  [19, '地泽临', 'kun', 'dui'],
  [20, '风地观', 'xun', 'kun'],
  [21, '火雷噬嗑', 'li', 'zhen'],
  [22, '山火贲', 'gen', 'li'],
  [23, '山地剥', 'gen', 'kun'],
  [24, '地雷复', 'kun', 'zhen'],
  [25, '天雷无妄', 'qian', 'zhen'],
  [26, '山天大畜', 'gen', 'qian'],
  [27, '山雷颐', 'gen', 'zhen'],
  [28, '泽风大过', 'dui', 'xun'],
  [29, '坎为水', 'kan', 'kan'],
  [30, '离为火', 'li', 'li'],
  [31, '泽山咸', 'dui', 'gen'],
  [32, '雷风恒', 'zhen', 'xun'],
  [33, '天山遁', 'qian', 'gen'],
  [34, '雷天大壮', 'zhen', 'qian'],
  [35, '火地晋', 'li', 'kun'],
  [36, '地火明夷', 'kun', 'li'],
  [37, '风火家人', 'xun', 'li'],
  [38, '火泽睽', 'li', 'dui'],
  [39, '水山蹇', 'kan', 'gen'],
  [40, '雷水解', 'zhen', 'kan'],
  [41, '山泽损', 'gen', 'dui'],
  [42, '风雷益', 'xun', 'zhen'],
  [43, '泽天夬', 'dui', 'qian'],
  [44, '天风姤', 'qian', 'xun'],
  [45, '泽地萃', 'dui', 'kun'],
  [46, '地风升', 'kun', 'xun'],
  [47, '泽水困', 'dui', 'kan'],
  [48, '水风井', 'kan', 'xun'],
  [49, '泽火革', 'dui', 'li'],
  [50, '火风鼎', 'li', 'xun'],
  [51, '震为雷', 'zhen', 'zhen'],
  [52, '艮为山', 'gen', 'gen'],
  [53, '风山渐', 'xun', 'gen'],
  [54, '雷泽归妹', 'zhen', 'dui'],
  [55, '雷火丰', 'zhen', 'li'],
  [56, '火山旅', 'li', 'gen'],
  [57, '巽为风', 'xun', 'xun'],
  [58, '兑为泽', 'dui', 'dui'],
  [59, '风水涣', 'xun', 'kan'],
  [60, '水泽节', 'kan', 'dui'],
  [61, '风泽中孚', 'xun', 'dui'],
  [62, '雷山小过', 'zhen', 'gen'],
  [63, '水火既济', 'kan', 'li'],
  [64, '火水未济', 'li', 'kan'],
];

// ---------- 工具函数 ----------

export function trigramByBinary(bin: number[]): TrigramInfo {
  const key = bin.join('');
  for (const t of Object.values(TRIGRAMS)) {
    if (t.binary.join('') === key) return t;
  }
  throw new Error(`未知经卦: ${key}`);
}

export function trigramByMod8(n: number): TrigramInfo {
  let m = ((n % 8) + 8) % 8;
  if (m === 0) m = 8;
  return TRIGRAMS[XIANTIAN[m]];
}

// 由上下卦 id 查别卦（卦序 + 卦名）
export function hexagramByTrigrams(upperId: string, lowerId: string): { seq: number; name: string } {
  const found = HEXAGRAM_RAW.find(([, , up, low]) => up === upperId && low === lowerId);
  if (!found) throw new Error(`未找到对应别卦: 上${upperId} 下${lowerId}`);
  return { seq: found[0], name: found[1] };
}

// 由六爻二进制（下→上）构造别卦信息
export function buildHexagram(linesBin: number[], changing: boolean[]): HexagramInfo {
  const lowerBin = linesBin.slice(0, 3);
  const upperBin = linesBin.slice(3, 6);
  const lower = trigramByBinary(lowerBin);
  const upper = trigramByBinary(upperBin);
  const { seq, name } = hexagramByTrigrams(upper.id, lower.id);

  const lines: HexLine[] = linesBin.map((v, i) => {
    const yin = v === 0;
    const isChanging = changing[i];
    let value: 6 | 7 | 8 | 9;
    if (isChanging) value = yin ? 6 : 9;
    else value = yin ? 8 : 7;
    return { yin, changing: isChanging, value };
  });

  return { seq, name, upper, lower, lines };
}

// 由六爻二进制构造「无变爻」的别卦（用于互卦 / 错卦 / 综卦）
export function hexagramFromLines(linesBin: number[]): HexagramInfo {
  return buildHexagram(linesBin, new Array(6).fill(false));
}

// 六爻二进制 → 卦名（便捷查询）
export function hexagramNameOf(linesBin: number[]): string {
  return hexagramFromLines(linesBin).name;
}
