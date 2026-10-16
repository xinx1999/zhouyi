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

// ---------- 断卦要素（由后端起卦引擎算定，前端只做展示） ----------

export interface GanZhiPillar {
  gan: string;
  zhi: string;
  ganZhi: string;
}

export interface GanZhiTime {
  year: GanZhiPillar;
  month: GanZhiPillar;
  day: GanZhiPillar;
  hour: GanZhiPillar;
  jieQi?: string;
}

// 空亡状态：空 / 动空 / 冲空（不空）/ 临建（不空）
export type KongWangState = 'not_kong' | 'kong_static' | 'kong_changing' | 'kong_ri_chong' | 'kong_yue_jian';

export const KONG_WANG_LABELS: Record<KongWangState, string> = {
  not_kong: '',
  kong_static: '空',
  kong_changing: '动空',
  kong_ri_chong: '冲空',
  kong_yue_jian: '临建',
};

export type WangShuai = '旺' | '相' | '休' | '囚' | '死';
export type WuXingRelation = '比和' | '我生' | '我克' | '生我' | '克我';
export type YongShenTopic = 'career' | 'wealth' | 'document' | 'health' | 'people';

// 六爻：单爻分析
export interface LiuyaoLineAnalysis {
  pos: number;
  yin: boolean;
  changing: boolean;
  ganzhi: string;
  liuQin: string;
  liuShen: string;
  zhi: string;
  element: string;
  wangShuai: WangShuai;
  kongWang: KongWangState;
  isYongShen: boolean;
  isYuanShen: boolean;
  isJiShen: boolean;
  isChouShen: boolean;
  relWithDay: string;
  relWithMonth: string;
}

// 六爻：整体断卦要素
export interface LiuyaoAnalysis {
  ganZhi: GanZhiTime;
  monthZhi: string;
  dayGanZhi: string;
  kongWang: { xun: string; kong: [string, string] };
  isLiuChongGua: boolean;
  isLiuHeGua: boolean;
  yongShenTopic: YongShenTopic;
  yongShenLiuQin: string;
  lines: LiuyaoLineAnalysis[];
  yongShenPositions: number[];
  evidence: string[];
  timingHints: string[];
}

// 梅花：经卦引用 / 阶段 / 吉凶
export interface MeihuaTrigramRef {
  name: string;
  nature: string;
  element: string;
}

export interface MeihuaStage {
  stage: string;
  basis: string;
  relation: WuXingRelation;
  favorable: boolean;
  text: string;
}

export interface MeihuaJudgement {
  outcome: '吉' | '平' | '凶';
  summary: string;
  basis: string[];
}

// 梅花：整体断卦要素
export interface MeihuaAnalysis {
  ganZhi: GanZhiTime;
  monthZhi: string;
  bodyTrigram: MeihuaTrigramRef;
  useTrigram: MeihuaTrigramRef;
  bodyUseRelation: WuXingRelation;
  bodyUseFavorable: boolean;
  bodyUseText: string;
  nuclearHexagram: { seq: number; name: string } | null;
  oppositeHexagram: { seq: number; name: string };
  reversedHexagram: { seq: number; name: string };
  seasonalState: { monthZhi: string; body: WangShuai; use: WangShuai };
  stages: MeihuaStage[];
  judgement: MeihuaJudgement;
  timingHints: string[];
  evidence: string[];
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
  liuyao?: LiuyaoAnalysis | null; // 六爻断卦要素：空亡·用神·旺衰·应期
  meihua?: MeihuaAnalysis | null; // 梅花断卦要素：体用·生克·互错综·吉凶
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hexagram?: CastResult | null;
  bazi?: BaziChart | null;
  ziwei?: ZiweiChart | null;
  tarot?: TarotResult | null;
  qimen?: QimenChart | null;
  daliuren?: DaliurenChart | null;
  dream?: DreamResult | null;
  hepan?: HepanResult | null;
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
  // 六爻占问主题（决定用神）；缺省时由问题文本自动推断
  yongShenTopic?: YongShenTopic;
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

// ---------- 八字命盘 ----------

export interface BaziPillar {
  label: string; // 年 / 月 / 日 / 时
  gan: string;
  zhi: string;
  ganZhi: string;
  ganElement: string;
  zhiElement: string;
  shiShenGan: string; // 天干十神（日柱为「日主」）
  hideGan: string[]; // 地支藏干
  shiShenZhi: string[]; // 藏干对应十神
  naYin: string;
  diShi: string; // 十二长生
  xunKong: string;
}

export interface DaYunStep {
  startYear: number;
  endYear: number;
  startAge: number;
  ganZhi: string;
  liuNian: { year: number; age: number; ganZhi: string }[];
}

export interface BaziChart {
  name?: string;
  gender: 'male' | 'female';
  solarText: string;
  lunarText: string;
  dayMaster: string;
  dayMasterElement: string;
  pillars: BaziPillar[];
  wuXingCount: Record<string, number>;
  wuXingMissing: string[];
  relations: string[];
  shenSha: string[];
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  startYunText: string;
  daYun: DaYunStep[];
  evidence: string[];
}

// 出生信息（八字与紫微斗数共用）
export interface BirthInput {
  name?: string;
  gender: 'male' | 'female';
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

export type BaziInput = BirthInput;
export type ZiweiInput = BirthInput;

// ---------- 紫微斗数星盘 ----------

export interface ZiweiStar {
  name: string;
  brightness?: string; // 庙旺得利平陷
  mutagen?: string; // 禄 / 权 / 科 / 忌
}

export interface ZiweiPalace {
  index: number;
  name: string; // 命宫 / 兄弟 / 夫妻 / …
  heavenlyStem: string;
  earthlyBranch: string;
  ganZhi: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: string[];
  changsheng12: string;
  decadal: { range: [number, number]; ganZhi: string };
  ages: number[];
}

export interface ZiweiChart {
  name?: string;
  gender: 'male' | 'female';
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  timeRange: string;
  soul: string; // 命主
  body: string; // 身主
  fiveElementsClass: string; // 五行局
  zodiac: string;
  sign: string;
  palaces: ZiweiPalace[];
  evidence: string[];
}

// ---------- 塔罗 ----------

export type TarotSpread = 'single' | 'three-time' | 'celtic' | 'love' | 'yesno';

export interface TarotCard {
  id: string;
  name: string;
  arcana: 'major' | 'minor';
  suit?: string;
  element?: string;
  reversed: boolean;
  keywords: string;
  positionLabel: string;
}

export interface TarotResult {
  spread: TarotSpread;
  spreadName: string;
  question?: string;
  cards: TarotCard[];
  evidence: string[];
}

export interface TarotInput {
  spread: TarotSpread;
  question?: string;
  seed?: string;
}

// ---------- MBTI 性格测评 ----------

export type MbtiDimension = 'EI' | 'SN' | 'TF' | 'JP';

export interface MbtiQuestion {
  id: number;
  dim: MbtiDimension;
  text: string;
  a: string;
  b: string;
  aPole: string;
  bPole: string;
}

export interface MbtiDimensionScore {
  dim: MbtiDimension;
  letter: string;
  poleA: string;
  poleB: string;
  scoreA: number;
  scoreB: number;
  total: number;
  percentA: number;
  answered: number;
  label: string;
}

export interface MbtiTypeInfo {
  code: string;
  name: string;
  alias: string;
  strengths: string;
  watchouts: string;
}

export interface MbtiResult {
  code: string;
  type: MbtiTypeInfo;
  dimensions: MbtiDimensionScore[];
  answered: number;
  total: number;
  complete: boolean;
  evidence: string[];
}

// ---------- 奇门遁甲 ----------

export interface QimenPalace {
  index: number;
  palace: string; // 巽離坤震中兌艮坎乾
  direction: string;
  diPan: string; // 地盘干
  tianPan: string; // 天盘干
  door: string; // 八门
  star: string; // 九星
  god: string; // 八神
}

export interface QimenChart {
  solarText: string;
  fourPillars: string;
  jieQiName: string;
  yuanName: string;
  daysSinceJieQi: number;
  juShu: number;
  yinYang: string; // 陽 / 陰
  xunShou: string;
  fuShou: string;
  zhiFu: string;
  zhiFuPalace: string;
  zhiShi: string;
  zhiShiPalace: string;
  tianQinPalace: string;
  palaces: QimenPalace[];
  kongWang: { year: string; month: string; day: string; hour: string };
  evidence: string[];
}

export interface QimenInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

// ---------- 大六壬 ----------

export interface DlrKe {
  0: string; // 干支
  1: string; // 天将
}

export interface DlrChuan {
  0: string; // 地支
  1: string; // 天将
  2: string; // 六亲
  3: string; // 遁干
}

export interface DlrShenShaItem {
  name: string;
  value: string;
  description: string;
}

export interface DlrDateInfo {
  bazi: string;
  date: string;
  kong: string[];
  yima: string;
  yuejiang: string;
  xun: string;
  dingma: string;
  tianma: string;
}

export interface DlrGongPan {
  zhi: string;
  diPan: string;
  tianPan: string;
  tianJiang: string;
}

export interface DaliurenChart {
  dateInfo: DlrDateInfo;
  tianDiPan: { diPan: Record<string, string>; tianPan: Record<string, string>; tianJiang: Record<string, string> };
  siKe: { ke1: DlrKe; ke2: DlrKe; ke3: DlrKe; ke4: DlrKe };
  sanChuan: { chuChuan: DlrChuan; zhongChuan: DlrChuan; moChuan: DlrChuan; keTi: string };
  dunGan: Record<string, string>;
  chuJian: Record<string, string>;
  fuJian: Record<string, string>;
  jianChu: Record<string, string>;
  shenSha: DlrShenShaItem[];
  yinYangGuiRen: { yangGuiRen: Record<string, string>; yinGuiRen: Record<string, string> };
  pillars: string[];
  keTis: string[];
  evidence: string[];
}

export interface DaliurenInput {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  timestamp?: number;
}

// ---------- 周公解梦 ----------

export type DreamOmen = '吉' | '凶' | '中';

export interface DreamHit {
  id: string;
  name: string;
  category: string;
  omen: DreamOmen;
  meaning: string;
  matchedKeyword: string;
}

export interface DreamResult {
  dreamText: string;
  hits: DreamHit[];
  unmatched: boolean;
  evidence: string[];
}

export interface DreamInput {
  dreamText: string;
}

// ---------- 合盘（合婚） ----------

export interface HepanAspect {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
  favorable: boolean;
}

export interface HepanResult {
  personA: BaziChart;
  personB: BaziChart;
  aspects: HepanAspect[];
  totalScore: number;
  grade: string;
  gradeDesc: string;
  wuXingComplement: string[];
  naYinNote: string;
  evidence: string[];
}

export interface HepanInput {
  personA: BirthInput;
  personB: BirthInput;
}

// ---------- 面相 / 手相（图片直传模型） ----------

export interface ImageInput {
  imageBase64: string; // 不含 data: 前缀
  mimeType?: string; // 默认 image/jpeg
  note?: string; // 用户的补充说明（会拼进提问）
}

// 面相 / 手相：把「哪一种」与「图片」合成一个参数传递
export interface ImageReadingInput {
  kind: 'face' | 'palm';
  data: ImageInput;
}
