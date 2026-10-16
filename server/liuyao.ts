// ============================================================
// 六爻断卦要素（京房纳甲体系）
//
// 输入：已排好的六爻盘（各爻干支/六亲/六神/动静）+ 占卦时刻
// 输出：空亡、六冲/六合卦、用神系统（用神·原神·忌神·仇神）、
//       月令旺衰、日辰作用、应期线索
//
// 设计原则：本文件只产出「事实」（结构化证据），不做吉凶断语——
// 断语交给模型，依据必须来自这里。这与 hexagramToPrompt 的分离一致。
// ============================================================
import {
  type DiZhi,
  type GanZhiTime,
  type WangShuai,
  type XunKong,
  BRANCH_ELEMENT,
  GAN_ELEMENT,
  KE,
  SHENG,
  getGanZhiTime,
  getWangShuai,
  getXunKong,
  getZhiRelation,
  LIU_CHONG,
} from './ganzhi.js';

// ---------- 六亲 ----------

export type LiuQin = '父母' | '官鬼' | '妻财' | '子孙' | '兄弟';

// 以宫五行为「我」，判爻的六亲
export function liuQinOf(palaceEl: string, yaoEl: string): LiuQin {
  if (yaoEl === palaceEl) return '兄弟';
  if (SHENG[palaceEl] === yaoEl) return '子孙'; // 我生者
  if (KE[palaceEl] === yaoEl) return '妻财'; // 我克者
  if (SHENG[yaoEl] === palaceEl) return '父母'; // 生我者
  return '官鬼'; // 克我者
}

// ---------- 空亡状态 ----------

export type KongWangState =
  | 'not_kong'
  | 'kong_static'
  | 'kong_changing'
  | 'kong_ri_chong'
  | 'kong_yue_jian';

export const KONG_WANG_LABELS: Record<KongWangState, string> = {
  not_kong: '',
  kong_static: '空',
  kong_changing: '动空',
  kong_ri_chong: '冲空',
  kong_yue_jian: '临建',
};

// 判一爻是否落空亡。落空后按「动空 / 冲空 / 临建」细分——
// 此三者传统上不作真空论（冲空、临建为不空；动空待出空）。
export function checkKongWang(
  yaoZhi: string,
  kong: XunKong,
  monthZhi: string,
  dayZhi: string,
  isChanging: boolean
): KongWangState {
  if (!kong.kong.includes(yaoZhi as DiZhi)) return 'not_kong';
  if (yaoZhi === monthZhi) return 'kong_yue_jian';
  if (LIU_CHONG[yaoZhi] === dayZhi) return 'kong_ri_chong';
  if (isChanging) return 'kong_changing';
  return 'kong_static';
}

// ---------- 六冲卦 / 六合卦 ----------
// 六冲卦：八纯卦 + 天雷无妄(25) + 雷天大壮(34)
// 六合卦：泰(11) 否(12) 豫(16) 复(24) 困(47) 节(60) 旅(56) 贲(22)

const LIU_CHONG_GUA = new Set([1, 2, 29, 30, 51, 52, 57, 58, 25, 34]);
const LIU_HE_GUA = new Set([11, 12, 16, 24, 47, 60, 56, 22]);

// ---------- 占问主题 → 用神 ----------

export type YongShenTopic = 'career' | 'wealth' | 'document' | 'health' | 'people';

export const YONG_SHEN_TOPICS: Record<YongShenTopic, { liuQin: LiuQin; label: string }> = {
  career: { liuQin: '官鬼', label: '事业·官职·官司·忧患' },
  wealth: { liuQin: '妻财', label: '财运·男问感情' },
  document: { liuQin: '父母', label: '文书·合同·长辈·房产车辆' },
  health: { liuQin: '子孙', label: '子女·健康平安' },
  people: { liuQin: '兄弟', label: '合作·竞争·朋友' },
};

// 由自然语言问题粗判用神主题（用户未显式指定时的兜底）
export function inferTopic(question?: string): YongShenTopic {
  const q = question || '';
  if (/财|钱|收入|生意|买卖|盈利|投资|收益/.test(q)) return 'wealth';
  if (/事业|工作|职位|升迁|考试|求职|官|官司|诉讼|病|疾/.test(q)) return 'career';
  if (/文书|合同|证书|房产|车|长辈|父母|学业|房/.test(q)) return 'document';
  if (/子女|孩子|健康|平安|身|孕|子嗣/.test(q)) return 'health';
  if (/合作|合伙|朋友|兄弟|竞争|同事/.test(q)) return 'people';
  return 'career'; // 兜底：事业最常用
}

// ---------- 输入 / 输出 ----------

export interface LiuyaoLineInput {
  pos: number; // 1-6（初→上）
  yin: boolean;
  changing: boolean;
  ganzhi: string; // 如「甲子」
  liuQin: string;
  liuShen: string;
}

export interface LiuyaoInput {
  seq: number; // 本卦卦序
  palaceElement: string; // 宫五行
  lines: LiuyaoLineInput[];
  date: Date;
  question?: string;
  yongShenTopic?: YongShenTopic;
}

export interface LiuyaoLineAnalysis extends LiuyaoLineInput {
  zhi: string; // 地支
  element: string; // 爻的五行
  wangShuai: WangShuai; // 月令旺衰
  kongWang: KongWangState;
  isYongShen: boolean;
  isYuanShen: boolean;
  isJiShen: boolean;
  isChouShen: boolean;
  relWithDay: string; // 与日辰关系（冲/合/害/同/空）
  relWithMonth: string; // 与月建关系
}

export interface LiuyaoAnalysis {
  ganZhi: GanZhiTime;
  monthZhi: string; // 月建
  dayGanZhi: string; // 日辰
  kongWang: XunKong;
  isLiuChongGua: boolean;
  isLiuHeGua: boolean;
  yongShenTopic: YongShenTopic;
  yongShenLiuQin: LiuQin;
  lines: LiuyaoLineAnalysis[];
  yongShenPositions: number[];
  evidence: string[]; // 结构化证据（事实陈述，不含吉凶断语）
  timingHints: string[]; // 应期线索
}

// ---------- 主函数 ----------

export function analyzeLiuyao(input: LiuyaoInput): LiuyaoAnalysis {
  const { lines, palaceElement, seq, date } = input;
  const ganZhi = getGanZhiTime(date);
  const monthZhi = ganZhi.month.zhi;
  const dayGanZhi = ganZhi.day.ganZhi;
  const dayZhi = ganZhi.day.zhi;
  const kong = getXunKong(ganZhi.day.gan, ganZhi.day.zhi);

  // 用神定位
  const topic: YongShenTopic = input.yongShenTopic ?? inferTopic(input.question);
  const yongShenLiuQin = YONG_SHEN_TOPICS[topic].liuQin;

  // 用神五行 → 推原神（生用神者）、忌神（克用神者）、仇神（生忌神者）
  const yongEl = elementOfLiuQin(palaceElement, yongShenLiuQin);
  const yuanEl = wuxingThatSheng(yongEl);
  const jiEl = wuxingThatKe(yongEl);
  const chouEl = wuxingThatSheng(jiEl);
  const yuanLiuQin = liuQinOf(palaceElement, yuanEl);
  const jiLiuQin = liuQinOf(palaceElement, jiEl);
  const chouLiuQin = liuQinOf(palaceElement, chouEl);

  const analyzed: LiuyaoLineAnalysis[] = lines.map((ln) => {
    const zhi = ln.ganzhi.slice(1);
    const element = BRANCH_ELEMENT[zhi] || '土';
    return {
      ...ln,
      zhi,
      element,
      wangShuai: getWangShuai(monthZhi, element),
      kongWang: checkKongWang(zhi, kong, monthZhi, dayZhi, ln.changing),
      isYongShen: ln.liuQin === yongShenLiuQin,
      isYuanShen: ln.liuQin === yuanLiuQin,
      isJiShen: ln.liuQin === jiLiuQin,
      isChouShen: ln.liuQin === chouLiuQin,
      relWithDay: relationLabel(zhi, dayZhi),
      relWithMonth: relationLabel(zhi, monthZhi),
    };
  });

  const yongShenPositions = analyzed.filter((l) => l.isYongShen).map((l) => l.pos);

  return {
    ganZhi,
    monthZhi,
    dayGanZhi,
    kongWang: kong,
    isLiuChongGua: LIU_CHONG_GUA.has(seq),
    isLiuHeGua: LIU_HE_GUA.has(seq),
    yongShenTopic: topic,
    yongShenLiuQin,
    lines: analyzed,
    yongShenPositions,
    evidence: buildEvidence(analyzed, {
      monthZhi,
      dayGanZhi,
      kong,
      yongShenLiuQin,
      yuanLiuQin,
      jiLiuQin,
      chouLiuQin,
      yongShenPositions,
      isLiuChongGua: LIU_CHONG_GUA.has(seq),
      isLiuHeGua: LIU_HE_GUA.has(seq),
    }),
    timingHints: buildTimingHints(analyzed, yongShenPositions, kong),
  };
}

// ---------- 内部工具 ----------

// 六亲 → 五行（六亲由「宫五行 vs 爻五行」定义，此处反推该六亲对应的五行）
function elementOfLiuQin(palaceEl: string, qin: LiuQin): string {
  const all: string[] = ['金', '木', '水', '火', '土'];
  return all.find((el) => liuQinOf(palaceEl, el) === qin) ?? palaceEl;
}

function wuxingThatSheng(target: string): string {
  return Object.keys(SHENG).find((k) => SHENG[k] === target) ?? target;
}

function wuxingThatKe(target: string): string {
  return Object.keys(KE).find((k) => KE[k] === target) ?? target;
}

// 爻与某地支的关系标签（含空亡提示）
function relationLabel(yaoZhi: string, otherZhi: string): string {
  const rel = getZhiRelation(yaoZhi, otherZhi);
  return rel || '';
}

interface EvidenceCtx {
  monthZhi: string;
  dayGanZhi: string;
  kong: XunKong;
  yongShenLiuQin: LiuQin;
  yuanLiuQin: LiuQin;
  jiLiuQin: LiuQin;
  chouLiuQin: LiuQin;
  yongShenPositions: number[];
  isLiuChongGua: boolean;
  isLiuHeGua: boolean;
}

function buildEvidence(lines: LiuyaoLineAnalysis[], ctx: EvidenceCtx): string[] {
  const POS = ['初', '二', '三', '四', '五', '上'];
  const out: string[] = [];

  out.push(`月建：${ctx.monthZhi}（${BRANCH_ELEMENT[ctx.monthZhi] ?? ''}）　日辰：${ctx.dayGanZhi}　旬空：${ctx.kong.xun}（空 ${ctx.kong.kong.join('、')}）`);
  out.push(`用神：${ctx.yongShenLiuQin}（原神 ${ctx.yuanLiuQin} · 忌神 ${ctx.jiLiuQin} · 仇神 ${ctx.chouLiuQin}）`);

  if (ctx.isLiuChongGua) out.push('卦体：六冲卦——主事多动荡、变化快、易散。');
  if (ctx.isLiuHeGua) out.push('卦体：六合卦——主事多和缓、易成、缠绵。');

  if (ctx.yongShenPositions.length === 0) {
    out.push(`用神（${ctx.yongShenLiuQin}）不上卦——需查伏神。`);
  } else {
    for (const pos of ctx.yongShenPositions) {
      const l = lines.find((x) => x.pos === pos)!;
      const marks: string[] = [];
      marks.push(`${POS[pos - 1]}爻（${l.ganzhi}·${l.liuShen}）`);
      marks.push(`五行${l.element}，月令${l.wangShuai}`);
      if (l.kongWang !== 'not_kong') marks.push(KONG_WANG_LABELS[l.kongWang]);
      if (l.relWithDay) marks.push(`日辰${l.relWithDay}`);
      if (l.relWithMonth) marks.push(`月建${l.relWithMonth}`);
      if (l.changing) marks.push('动');
      out.push(`用神在${marks.join('，')}。`);
    }
  }

  // 动爻清单（变化的着力点）
  const changing = lines.filter((l) => l.changing);
  if (changing.length > 0) {
    out.push(
      `动爻：${changing.map((l) => `${POS[l.pos - 1]}爻(${l.ganzhi}·${l.liuQin})`).join('、')}`
    );
  } else {
    out.push('六爻皆静，以世应与用神之旺衰断之。');
  }

  // 空亡爻清单
  const kongLines = lines.filter((l) => l.kongWang !== 'not_kong');
  if (kongLines.length > 0) {
    out.push(
      `空亡爻：${kongLines
        .map((l) => `${POS[l.pos - 1]}爻(${l.ganzhi}·${KONG_WANG_LABELS[l.kongWang]})`)
        .join('、')}`
    );
  }

  return out;
}

// 应期线索：传统以「用神出空、值日、逢冲逢合」为应期之机
function buildTimingHints(
  lines: LiuyaoLineAnalysis[],
  yongShenPositions: number[],
  kong: XunKong
): string[] {
  const hints: string[] = [];
  const yongs = lines.filter((l) => yongShenPositions.includes(l.pos));

  for (const y of yongs) {
    if (y.kongWang === 'kong_static' || y.kongWang === 'kong_changing') {
      hints.push(`用神${y.ganzhi}落空，主应期在出空之时（冲实或填实之日/月）。`);
    }
    if (y.wangShuai === '旺' || y.wangShuai === '相') {
      hints.push(`用神${y.wangShuai}相有力，主应期较速。`);
    } else if (y.wangShuai === '休' || y.wangShuai === '囚' || y.wangShuai === '死') {
      hints.push(`用神${y.wangShuai}，力量不足，主应期偏缓或事有阻滞。`);
    }
    if (y.relWithDay === '冲') {
      hints.push(`用神受日辰冲，主事有变动；逢合之日或可定。`);
    }
  }
  if (hints.length === 0) hints.push('用神无特殊时令约束，应期以近期为断。');
  return hints;
}
