// ============================================================
// 干支历法 · 五行关系（断卦要素的基础层）
//
// 本文件是断卦计算的单一数据来源：天干地支、五行生克、旬空、
// 月令旺衰、地支六冲六合三合三会相害。
// 上层（liuyao.ts / meihua.ts）只依赖本文件，不重复定义规则表。
//
// 干支历法由 lunar-javascript（MIT）提供，月建按节气划分。
// ============================================================
import { Solar } from 'lunar-javascript';

// ---------- 天干 / 地支 / 五行 ----------

export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export type TianGan = (typeof TIAN_GAN)[number];
export type DiZhi = (typeof DI_ZHI)[number];
export type WuXing = '金' | '木' | '水' | '火' | '土';

// 天干五行
export const GAN_ELEMENT: Record<string, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 地支五行
export const BRANCH_ELEMENT: Record<string, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// 五行相生 / 相克
export const SHENG: Record<string, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
export const KE: Record<string, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

// ---------- 干支历法（四柱） ----------

export interface GanZhiPillar {
  gan: TianGan;
  zhi: DiZhi;
  ganZhi: string; // 如「癸亥」
}

export interface GanZhiTime {
  year: GanZhiPillar;
  month: GanZhiPillar;
  day: GanZhiPillar;
  hour: GanZhiPillar;
  jieQi?: string; // 当日若逢节气则记其名
}

function makePillar(gan: string, zhi: string): GanZhiPillar {
  return { gan: gan as TianGan, zhi: zhi as DiZhi, ganZhi: `${gan}${zhi}` };
}

// 由公历时刻求四柱干支（年柱以立春为界，月柱以节气为界）
export function getGanZhiTime(date: Date): GanZhiTime {
  const solar = Solar.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  return {
    year: makePillar(ec.getYearGan(), ec.getYearZhi()),
    month: makePillar(ec.getMonthGan(), ec.getMonthZhi()),
    day: makePillar(ec.getDayGan(), ec.getDayZhi()),
    hour: makePillar(ec.getTimeGan(), ec.getTimeZhi()),
    jieQi: lunar.getJieQi() || undefined,
  };
}

// ---------- 旬空（空亡） ----------
// 六十甲子分六旬，每旬十日配十支，余二支无天干相配，即「空亡」。
// 旬首地支索引 = (日支索引 − 日干索引 + 12) mod 12

export const XUN_KONG_TABLE: Record<string, [DiZhi, DiZhi]> = {
  甲子旬: ['戌', '亥'],
  甲戌旬: ['申', '酉'],
  甲申旬: ['午', '未'],
  甲午旬: ['辰', '巳'],
  甲辰旬: ['寅', '卯'],
  甲寅旬: ['子', '丑'],
};

const XUN_NAMES = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
const XUN_START_ZHI = ['子', '戌', '申', '午', '辰', '寅'];

export interface XunKong {
  xun: string; // 旬名，如「甲寅旬」
  kong: [DiZhi, DiZhi]; // 两个空亡地支
}

export function getXunKong(dayGan: string, dayZhi: string): XunKong {
  const ganIdx = TIAN_GAN.indexOf(dayGan as TianGan);
  const zhiIdx = DI_ZHI.indexOf(dayZhi as DiZhi);
  if (ganIdx < 0 || zhiIdx < 0) return { xun: '甲子旬', kong: XUN_KONG_TABLE['甲子旬'] };
  const startZhi = DI_ZHI[(zhiIdx - ganIdx + 12) % 12];
  const idx = XUN_START_ZHI.indexOf(startZhi);
  const xun = idx >= 0 ? XUN_NAMES[idx] : '甲子旬';
  return { xun, kong: XUN_KONG_TABLE[xun] };
}

// ---------- 月令旺衰 ----------
// 以月建地支定各五行的旺相休囚死：
//   当令者旺 · 我生者相 · 生我者休 · 克我者囚 · 我克者死

export type WangShuai = '旺' | '相' | '休' | '囚' | '死';

export const WANG_SHUAI_TABLE: Record<string, Record<string, WangShuai>> = {
  寅: { 木: '旺', 火: '相', 水: '休', 金: '囚', 土: '死' },
  卯: { 木: '旺', 火: '相', 水: '休', 金: '囚', 土: '死' },
  辰: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
  巳: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
  午: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
  未: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
  申: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
  酉: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
  戌: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
  亥: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
  子: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
  丑: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
};

export function getWangShuai(monthZhi: string, element: string): WangShuai {
  return WANG_SHUAI_TABLE[monthZhi]?.[element] ?? '休';
}

// 旺衰的强弱分级（用于比较两爻力量）
export const WANG_SHUAI_WEIGHT: Record<WangShuai, number> = {
  旺: 5, 相: 4, 休: 2, 囚: 1, 死: 0,
};

// ---------- 地支关系 ----------

// 六冲
export const LIU_CHONG: Record<string, DiZhi> = {
  子: '午', 丑: '未', 寅: '申', 卯: '酉', 辰: '戌', 巳: '亥',
  午: '子', 未: '丑', 申: '寅', 酉: '卯', 戌: '辰', 亥: '巳',
};

// 六合
export const LIU_HE: Record<string, DiZhi> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};

// 六害（相害）
export const LIU_HAI: Record<string, DiZhi> = {
  子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅',
  卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉',
};

// 三合局
export const SAN_HE: Array<{ zhis: [DiZhi, DiZhi, DiZhi]; element: WuXing; name: string }> = [
  { zhis: ['申', '子', '辰'], element: '水', name: '申子辰合水局' },
  { zhis: ['亥', '卯', '未'], element: '木', name: '亥卯未合木局' },
  { zhis: ['寅', '午', '戌'], element: '火', name: '寅午戌合火局' },
  { zhis: ['巳', '酉', '丑'], element: '金', name: '巳酉丑合金局' },
];

// 三会方
export const SAN_HUI: Array<{ zhis: [DiZhi, DiZhi, DiZhi]; element: WuXing; name: string }> = [
  { zhis: ['寅', '卯', '辰'], element: '木', name: '寅卯辰会东方木' },
  { zhis: ['巳', '午', '未'], element: '火', name: '巳午未会南方火' },
  { zhis: ['申', '酉', '戌'], element: '金', name: '申酉戌会西方金' },
  { zhis: ['亥', '子', '丑'], element: '水', name: '亥子丑会北方水' },
];

export type ZhiRelation = '冲' | '合' | '害' | '同' | '';

// 两地支之间的关系（取最主要的：冲 > 合 > 害 > 同）
export function getZhiRelation(a: string, b: string): ZhiRelation {
  if (a === b) return '同';
  if (LIU_CHONG[a] === b) return '冲';
  if (LIU_HE[a] === b) return '合';
  if (LIU_HAI[a] === b) return '害';
  return '';
}

// 一地支与一组地支的三合局归属（返回命中的局，需三支俱全）
export function getSanHe(zhis: string[]): { element: WuXing; name: string } | null {
  const set = new Set(zhis);
  for (const item of SAN_HE) {
    if (item.zhis.every((z) => set.has(z))) return { element: item.element, name: item.name };
  }
  return null;
}

// ---------- 五行关系 ----------

export type WuXingRelation = '比和' | '我生' | '我克' | '生我' | '克我';

// from 对 to 的关系（站在 from 的立场）
export function getWuXingRelation(from: string, to: string): WuXingRelation {
  if (from === to) return '比和';
  if (SHENG[from] === to) return '我生';
  if (KE[from] === to) return '我克';
  if (SHENG[to] === from) return '生我';
  return '克我';
}

// 该关系对 from 一方是否有利（比和、克他、受生为有利；生他、被克为不利）
export function isFavorableRelation(rel: WuXingRelation): boolean {
  return rel === '比和' || rel === '我克' || rel === '生我';
}

// 关系的中文表述（用于文案）
export function relationText(a: string, b: string, rel?: WuXingRelation): string {
  const r = rel ?? getWuXingRelation(a, b);
  switch (r) {
    case '比和':
      return `${a}与${b}比和`;
    case '我生':
      return `${a}生${b}`;
    case '我克':
      return `${a}克${b}`;
    case '生我':
      return `${b}生${a}`;
    default:
      return `${b}克${a}`;
  }
}
