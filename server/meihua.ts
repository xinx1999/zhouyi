// ============================================================
// 梅花易数断卦要素
//
// 输入：已起好的本卦（含六爻与动爻）
// 输出：体用、体用生克、互卦/错卦/综卦、月令旺衰、阶段推演、吉凶定性
//
// 设计原则同 liuyao.ts：只产出「事实与推演链」，断语留给模型。
// 体用判定依传统：动爻所在之经卦为「用」，另一卦为「体」。
// ============================================================
import {
  type HexagramInfo,
  TRIGRAM_ELEMENT,
  hexagramFromLines,
} from './hexagram.js';
import {
  type GanZhiTime,
  type WangShuai,
  type WuXingRelation,
  getGanZhiTime,
  getWangShuai,
  getWuXingRelation,
  isFavorableRelation,
  relationText,
} from './ganzhi.js';

// ---------- 类型 ----------

export interface MeihuaTrigramRef {
  name: string; // 卦名（乾/兑/…）
  nature: string; // 自然属性（天/泽/…）
  element: string; // 五行
}

export interface MeihuaStage {
  stage: string; // 初段 / 中段 / 后段
  basis: string; // 对应的卦
  relation: WuXingRelation;
  favorable: boolean;
  text: string; // 如「体卦乾金 与 用卦离火」
}

export interface MeihuaJudgement {
  outcome: '吉' | '平' | '凶';
  summary: string;
  basis: string[];
}

export interface MeihuaAnalysis {
  ganZhi: GanZhiTime;
  monthZhi: string;
  bodyTrigram: MeihuaTrigramRef;
  useTrigram: MeihuaTrigramRef;
  bodyUseRelation: WuXingRelation;
  bodyUseFavorable: boolean;
  bodyUseText: string;
  nuclearHexagram: { seq: number; name: string } | null; // 互卦
  oppositeHexagram: { seq: number; name: string }; // 错卦（旁通）
  reversedHexagram: { seq: number; name: string }; // 综卦（反卦）
  seasonalState: { monthZhi: string; body: WangShuai; use: WangShuai };
  stages: MeihuaStage[];
  judgement: MeihuaJudgement;
  timingHints: string[];
  evidence: string[];
}

export interface MeihuaInput {
  benGua: HexagramInfo;
  changingPositions: number[];
  date: Date;
}

// ---------- 主函数 ----------

export function analyzeMeihua(input: MeihuaInput): MeihuaAnalysis {
  const { benGua, changingPositions, date } = input;
  const ganZhi = getGanZhiTime(date);
  const monthZhi = ganZhi.month.zhi;

  // 六爻二进制（下→上）
  const bins = [...benGua.lower.binary, ...benGua.upper.binary];

  // ---- 体用判定：动爻所在之经卦为「用」，另一为「体」 ----
  const dong = changingPositions[0] ?? 1;
  const useIsLower = dong <= 3; // 动爻在下卦 → 下卦为用
  const bodyTrigramRaw = useIsLower ? benGua.upper : benGua.lower;
  const useTrigramRaw = useIsLower ? benGua.lower : benGua.upper;

  const body = trigramRef(bodyTrigramRaw.id, bodyTrigramRaw.name, bodyTrigramRaw.nature);
  const use = trigramRef(useTrigramRaw.id, useTrigramRaw.name, useTrigramRaw.nature);

  // ---- 体用生克 ----
  const bodyUseRelation = getWuXingRelation(body.element, use.element);
  const bodyUseFavorable = isFavorableRelation(bodyUseRelation);
  const bodyUseText = relationText(body.element, use.element, bodyUseRelation);

  // ---- 互卦：下互取 2·3·4 爻，上互取 3·4·5 爻 ----
  const huLower = bins.slice(1, 4);
  const huUpper = bins.slice(2, 5);
  const nuclear = hexagramFromLines([...huLower, ...huUpper]);

  // ---- 错卦：六爻全变；综卦：六爻倒转 ----
  const opposite = hexagramFromLines(bins.map((b) => (b === 1 ? 0 : 1)));
  const reversed = hexagramFromLines([...bins].reverse());

  // ---- 月令旺衰 ----
  const seasonalState = {
    monthZhi,
    body: getWangShuai(monthZhi, body.element),
    use: getWangShuai(monthZhi, use.element),
  };

  // ---- 阶段推演：初段本卦 / 中段互卦 / 后段变卦 ----
  const stages: MeihuaStage[] = [];
  stages.push({
    stage: '初段（本卦）',
    basis: `用卦${use.name}`,
    relation: bodyUseRelation,
    favorable: bodyUseFavorable,
    text: `体卦${body.name}${body.element} 对 用卦${use.name}${use.element}：${bodyUseText}`,
  });

  // 中段：互卦中与「用卦」同位的经卦为用互，另一为体互
  const huBodyRaw = useIsLower ? huUpper : huLower; // 与体卦同位
  const huUseRaw = useIsLower ? huLower : huUpper; // 与用卦同位
  const huBody = trigramRefByBin(huBodyRaw);
  const huUse = trigramRefByBin(huUseRaw);
  const huRel = getWuXingRelation(body.element, huUse.element);
  stages.push({
    stage: '中段（互卦）',
    basis: `互卦${nuclear.name}`,
    relation: huRel,
    favorable: isFavorableRelation(huRel),
    text: `体卦${body.name}${body.element} 对 用互${huUse.name}${huUse.element}：${relationText(body.element, huUse.element, huRel)}（体互${huBody.name}）`,
  });

  // 后段：变卦（由动爻反转得到）
  if (changingPositions.length > 0) {
    const changedBins = bins.map((b, i) => (changingPositions.includes(i + 1) ? (b === 1 ? 0 : 1) : b));
    const changed = hexagramFromLines(changedBins);
    // 变卦中与原用卦同位的经卦
    const changedUseRaw = useIsLower ? changedBins.slice(0, 3) : changedBins.slice(3, 6);
    const changedUse = trigramRefByBin(changedUseRaw);
    const chRel = getWuXingRelation(body.element, changedUse.element);
    stages.push({
      stage: '后段（变卦）',
      basis: `变卦${changed.name}`,
      relation: chRel,
      favorable: isFavorableRelation(chRel),
      text: `体卦${body.name}${body.element} 对 变出之${changedUse.name}${changedUse.element}：${relationText(body.element, changedUse.element, chRel)}`,
    });
  }

  const judgement = judge(stages, seasonalState);
  const evidence = buildEvidence({
    body, use, bodyUseText, nuclear, opposite, reversed, seasonalState, dong,
  });

  return {
    ganZhi,
    monthZhi,
    bodyTrigram: body,
    useTrigram: use,
    bodyUseRelation,
    bodyUseFavorable,
    bodyUseText,
    nuclearHexagram: { seq: nuclear.seq, name: nuclear.name },
    oppositeHexagram: { seq: opposite.seq, name: opposite.name },
    reversedHexagram: { seq: reversed.seq, name: reversed.name },
    seasonalState,
    stages,
    judgement,
    timingHints: buildTimingHints(bodyUseFavorable, seasonalState),
    evidence,
  };
}

// ---------- 内部工具 ----------

function trigramRef(id: string, name: string, nature: string): MeihuaTrigramRef {
  return { name, nature, element: TRIGRAM_ELEMENT[id] ?? '土' };
}

// 由三爻二进制求经卦引用
function trigramRefByBin(bin: number[]): MeihuaTrigramRef {
  const key = bin.join('');
  for (const id of Object.keys(TRIGRAM_ELEMENT)) {
    // 借 hexagram.ts 的八卦数据做反查
    const t = TRIGRAM_LOOKUP[id];
    if (t && t.join('') === key) {
      return { name: TRIGRAM_NAME[id], nature: TRIGRAM_NATURE[id], element: TRIGRAM_ELEMENT[id] };
    }
  }
  return { name: '?', nature: '?', element: '土' };
}

// 经卦 id → 三爻二进制 / 名称 / 属性（与 hexagram.ts 的 TRIGRAMS 保持一致）
const TRIGRAM_LOOKUP: Record<string, number[]> = {
  qian: [1, 1, 1], dui: [1, 1, 0], li: [1, 0, 1], zhen: [1, 0, 0],
  xun: [0, 1, 1], kan: [0, 1, 0], gen: [0, 0, 1], kun: [0, 0, 0],
};
const TRIGRAM_NAME: Record<string, string> = {
  qian: '乾', dui: '兑', li: '离', zhen: '震', xun: '巽', kan: '坎', gen: '艮', kun: '坤',
};
const TRIGRAM_NATURE: Record<string, string> = {
  qian: '天', dui: '泽', li: '火', zhen: '雷', xun: '风', kan: '水', gen: '山', kun: '地',
};

// 吉凶定性：以体用生克为主线，参考体卦旺衰
function judge(
  stages: MeihuaStage[],
  seasonal: { monthZhi: string; body: WangShuai; use: WangShuai }
): MeihuaJudgement {
  const basis: string[] = [];
  const good = stages.filter((s) => s.favorable).length;
  const bad = stages.length - good;

  basis.push(`体卦月令${seasonal.body}，用卦月令${seasonal.use}。`);
  for (const s of stages) {
    basis.push(`${s.stage}：${s.favorable ? '利于体' : '不利于体'}（${s.relation}）。`);
  }

  let outcome: '吉' | '平' | '凶';
  if (good > bad && seasonal.body !== '死' && seasonal.body !== '囚') outcome = '吉';
  else if (bad > good || seasonal.body === '死') outcome = '凶';
  else outcome = '平';

  const summary =
    outcome === '吉'
      ? '体卦得势，事多可成，宜主动进取。'
      : outcome === '凶'
        ? '体卦受制，事多阻滞，宜守静待时。'
        : '体用互见生克，事有反复，宜审时而行。';

  return { outcome, summary, basis };
}

function buildEvidence(ctx: {
  body: MeihuaTrigramRef;
  use: MeihuaTrigramRef;
  bodyUseText: string;
  nuclear: HexagramInfo;
  opposite: HexagramInfo;
  reversed: HexagramInfo;
  seasonalState: { monthZhi: string; body: WangShuai; use: WangShuai };
  dong: number;
}): string[] {
  const POS = ['初', '二', '三', '四', '五', '上'];
  return [
    `月建：${ctx.seasonalState.monthZhi}`,
    `动爻：第 ${ctx.dong} 爻（${POS[ctx.dong - 1]}）→ ${ctx.dong <= 3 ? '下卦为用、上卦为体' : '上卦为用、下卦为体'}`,
    `体卦：${ctx.body.name}${ctx.body.element}（月令${ctx.seasonalState.body}）　用卦：${ctx.use.name}${ctx.use.element}（月令${ctx.seasonalState.use}）`,
    `体用关系：${ctx.bodyUseText}`,
    `互卦：${ctx.nuclear.name}（事之中间过程）`,
    `变卦相关：错卦 ${ctx.opposite.name} · 综卦 ${ctx.reversed.name}`,
  ];
}

function buildTimingHints(
  bodyUseFavorable: boolean,
  seasonal: { monthZhi: string; body: WangShuai; use: WangShuai }
): string[] {
  const hints: string[] = [];
  if (bodyUseFavorable && (seasonal.body === '旺' || seasonal.body === '相')) {
    hints.push('体卦得时得势，应期偏早，宜把握当下。');
  } else if (!bodyUseFavorable && (seasonal.body === '休' || seasonal.body === '囚' || seasonal.body === '死')) {
    hints.push('体卦失时受制，应期偏晚，宜待体卦转旺之月。');
  } else {
    hints.push('体用互有生克，应期在中，宜随势而动。');
  }
  hints.push(`月建${seasonal.monthZhi}为当前时令基准，逢体卦五行当令之月，事机较顺。`);
  return hints;
}
