// ============================================================
// 周易起卦引擎
// 支持五种起卦方式：三枚铜钱法 / 数字起卦 / 时间起卦 / 汉字起卦 / 方位起卦
// 输出结构化的卦象数据，供前端可视化与模型解读
// ============================================================

// ---------- 类型定义 ----------
export type CastMethod = 'coin' | 'number' | 'time' | 'char' | 'direction' | 'sound' | 'report' | 'yarrow' | 'person';

// 纳甲六爻排盘（京房纳甲）相关数据
export type LiuQin = '父母' | '官鬼' | '妻财' | '子孙' | '兄弟';
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武';

export interface NajiaLine {
  pos: number;          // 爻位 1-6（1=初爻 … 6=上爻）
  yin: boolean;         // 阴/阳
  changing: boolean;    // 是否动爻
  ganzhi: string;       // 干支
  liuQin: LiuQin;       // 六亲
  liuShen: LiuShen;     // 六神
}

export interface NajiaData {
  palace: string;        // 所属八宫（如 坎宫）
  palaceElement: string; // 宫五行（金木水火土）
  world: number;         // 世爻位 1-6
  ying: number;          // 应爻位 1-6
  lines: NajiaLine[];    // 自下而上（初→上）六爻
}

// 揲蓍法：一变（分二挂一揲四归奇）的明细
export interface YarrowStep {
  bian: number;    // 第几变（1-3）
  before: number;  // 本变前策数
  left: number;    // 左手（天）分得
  right: number;   // 右手（地）分得
  gua: number;     // 挂一（1）
  remL: number;    // 左手揲四之余（归左手小指）
  remR: number;    // 右手揲四之余
  removed: number; // 本变去掉的策数（挂一+两余）
  after: number;   // 本变后剩余策数
}

// 揲蓍法：一爻（三变而成）的明细
export interface YarrowYao {
  pos: number;         // 爻位 1-6
  steps: YarrowStep[]; // 三变
  total: number;       // 三变后剩余策数（36/32/28/24）
  count: number;       // 揲得之数（total÷4 = 9/8/7/6）
  value: 6 | 7 | 8 | 9;
  label: string;       // 老阳/少阴/少阳/老阴
}

export interface CastRequest {
  method: CastMethod;
  question?: string;
  // 数字/报数起卦：正整数（1 或 2 个）
  numbers?: number[];
  // 时间起卦：可选时间戳（ms），缺省取当前时间
  timestamp?: number;
  // 汉字起卦：所起之字（1 个以上）
  chars?: string;
  // 方位起卦：所选方位 key（qian/dui/li/zhen/xun/kan/gen/kun）
  direction?: string;
  // 声音起卦：所闻声数与句数
  sound?: { count: number; sentences: number };
  // 纳甲六爻：在基础起卦法之上附带排盘
  najia?: boolean;
  baseMethod?: CastMethod;
  // 姓名生辰起卦：输入姓名、生日（公历 YYYY-MM-DD）、性别
  name?: string;
  birthday?: string;
  gender?: 'male' | 'female';
}

// 单爻
export interface HexLine {
  yin: boolean;        // true=阴爻, false=阳爻
  changing: boolean;   // 是否变爻（老阳/老阴）
  value: 6 | 7 | 8 | 9; // 6=老阴 7=少阳 8=少阴 9=老阳
  toss?: number[];     // 铜钱法：三次抛掷结果（1=阳，0=阴）
}

// 经卦（八卦）信息
export interface TrigramInfo {
  id: string;
  name: string;   // 卦名（乾兑离震巽坎艮坤）
  nature: string; // 自然属性（天泽火雷风山水地）
  binary: number[]; // 三爻，从初到上（下→上）
}

// 别卦（六十四卦）信息
export interface HexagramInfo {
  seq: number;
  name: string;
  upper: TrigramInfo; // 上卦（外卦）
  lower: TrigramInfo; // 下卦（内卦）
  lines: HexLine[];   // 六爻，自下而上
}

export interface CastResult {
  method: CastMethod;
  question?: string;
  benGua: HexagramInfo;       // 本卦（主卦）
  zhiGua: HexagramInfo | null; // 之卦（变卦），无变爻则为 null
  changingPositions: number[]; // 变爻位置（1-6）
  notes: string;              // 起卦过程说明
  najia?: NajiaData | null;   // 纳甲六爻排盘·本卦（仅 najia 模式附带）
  najiaZhi?: NajiaData | null; // 纳甲六爻排盘·变卦（有变爻且 najia 模式时附带）
  yarrowSteps?: YarrowYao[];  // 揲蓍法十八变分步演算（仅 yarrow 模式附带）
}

// ---------- 八卦（经卦）数据 ----------
// binary 顺序：初爻 → 二爻 → 三爻（由下而上）
export const TRIGRAMS: Record<string, TrigramInfo> = {
  qian: { id: 'qian', name: '乾', nature: '天', binary: [1, 1, 1] },
  dui:  { id: 'dui',  name: '兑', nature: '泽', binary: [1, 1, 0] },
  li:   { id: 'li',   name: '离', nature: '火', binary: [1, 0, 1] },
  zhen: { id: 'zhen', name: '震', nature: '雷', binary: [1, 0, 0] },
  xun:  { id: 'xun',  name: '巽', nature: '风', binary: [0, 1, 1] },
  kan:  { id: 'kan',  name: '坎', nature: '水', binary: [0, 1, 0] },
  gen:  { id: 'gen',  name: '艮', nature: '山', binary: [0, 0, 1] },
  kun:  { id: 'kun',  name: '坤', nature: '地', binary: [0, 0, 0] },
};

// 先天八卦数 → 卦 id（1乾 2兑 3离 4震 5巽 6坎 7艮 8坤）
const XIANTIAN: string[] = ['', 'qian', 'dui', 'li', 'zhen', 'xun', 'kan', 'gen', 'kun'];

// ---------- 六十四卦（文王卦序） ----------
// 每项：[卦序, 卦名, 上卦id, 下卦id]
const HEXAGRAM_RAW: [number, string, string, string][] = [
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
function trigramByBinary(bin: number[]): TrigramInfo {
  const key = bin.join('');
  for (const t of Object.values(TRIGRAMS)) {
    if (t.binary.join('') === key) return t;
  }
  throw new Error(`未知经卦: ${key}`);
}

function trigramByMod8(n: number): TrigramInfo {
  let m = ((n % 8) + 8) % 8;
  if (m === 0) m = 8;
  return TRIGRAMS[XIANTIAN[m]];
}

// 由六爻二进制（下→上）构造别卦信息
function buildHexagram(linesBin: number[], changing: boolean[]): HexagramInfo {
  const lowerBin = linesBin.slice(0, 3);
  const upperBin = linesBin.slice(3, 6);
  const lower = trigramByBinary(lowerBin);
  const upper = trigramByBinary(upperBin);

  const found = HEXAGRAM_RAW.find(
    ([, , up, low]) => up === upper.id && low === lower.id
  );
  if (!found) {
    throw new Error(`未找到对应别卦: 上${upper.name} 下${lower.name}`);
  }
  const [, name, , ] = found;
  const lines: HexLine[] = linesBin.map((v, i) => {
    const yin = v === 0;
    const isChanging = changing[i];
    let value: 6 | 7 | 8 | 9;
    if (isChanging) value = yin ? 6 : 9;
    else value = yin ? 8 : 7;
    return { yin, changing: isChanging, value };
  });

  return { seq: found[0], name, upper, lower, lines };
}

// ---------- 起卦方法 ----------

// 三枚铜钱法：连续六次，自下而上
function castCoin(question?: string): CastResult {
  const bins: number[] = [];
  const changing: boolean[] = [];
  const tosses: number[][] = [];
  const notes: string[] = [];

  for (let i = 0; i < 6; i++) {
    const toss = [rand01(), rand01(), rand01()];
    const yang = toss.reduce((a, b) => a + b, 0);
    let yin: boolean, isChanging: boolean, label: string;
    if (yang === 3) { yin = false; isChanging = true; label = '老阳 ○（三正，阳极生阴，为变爻）'; }
    else if (yang === 2) { yin = false; isChanging = false; label = '少阳 —（两正一反，静爻）'; }
    else if (yang === 1) { yin = true; isChanging = false; label = '少阴 --（两反一正，静爻）'; }
    else { yin = true; isChanging = true; label = '老阴 ×（三反，阴极生阳，为变爻）'; }

    bins.push(yin ? 0 : 1);
    changing.push(isChanging);
    tosses.push(toss);
    notes.push(`第${i + 1}爻（${['初', '二', '三', '四', '五', '上'][i]}）：${label}`);
  }

  const benGua = buildHexagram(bins, changing);
  // 补充铜钱抛掷明细
  benGua.lines.forEach((ln, i) => { ln.toss = tosses[i]; });

  let zhiGua: HexagramInfo | null = null;
  const changingPositions = changing.map((c, i) => (c ? i + 1 : 0)).filter(Boolean) as number[];
  if (changingPositions.length > 0) {
    const newBins = bins.map((b, i) => (changing[i] ? (b === 1 ? 0 : 1) : b));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }

  return {
    method: 'coin',
    question,
    benGua,
    zhiGua,
    changingPositions,
    notes: '【三枚铜钱法】六次抛掷，自下而上得六爻：\n' + notes.join('\n'),
  };
}

// 数字起卦（梅花易数·两数法）：上卦=数一÷8余，下卦=数二÷8余，动爻=(数一+数二)÷6余
function castNumber(numbers: number[], question?: string): CastResult {
  if (!numbers || numbers.length < 2) {
    throw new Error('数字起卦需要提供两个数字');
  }
  const [a, b] = numbers;
  const upper = trigramByMod8(a);
  const lower = trigramByMod8(b);
  let dong = (a + b) % 6;
  if (dong === 0) dong = 6;

  const bins = [...lower.binary, ...upper.binary];
  const changing = new Array(6).fill(false);
  changing[dong - 1] = true;

  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  if (changing[dong - 1]) {
    const newBins = bins.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }

  const notes = [
    `数字一 ${a} → 上卦 ${upper.name}（${upper.nature}）`,
    `数字二 ${b} → 下卦 ${lower.name}（${lower.nature}）`,
    `两数之和 ${a + b} → 动爻第 ${dong} 爻`,
  ].join('\n');

  return {
    method: 'number',
    question,
    benGua,
    zhiGua,
    changingPositions: [dong],
    notes: '【数字起卦·梅花易数】\n' + notes,
  };
}

// 时间起卦（梅花易数）：以公历年月日时取数
// 上卦=(年+月+日)%8，下卦=(年+月+日+时)%8，动爻=(年+月+日+时)%6
function castTime(timestamp?: number, question?: string): CastResult {
  const d = timestamp ? new Date(timestamp) : new Date();
  const Y = d.getFullYear();
  const M = d.getMonth() + 1;
  const D = d.getDate();
  const H = d.getHours();

  const upper = trigramByMod8(Y + M + D);
  const lower = trigramByMod8(Y + M + D + H);
  let dong = (Y + M + D + H) % 6;
  if (dong === 0) dong = 6;

  const bins = [...lower.binary, ...upper.binary];
  const changing = new Array(6).fill(false);
  changing[dong - 1] = true;

  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  if (changing[dong - 1]) {
    const newBins = bins.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }

  const notes = [
    `时间 ${Y}年${M}月${D}日 ${H}时`,
    `上卦 (年+月+日=${Y + M + D}) → ${upper.name}（${upper.nature}）`,
    `下卦 (年+月+日+时=${Y + M + D + H}) → ${lower.name}（${lower.nature}）`,
    `动爻 (和÷6=${Y + M + D + H}) → 第 ${dong} 爻`,
  ].join('\n');

  return {
    method: 'time',
    question,
    benGua,
    zhiGua,
    changingPositions: [dong],
    notes: '【时间起卦·梅花易数】\n' + notes,
  };
}

// 方位起卦：方位 key → 先天八卦数（1乾 2兑 3离 4震 5巽 6坎 7艮 8坤）
const DIR_NUM: Record<string, number> = {
  qian: 1, dui: 2, li: 3, zhen: 4, xun: 5, kan: 6, gen: 7, kun: 8,
};

// 汉字起卦（按字占）：取每个字的 Unicode 码点之数，依先天八卦定卦
function castChar(chars: string, question?: string): CastResult {
  const text = (chars || '').replace(/\s/g, '');
  if (!text) throw new Error('请填写至少一个汉字');
  const arr = [...text];
  const cps = arr.map((ch) => ch.codePointAt(0) || 0);
  const n = cps.length;
  const mid = Math.ceil(n / 2);
  const upSum = cps.slice(0, mid).reduce((a, b) => a + b, 0);
  const lowSum = cps.slice(mid).reduce((a, b) => a + b, 0);
  const total = cps.reduce((a, b) => a + b, 0);

  const upper = trigramByMod8(upSum);
  const lower = trigramByMod8(lowSum);
  let dong = total % 6;
  if (dong === 0) dong = 6;

  const bins = [...lower.binary, ...upper.binary];
  const changing = new Array(6).fill(false);
  changing[dong - 1] = true;

  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  if (changing[dong - 1]) {
    const newBins = bins.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }

  const notes = [
    `所起之字：「${text}」（共 ${n} 字）`,
    `前半「${arr.slice(0, mid).join('')}」取数 ${upSum} → 上卦 ${upper.name}（${upper.nature}）`,
    `后半「${arr.slice(mid).join('')}」取数 ${lowSum} → 下卦 ${lower.name}（${lower.nature}）`,
    `全字之和 ${total} → 动爻第 ${dong} 爻`,
  ].join('\n');

  return {
    method: 'char',
    question,
    benGua,
    zhiGua,
    changingPositions: [dong],
    notes: '【汉字起卦·梅花易数·按字占】\n' + notes,
  };
}

// 方位起卦（端法后天占）：上卦取面向方位之先天数，下卦取此刻时辰之数，二者之和定动爻
function castDirection(direction: string, question?: string): CastResult {
  const num = DIR_NUM[direction];
  if (!num) throw new Error('请选择方位');
  const d = new Date();
  const hour = d.getHours();
  const shichen = Math.floor(hour / 2) + 1; // 1-12（子1…亥12）

  const upper = trigramByMod8(num);
  const lower = trigramByMod8(shichen);
  let dong = (num + shichen) % 6;
  if (dong === 0) dong = 6;

  const bins = [...lower.binary, ...upper.binary];
  const changing = new Array(6).fill(false);
  changing[dong - 1] = true;

  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  if (changing[dong - 1]) {
    const newBins = bins.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }

  const notes = [
    `面向方位：先天数 ${num} → 上卦 ${upper.name}（${upper.nature}）`,
    `此刻时辰：约第 ${shichen} 时（当地 ${hour} 点）→ 下卦 ${lower.name}（${lower.nature}）`,
    `方位 + 时辰 = ${num + shichen} → 动爻第 ${dong} 爻`,
  ].join('\n');

  return {
    method: 'direction',
    question,
    benGua,
    zhiGua,
    changingPositions: [dong],
    notes: '【方位起卦·梅花易数·端法】\n' + notes,
  };
}

// 声音起卦（梅花易数·听声）：声数定上卦、句数定下卦、二者之和定动爻
function castSound(sound: { count: number; sentences: number }, question?: string): CastResult {
  const a = Math.max(1, Math.floor(sound.count || 1));
  const b = Math.max(1, Math.floor(sound.sentences || 1));
  const upper = trigramByMod8(a);
  const lower = trigramByMod8(b);
  let dong = (a + b) % 6;
  if (dong === 0) dong = 6;

  const bins = [...lower.binary, ...upper.binary];
  const changing = new Array(6).fill(false);
  changing[dong - 1] = true;

  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  if (changing[dong - 1]) {
    const newBins = bins.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }

  const notes = [
    `所闻之声：${a} 声 → 上卦 ${upper.name}（${upper.nature}）`,
    `所言句数：${b} 句 → 下卦 ${lower.name}（${lower.nature}）`,
    `声 + 句 = ${a + b} → 动爻第 ${dong} 爻`,
  ].join('\n');

  return {
    method: 'sound',
    question,
    benGua,
    zhiGua,
    changingPositions: [dong],
    notes: '【声音起卦·梅花易数·听声】\n' + notes,
  };
}

// 报数起卦（梅花易数·报数）：报 1 数则上下卦相承，报 2 数同数字法
function castReport(numbers: number[], question?: string): CastResult {
  if (!numbers || numbers.length < 1) throw new Error('报数起卦需要至少一个数字');
  let upper: TrigramInfo, lower: TrigramInfo, dong: number, formula: string;
  if (numbers.length === 1) {
    const n = Math.max(1, Math.floor(numbers[0]));
    upper = trigramByMod8(n);
    lower = trigramByMod8(n + 1);
    dong = (2 * n) % 6;
    if (dong === 0) dong = 6;
    formula = `报数 ${n}：上卦(${n}%8) 下卦(${n}+1)%8 动爻(2×${n})%6`;
  } else {
    const [a, b] = numbers;
    upper = trigramByMod8(a);
    lower = trigramByMod8(b);
    dong = (a + b) % 6;
    if (dong === 0) dong = 6;
    formula = `报数 ${a}、${b}：上卦(${a}%8) 下卦(${b}%8) 动爻(${a}+${b})%6`;
  }
  const changing = new Array(6).fill(false);
  changing[dong - 1] = true;
  const bins = [...lower.binary, ...upper.binary];
  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  if (changing[dong - 1]) {
    const newBins = bins.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }
  const notes = [
    formula,
    `上卦 ${upper.name}（${upper.nature}） · 下卦 ${lower.name}（${lower.nature}） · 动爻第 ${dong} 爻`,
  ].join('\n');
  return { method: 'report', question, benGua, zhiGua, changingPositions: [dong], notes: '【报数起卦·梅花易数】\n' + notes };
}

// 姓名生辰起卦（梅花易数·姓名生辰占）：姓名所禀之数定上卦，生辰年月日之和定下卦，
// 姓名与生辰之和再合以性别（男 1 女 2）取余定动爻。一人一卦，宜问终身、姻缘、前程。
function castPerson(
  info: { name?: string; birthday?: string; gender?: 'male' | 'female' },
  question?: string
): CastResult {
  const nm = (info.name || '').trim();
  if (!nm) throw new Error('请填写姓名');
  const cps = [...nm].map((ch) => ch.codePointAt(0) || 0);
  const nameSum = cps.reduce((a, b) => a + b, 0);

  const bd = info.birthday ? new Date(info.birthday) : new Date();
  if (Number.isNaN(bd.getTime())) throw new Error('生日格式有误');
  const Y = bd.getFullYear();
  const M = bd.getMonth() + 1;
  const D = bd.getDate();
  const genderNum = info.gender === 'female' ? 2 : 1; // 男 1 女 2

  const upper = trigramByMod8(nameSum);
  const lower = trigramByMod8(Y + M + D);
  let dong = (nameSum + Y + M + D + genderNum) % 6;
  if (dong === 0) dong = 6;

  const bins = [...lower.binary, ...upper.binary];
  const changing = new Array(6).fill(false);
  changing[dong - 1] = true;

  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  if (changing[dong - 1]) {
    const newBins = bins.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }

  const notes = [
    `姓名「${nm}」所禀之数 ${nameSum} → 上卦 ${upper.name}（${upper.nature}）`,
    `生辰 ${Y}年${M}月${D}日 → 下卦 ${lower.name}（${lower.nature}）`,
    `姓名 + 生辰 + 性别(${genderNum}) = ${nameSum + Y + M + D + genderNum} → 动爻第 ${dong} 爻`,
  ].join('\n');

  return {
    method: 'person',
    question,
    benGua,
    zhiGua,
    changingPositions: [dong],
    notes: '【姓名生辰起卦·梅花易数】\n' + notes,
  };
}

// 揲蓍法（大衍筮法）：五十策，分二挂一揲四归奇，三变成一爻，十八变成一卦
// 记录每一爻的三变明细，供前端分步演示
function yarrowOneYao(pos: number): YarrowYao {
  let total = 49;
  const steps: YarrowStep[] = [];
  for (let bian = 1; bian <= 3; bian++) {
    const before = total;
    // 分二：随机分作左右两手（左手至少 1，右手至少留出挂一）
    const left = 1 + Math.floor(Math.random() * (before - 2));
    const right = before - left;
    const rightAfter = right - 1; // 挂一：从右手取一策挂于指间
    const remL = left % 4 || 4;   // 揲四归奇：左手数四之余
    const remR = rightAfter % 4 || 4; // 右手数四之余
    const removed = remL + remR + 1;
    const after = before - removed;
    steps.push({ bian, before, left, right, gua: 1, remL, remR, removed, after });
    total = after;
  }
  const count = total / 4;
  let value: 6 | 7 | 8 | 9;
  if (total === 24) value = 6;
  else if (total === 28) value = 7;
  else if (total === 32) value = 8;
  else value = 9;
  const label = value === 6 ? '老阴 ×（变）' : value === 7 ? '少阳 —' : value === 8 ? '少阴 --' : '老阳 ○（变）';
  return { pos, steps, total, count, value, label };
}

function castYarrow(question?: string): CastResult {
  const bins: number[] = [];
  const changing: boolean[] = [];
  const notes: string[] = [];
  const yarrowSteps: YarrowYao[] = [];
  const names = ['初', '二', '三', '四', '五', '上'];
  for (let i = 0; i < 6; i++) {
    const yao = yarrowOneYao(i + 1);
    yarrowSteps.push(yao);
    const yin = yao.value === 6 || yao.value === 8;
    const isChanging = yao.value === 6 || yao.value === 9;
    bins.push(yin ? 0 : 1);
    changing.push(isChanging);
    notes.push(`第${i + 1}爻（${names[i]}）：三变得 ${yao.total} 策（÷4 = ${yao.count}）→ ${yao.label}`);
  }
  const benGua = buildHexagram(bins, changing);
  let zhiGua: HexagramInfo | null = null;
  const changingPositions = changing.map((c, i) => (c ? i + 1 : 0)).filter(Boolean) as number[];
  if (changingPositions.length > 0) {
    const newBins = bins.map((b, i) => (changing[i] ? (b === 1 ? 0 : 1) : b));
    zhiGua = buildHexagram(newBins, new Array(6).fill(false));
  }
  return {
    method: 'yarrow',
    question,
    benGua,
    zhiGua,
    changingPositions,
    notes: '【揲蓍法·大衍之数】以五十策，三变成一爻，十八变而成卦：\n' + notes.join('\n'),
    yarrowSteps,
  };
}

// ============================================================
// 纳甲六爻排盘（京房纳甲）
// ============================================================
// 八卦纳甲（京房）：每一经卦占内/外卦时所纳的天干与三爻地支
// 内卦配初二三爻，外卦配四五上爻；乾坤内外异干，余六卦内外同干
const TRIGRAM_NAJIA: Record<
  string,
  { inner: { stem: string; branches: [string, string, string] }; outer: { stem: string; branches: [string, string, string] } }
> = {
  qian: { inner: { stem: '甲', branches: ['子', '寅', '辰'] }, outer: { stem: '壬', branches: ['午', '申', '戌'] } },
  kun:  { inner: { stem: '乙', branches: ['未', '巳', '卯'] }, outer: { stem: '癸', branches: ['丑', '亥', '酉'] } },
  zhen: { inner: { stem: '庚', branches: ['子', '寅', '辰'] }, outer: { stem: '庚', branches: ['午', '申', '戌'] } },
  kan:  { inner: { stem: '戊', branches: ['寅', '辰', '午'] }, outer: { stem: '戊', branches: ['申', '戌', '子'] } },
  gen:  { inner: { stem: '丙', branches: ['辰', '午', '申'] }, outer: { stem: '丙', branches: ['戌', '子', '寅'] } },
  xun:  { inner: { stem: '辛', branches: ['丑', '亥', '酉'] }, outer: { stem: '辛', branches: ['未', '巳', '卯'] } },
  li:   { inner: { stem: '己', branches: ['卯', '丑', '亥'] }, outer: { stem: '己', branches: ['酉', '未', '巳'] } },
  dui:  { inner: { stem: '丁', branches: ['巳', '卯', '丑'] }, outer: { stem: '丁', branches: ['亥', '酉', '未'] } },
};
const PALACE_ELEMENT: Record<string, string> = {
  qian: '金', dui: '金', kan: '水', zhen: '木', xun: '木', li: '火', gen: '土', kun: '土',
};
// 八宫世位表：键 `${上}_${下}` → [宫首卦id, 世爻位]
const NAJIA_TABLE: Record<string, [string, number]> = {
  'qian_qian': ['qian', 6], 'qian_xun': ['qian', 1], 'qian_gen': ['qian', 2], 'qian_kun': ['qian', 3],
  'xun_kun': ['qian', 4], 'gen_kun': ['qian', 5], 'li_kun': ['qian', 4], 'li_qian': ['qian', 3],
  'kan_kan': ['kan', 6], 'kan_dui': ['kan', 1], 'kan_zhen': ['kan', 2], 'kan_li': ['kan', 3],
  'dui_li': ['kan', 4], 'zhen_li': ['kan', 5], 'kun_li': ['kan', 4], 'kun_kan': ['kan', 3],
  'gen_gen': ['gen', 6], 'gen_li': ['gen', 1], 'gen_qian': ['gen', 2], 'gen_dui': ['gen', 3],
  'li_dui': ['gen', 4], 'qian_dui': ['gen', 5], 'xun_dui': ['gen', 4], 'xun_gen': ['gen', 3],
  'zhen_zhen': ['zhen', 6], 'zhen_kun': ['zhen', 1], 'zhen_kan': ['zhen', 2], 'zhen_xun': ['zhen', 3],
  'kun_xun': ['zhen', 4], 'kan_xun': ['zhen', 5], 'dui_xun': ['zhen', 4], 'dui_zhen': ['zhen', 3],
  'xun_xun': ['xun', 6], 'xun_qian': ['xun', 1], 'xun_li': ['xun', 2], 'xun_zhen': ['xun', 3],
  'qian_zhen': ['xun', 4], 'li_zhen': ['xun', 5], 'gen_zhen': ['xun', 4], 'gen_xun': ['xun', 3],
  'li_li': ['li', 6], 'li_gen': ['li', 1], 'li_xun': ['li', 2], 'li_kan': ['li', 3],
  'gen_kan': ['li', 4], 'xun_kan': ['li', 5], 'qian_kan': ['li', 4], 'qian_li': ['li', 3],
  'kun_kun': ['kun', 6], 'kun_zhen': ['kun', 1], 'kun_dui': ['kun', 2], 'kun_qian': ['kun', 3],
  'zhen_qian': ['kun', 4], 'dui_qian': ['kun', 5], 'kan_qian': ['kun', 4], 'kan_kun': ['kun', 3],
  'dui_dui': ['dui', 6], 'dui_kan': ['dui', 1], 'dui_kun': ['dui', 2], 'dui_gen': ['dui', 3],
  'kan_gen': ['dui', 4], 'kun_gen': ['dui', 5], 'zhen_gen': ['dui', 4], 'zhen_dui': ['dui', 3],
};

const BRANCH_ELEMENT: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};
const SHENS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const TRIGRAM_NAME: Record<string, string> = {
  qian: '乾', dui: '兑', kan: '坎', zhen: '震', xun: '巽', li: '离', gen: '艮', kun: '坤',
};

function branchElement(b: string): string {
  return BRANCH_ELEMENT[b] || '土';
}
function liuQinOf(palaceEl: string, yaoEl: string): LiuQin {
  if (yaoEl === palaceEl) return '兄弟';
  if (SHENG[palaceEl] === yaoEl) return '子孙'; // 我生
  if (KE[palaceEl] === yaoEl) return '妻财'; // 我克
  if (SHENG[yaoEl] === palaceEl) return '父母'; // 生我
  return '官鬼'; // 克我
}
function dayGanIndex(d: Date): number {
  const gy = d.getFullYear();
  const gm = d.getMonth() + 1;
  const gd = d.getDate();
  let C = Math.floor(gy / 100);
  let y = gy % 100;
  let m = gm;
  if (m < 3) {
    y -= 1;
    C = Math.floor((gy - 1) / 100);
  }
  const gz = (Math.floor(C / 4) - 2 * C + y + Math.floor(y / 4) + Math.floor((13 * (m + 1)) / 5) + gd - 1) % 60;
  return ((gz % 10) + 10) % 10;
}

// 对任意别卦排纳甲盘（干支/六亲/世应/六神）
function najiaForHex(hex: HexagramInfo, date: Date): NajiaData {
  const key = `${hex.upper.id}_${hex.lower.id}`;
  const entry = NAJIA_TABLE[key];
  if (!entry) throw new Error('未知卦宫：' + key);
  const [palaceId, shi] = entry;
  const palaceEl = PALACE_ELEMENT[palaceId];
  const ying = ((shi - 1 + 3) % 6) + 1;
  // 内卦（下卦）纳初二三爻，外卦（上卦）纳四五上爻，各依经卦纳甲
  const innerNa = TRIGRAM_NAJIA[hex.lower.id].inner;
  const outerNa = TRIGRAM_NAJIA[hex.upper.id].outer;
  const gan = dayGanIndex(date);
  const shenStart = gan < 2 ? 0 : gan < 4 ? 1 : gan < 6 ? 2 : gan < 8 ? 4 : 5;
  const lines: NajiaLine[] = hex.lines.map((ln, i) => {
    const na = i < 3 ? innerNa : outerNa;
    const branch = na.branches[i % 3];
    const stem = na.stem;
    const yaoEl = branchElement(branch);
    return {
      pos: i + 1,
      yin: ln.yin,
      changing: ln.changing,
      ganzhi: stem + branch,
      liuQin: liuQinOf(palaceEl, yaoEl),
      liuShen: SHENS[(shenStart + i) % 6],
    };
  });
  return {
    palace: TRIGRAM_NAME[palaceId] + '宫',
    palaceElement: palaceEl,
    world: shi,
    ying,
    lines,
  };
}

export function getNajia(cast: CastResult, date: Date = new Date()): NajiaData {
  return najiaForHex(cast.benGua, date);
}

function rand01(): number {
  return Math.random() < 0.5 ? 0 : 1;
}

// 统一入口
export function castDivination(req: CastRequest): CastResult {
  let result: CastResult;
  switch (req.method) {
    case 'coin':
      result = castCoin(req.question);
      break;
    case 'number':
      result = castNumber(req.numbers || [], req.question);
      break;
    case 'time':
      result = castTime(req.timestamp, req.question);
      break;
    case 'char':
      result = castChar(req.chars || '', req.question);
      break;
    case 'direction':
      result = castDirection(req.direction || '', req.question);
      break;
    case 'sound': {
      const s = req.sound || { count: 1, sentences: 1 };
      result = castSound(s, req.question);
      break;
    }
    case 'report':
      result = castReport(req.numbers || [], req.question);
      break;
    case 'person':
      result = castPerson({ name: req.name, birthday: req.birthday, gender: req.gender }, req.question);
      break;
    case 'yarrow':
      result = castYarrow(req.question);
      break;
    default:
      throw new Error('未知的起卦方式');
  }
  if (req.najia) {
    const now = new Date();
    result.najia = najiaForHex(result.benGua, now);
    result.najiaZhi = result.zhiGua ? najiaForHex(result.zhiGua, now) : null;
  }
  return result;
}

// 将起卦结果转为注入 systemPrompt 的文本，指导模型依据此卦象解读
export function hexagramToPrompt(cast: CastResult): string {
  const { benGua, zhiGua, changingPositions } = cast;
  const lineStr = benGua.lines
    .map((l, i) => {
      const posName = ['初', '二', '三', '四', '五', '上'][i];
      const yao = l.yin ? '阴' : '阳';
      const mark = l.changing ? (l.yin ? ' ×老阴(变)' : ' ○老阳(变)') : '';
      return `${posName}爻·${yao}${mark}`;
    })
    .join('，');

  let text = '【本次卦象已经由系统为你起卦，请严格依据以下卦象解读，切勿自行另起一卦】\n';
  text += `本卦：第${benGua.seq}卦 ${benGua.name}（上${benGua.upper.nature}下${benGua.lower.nature}）\n`;
  text += `六爻（自下而上）：\n${lineStr}\n`;
  if (zhiGua) {
    text += `之卦（变卦）：第${zhiGua.seq}卦 ${zhiGua.name}（上${zhiGua.upper.nature}下${zhiGua.lower.nature}），变爻位于第 ${changingPositions.join('、')} 爻\n`;
  } else {
    text += `六爻皆静，无变爻，无需推之卦。\n`;
  }
  text += '请严格依据上述卦象，结合来访者所问之事，依次给出：① 本卦卦辞与白话释义；② 对应爻位之爻辞与释义（有变爻则重点引述变爻爻辞）；③ 若有之卦，简述变卦要旨；④ 通达可行的断卦指引与处世提醒；⑤ 最后务必单独成段，先以「## 总结」为标题行独占一行，其下用最通俗的现代白话，把核心建议浓缩成 2-4 句大白话，少引古文、多说人话，让来访者一看就懂、便于落实。语气古朴通达，如长者点拨。';
  return text;
}

// ============================================================
// 每日一卦 / 每日一句 / 今日宜忌（按日期确定，全天一致）
// ============================================================

// 由 [seq, name, upperId, lowerId] 构造精简的每日卦信息
export interface DailyHexagram {
  seq: number;
  name: string;
  upper: { name: string; nature: string; binary: number[] };
  lower: { name: string; nature: string; binary: number[] };
  guaYi: string; // 一句卦义
}

// 每卦一句卦义（精简，用于今日一卦卡片副标题）
const HEX_YI: Record<number, string> = {
  1: '刚健中正，自强不息', 2: '厚德载物，顺势包容', 3: '万物始生，艰难创始', 4: '蒙以养正，启蒙求真',
  5: '云上于天，待时而动', 6: '天水违行，慎争止讼', 7: '兵众之道，纪律严明', 8: '亲比相辅，择善而从',
  9: '小有蓄积，待时奋发', 10: '履危而安，谨慎前行', 11: '天地交泰，通达和合', 12: '天地不交，闭塞隐忍',
  13: '同人于野，和同协作', 14: '大有所得，谦守其富', 15: '地中有山，谦尊而光', 16: '雷出地奋，顺动愉悦',
  17: '随顺时宜，从善而迁', 18: '蛊坏当拯，整治革新', 19: '临下观民，教思无穷', 20: '风行地上，观察省视',
  21: '刚柔相摩，明罚敕法', 22: '质饰文采，尚美有节', 23: '剥落侵蚀，顺势止避', 24: '一阳来复，生机回还',
  25: '无妄之诚，顺天不妄', 26: '大畜厚积，止而后行', 27: '颐养正道，慎言节食', 28: '大过非常，独立不惧',
  29: '重险习坎，维心亨通', 30: '明两作离，附丽光明', 31: '少男少女，感应以通', 32: '恒久不已，立不易方',
  33: '天山遁退，适时隐避', 34: '阳刚壮盛，谨守其壮', 35: '火地普照，进取上进', 36: '明入地中，韬光养晦',
  37: '家人有严，正家之道', 38: '火泽相违，求同存异', 39: '见险止步，反身修德', 40: '险难消解，舒缓解脱',
  41: '损下益上，节用修德', 42: '损上益下，与时偕行', 43: '决而能和，刚断小人', 44: '一阴遇阳，防微杜渐',
  45: '泽聚于地，荟萃汇聚', 46: '地中升木，积小成高', 47: '泽中无水，困穷守志', 48: '井养不穷，修身惠民',
  49: '泽火相革，顺天应人', 50: '鼎新取象，稳重致远', 51: '洊雷震动，恐惧修省', 52: '兼山为止，安重静守',
  53: '山上有木，渐次而成', 54: '归妹失正，慎防逾矩', 55: '雷电皆至，丰大有时', 56: '山上有火，行旅谨慎',
  57: '随风巽顺，谦逊申命', 58: '丽泽相悦，和悦沟通', 59: '风行水上，涣散而通', 60: '泽上有水，节制有度',
  61: '中孚信及，诚信感物', 62: '小过可行，谨守细微', 63: '既济已成，防生懈怠', 64: '未济未穷，慎终如始',
};

const HEXAGRAMS: DailyHexagram[] = HEXAGRAM_RAW.map(([seq, name, up, low]) => ({
  seq,
  name,
  upper: { name: TRIGRAMS[up].name, nature: TRIGRAMS[up].nature, binary: TRIGRAMS[up].binary },
  lower: { name: TRIGRAMS[low].name, nature: TRIGRAMS[low].nature, binary: TRIGRAMS[low].binary },
  guaYi: HEX_YI[seq] || '',
}));

// 每日一句《易经》（精选，按日期轮替）
const DAILY_QUOTES: { text: string; source: string }[] = [
  { text: '天行健，君子以自强不息。', source: '乾卦·象传' },
  { text: '地势坤，君子以厚德载物。', source: '坤卦·象传' },
  { text: '积善之家，必有余庆；积不善之家，必有余殃。', source: '坤卦·文言' },
  { text: '君子藏器于身，待时而动。', source: '系辞下' },
  { text: '穷则变，变则通，通则久。', source: '系辞下' },
  { text: '二人同心，其利断金；同心之言，其臭如兰。', source: '系辞上' },
  { text: '君子见几而作，不俟终日。', source: '系辞下' },
  { text: '谦谦君子，卑以自牧也。', source: '谦卦·象传' },
  { text: '亢龙有悔，盈不可久也。', source: '乾卦·文言' },
  { text: '君子以俭德避难，不可荣以禄。', source: '否卦·象传' },
  { text: '不远复，无祗悔，元吉。', source: '复卦·爻辞' },
  { text: '君子以思不出其位。', source: '艮卦·象传' },
  { text: '日月丽乎天，百谷草木丽乎土。', source: '离卦·象传' },
  { text: '君子以朋友讲习。', source: '兑卦·象传' },
  { text: '风行水上，自然成文。', source: '涣卦·象传' },
  { text: '时止则止，时行则行。', source: '艮卦·彖传' },
  { text: '善不积不足以成名，恶不积不足以灭身。', source: '系辞下' },
  { text: '君子以顺德，积小以高大。', source: '升卦·象传' },
  { text: '君子以反身修德。', source: '蹇卦·象传' },
  { text: '汤武革命，顺乎天而应乎人。', source: '革卦·彖传' },
  { text: '君子以虚受人。', source: '咸卦·象传' },
  { text: '劳谦君子，有终吉。', source: '谦卦·爻辞' },
  { text: '君子以慎辨物居方。', source: '未济·象传' },
  { text: '不出户庭，知通塞也。', source: '节卦·爻辞' },
  { text: '君子以作事谋始。', source: '讼卦·象传' },
  { text: '观乎天文，以察时变；观乎人文，以化成天下。', source: '贲卦·彖传' },
  { text: '易有太极，是生两仪，两仪生四象，四象生八卦。', source: '系辞上' },
  { text: '仁者见之谓之仁，知者见之谓之知。', source: '系辞上' },
  { text: '君子安而不忘危，存而不忘亡，治而不忘乱。', source: '系辞下' },
  { text: '慢藏海盗，冶容诲淫。', source: '系辞上' },
  { text: '君子以恐惧修省。', source: '震卦·象传' },
  { text: '君子以同而异。', source: '睽卦·象传' },
  { text: '寒往则暑来，暑往则寒来，寒暑相推而岁成焉。', source: '系辞下' },
  { text: '君子以遏恶扬善，顺天休命。', source: '大有·象传' },
  { text: '即鹿无虞，惟入于林中。', source: '屯卦·爻辞' },
  { text: '君子以制数度，议德行。', source: '节卦·象传' },
];

// 八卦 → 宜忌（按自然属性推导）
const NATURE_YIJI: Record<string, { yi: string[]; ji: string[] }> = {
  天: { yi: ['立约决策', '进取图强', '登高位谋'], ji: ['骄盈自满', '刚愎自用', '恃强凌弱'] },
  地: { yi: ['包容蓄势', '合作顺势', '厚养根基'], ji: ['妄动争先', '轻率冒进', '独占独断'] },
  水: { yi: ['谨慎守险', '静思养智', '深谋远虑'], ji: ['冒险涉险', '急躁冒进', '随波逐流'] },
  火: { yi: ['明察秋毫', '文饰光明', '昭信于人'], ji: ['虚浮夸饰', '躁动失序', '蔽于私欲'] },
  雷: { yi: ['奋发行动', '警醒戒惧', '当机立断'], ji: ['慌乱无措', '冲动妄为', '迟疑不决'] },
  山: { yi: ['止息沉淀', '稳守静养', '思不出位'], ji: ['妄进喧哗', '贪多求快', '轻举妄动'] },
  风: { yi: ['谦逊申命', '顺势推行', '反复叮咛'], ji: ['犹豫反复', '刚愎拒谏', '急躁冒进'] },
  泽: { yi: ['和悦沟通', '喜悦交友', '润泽于人'], ji: ['口舌是非', '轻佻戏谑', '巧言令色'] },
};

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

// 由日期确定今日卦（全年不同，当天恒定）
export function getDailyHexagram(date: Date): DailyHexagram {
  const seed = date.getFullYear() * 1000 + dayOfYear(date);
  const idx = ((seed % 64) + 64) % 64;
  return HEXAGRAMS[idx];
}

// 由日期确定每日一句
export function getDailyQuote(date: Date): { text: string; source: string } {
  const idx = dayOfYear(date) % DAILY_QUOTES.length;
  return DAILY_QUOTES[idx];
}

// 由今日卦推今日宜忌（上卦+下卦属性合并）
export function getDailyYiJi(hex: DailyHexagram): { yi: string[]; ji: string[] } {
  const up = NATURE_YIJI[hex.upper.nature] || { yi: [], ji: [] };
  const low = NATURE_YIJI[hex.lower.nature] || { yi: [], ji: [] };
  const yi = Array.from(new Set([...up.yi, ...low.yi])).slice(0, 4);
  const ji = Array.from(new Set([...up.ji, ...low.ji])).slice(0, 4);
  return { yi, ji };
}

// 汇总：返回当日全套数据
export function getDailyData(date: Date = new Date()): {
  date: string;
  weekday: string;
  hexagram: DailyHexagram;
  yi: string[];
  ji: string[];
  quote: { text: string; source: string };
} {
  const hex = getDailyHexagram(date);
  const { yi, ji } = getDailyYiJi(hex);
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    date: dateStr,
    weekday: '星期' + WEEK[date.getDay()],
    hexagram: hex,
    yi,
    ji,
    quote: getDailyQuote(date),
  };
}
