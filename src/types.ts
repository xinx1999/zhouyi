// 周易算 · 前端类型定义（与 server/divination.ts 输出对齐）

export type CastMethod = 'coin' | 'number' | 'time' | 'char' | 'direction' | 'sound' | 'report' | 'yarrow' | 'person';

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

// 纳甲六爻排盘（京房纳甲）
export type LiuQin = '父母' | '官鬼' | '妻财' | '子孙' | '兄弟';
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武';

export interface NajiaLine {
  pos: number;
  yin: boolean;
  changing: boolean;
  ganzhi: string;
  liuQin: LiuQin;
  liuShen: LiuShen;
}

export interface NajiaData {
  palace: string;
  palaceElement: string;
  world: number;
  ying: number;
  lines: NajiaLine[];
}

// 揲蓍法·一变明细
export interface YarrowStep {
  bian: number;
  before: number;
  left: number;
  right: number;
  gua: number;
  remL: number;
  remR: number;
  removed: number;
  after: number;
}

// 揲蓍法·一爻（三变）明细
export interface YarrowYao {
  pos: number;
  steps: YarrowStep[];
  total: number;
  count: number;
  value: 6 | 7 | 8 | 9;
  label: string;
}

export interface CastResult {
  method: CastMethod;
  question?: string;
  benGua: HexagramInfo; // 本卦（主卦）
  zhiGua: HexagramInfo | null; // 之卦（变卦），无变爻则为 null
  changingPositions: number[]; // 变爻位置（1-6）
  notes: string; // 起卦过程说明
  najia?: NajiaData | null; // 纳甲六爻排盘·本卦（仅 najia 模式附带）
  najiaZhi?: NajiaData | null; // 纳甲六爻排盘·变卦
  yarrowSteps?: YarrowYao[]; // 揲蓍法十八变分步演算
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hexagram?: CastResult | null;
  isStreaming?: boolean;
}

export interface ModelInfo {
  modelId: string;
  name: string;
  description?: string;
}

export interface CastRequest {
  method: CastMethod;
  question?: string;
  numbers?: number[];
  timestamp?: number;
  chars?: string;
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

// ---------- 每日 / 首页数据 ----------
export interface DailyHexagram {
  seq: number;
  name: string;
  upper: { name: string; nature: string; binary: number[] };
  lower: { name: string; nature: string; binary: number[] };
  guaYi: string;
}

export interface DailyData {
  date: string;
  weekday: string;
  hexagram: DailyHexagram;
  yi: string[];
  ji: string[];
  quote: { text: string; source: string };
}

export interface HistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  type?: 'chat' | 'lingqian';
  hexName?: string | null;
  hexSeq?: number | null;
  method?: string | null;
  // 求签（lingqian）类型携带
  num?: number | null;
  name?: string | null;
  level?: string | null;
  source?: string | null;
  // 起卦/对话是否未完成（解读中断未落库）；灵签记录恒为已完成
  incomplete?: boolean;
}
