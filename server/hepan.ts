// ============================================================
// 合盘（合婚）引擎
//
// 以双方八字做传统合婚比对，比对维度（按传统轻重）：
//   1. 日柱关系（夫妻宫，最重）
//   2. 生肖（年支）关系
//   3. 五行互补
//   4. 月柱关系（家庭宫）
//   5. 时柱关系（子女/晚年宫）
// 另列年柱纳音作参考。
//
// 只产出「事实与比对结果」，不写死吉凶断语；加权分为传统说法的
// 粗参考，非科学结论，须在提示词与界面中明示。
// ============================================================

import { castBazi, type BaziChart, type BaziInput } from './bazi.js';
import { HEPAN_INTERPRETATION } from './interpretation.js';
import {
  getZhiRelation,
  getWuXingRelation,
  relationText,
  type ZhiRelation,
  type WuXing,
} from './ganzhi.js';

export type HepanPerson = BaziInput;

export interface HepanAspect {
  key: string;
  label: string;
  score: number; // 0-100 子分
  weight: number; // 权重（合计 1）
  detail: string; // 结论描述
  favorable: boolean;
}

export interface HepanResult {
  personA: BaziChart;
  personB: BaziChart;
  aspects: HepanAspect[];
  totalScore: number;
  grade: string;
  gradeDesc: string;
  wuXingComplement: string[]; // 五行互补明细
  naYinNote: string; // 年柱纳音关系
  evidence: string[];
}

// ---------- 地支关系打分（用于月/时柱）----------

const ZHI_REL_SCORE: Record<ZhiRelation, number> = {
  合: 25,
  同: 5,
  冲: -25,
  害: -12,
  '': 0,
};

const ZHI_REL_DESC: Record<ZhiRelation, string> = {
  合: '六合，和顺相得',
  同: '同类，性情相近',
  冲: '六冲，易生对立',
  害: '相害，易生芥蒂',
  '': '无特殊刑冲合害，平常',
};

// 地支三合（用于生肖判定：两支是否同属一个三合局）
const SAN_HE_GROUPS: string[][] = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
];
function isSanHe(a: string, b: string): boolean {
  return SAN_HE_GROUPS.some((g) => g.includes(a) && g.includes(b) && a !== b);
}

// ---------- 生肖关系 ----------

function scoreShengXiao(zhiA: string, zhiB: string): { score: number; detail: string; favorable: boolean } {
  const rel = getZhiRelation(zhiA, zhiB);
  if (rel === '合') {
    return { score: 92, detail: `生肖${zhiA}与${zhiB}六合，传统以为最相得，彼此易生默契与助力。`, favorable: true };
  }
  if (isSanHe(zhiA, zhiB)) {
    return { score: 85, detail: `生肖${zhiA}与${zhiB}属三合，传统以为同气相求，相处顺遂、可相扶持。`, favorable: true };
  }
  if (rel === '冲') {
    return { score: 32, detail: `生肖${zhiA}与${zhiB}相冲，传统以为性情取向易相左，宜多沟通、避硬碰。`, favorable: false };
  }
  if (rel === '害') {
    return { score: 48, detail: `生肖${zhiA}与${zhiB}相害，传统以为易生小嫌隙，宜多体谅、不积小事。`, favorable: false };
  }
  if (rel === '同') {
    return { score: 68, detail: `生肖同为${zhiA}，性情相近、易于理解，亦须防各执一端。`, favorable: true };
  }
  return { score: 62, detail: `生肖${zhiA}与${zhiB}无明显刑冲合害，属平常之配，重在相处经营。`, favorable: true };
}

// ---------- 日柱关系（最重）----------

function scoreRiZhu(
  a: { gan: string; zhi: string; ganElement: WuXing },
  b: { gan: string; zhi: string; ganElement: WuXing }
): { score: number; detail: string; favorable: boolean } {
  // 日干（双方日主）五行关系
  const rel = getWuXingRelation(a.ganElement, b.ganElement);
  const ganText = relationText(a.ganElement, b.ganElement, rel);
  let ganScore = 0;
  let ganNote = '';
  switch (rel) {
    case '比和':
      ganScore = 12;
      ganNote = '日主五行相同，志趣相投、并肩而行';
      break;
    case '生我':
      ganScore = 15;
      ganNote = `日主${b.ganElement}生${a.ganElement}，对方于你有滋养之力`;
      break;
    case '我克':
      ganScore = 6;
      ganNote = `日主${a.ganElement}克${b.ganElement}，你于关系中有主导之势，宜勿过强`;
      break;
    case '我生':
      ganScore = 2;
      ganNote = `日主${a.ganElement}生${b.ganElement}，你多有付出，宜留意平衡`;
      break;
    default:
      ganScore = -8;
      ganNote = `日主${b.ganElement}克${a.ganElement}，对方于你有制约之感，宜守分寸`;
      break;
  }

  // 日支（夫妻宫）
  const zhiRel = getZhiRelation(a.zhi, b.zhi);
  let zhiScore = 0;
  let zhiNote = '';
  switch (zhiRel) {
    case '合':
      zhiScore = 26;
      zhiNote = `日支${a.zhi}与${b.zhi}六合，夫妻宫相合，传统以为最宜婚配`;
      break;
    case '同':
      zhiScore = 6;
      zhiNote = `日支同为${a.zhi}，习惯相近`;
      break;
    case '冲':
      zhiScore = -28;
      zhiNote = `日支${a.zhi}与${b.zhi}相冲，夫妻宫相冲，传统以为聚少离多、易起争执，须以沟通化解`;
      break;
    case '害':
      zhiScore = -14;
      zhiNote = `日支${a.zhi}与${b.zhi}相害，夫妻宫相害，易生隐怨，宜坦诚以对`;
      break;
    default:
      zhiScore = 0;
      zhiNote = `日支${a.zhi}与${b.zhi}无合冲，夫妻宫平常，重在相处`;
      break;
  }

  const score = Math.max(0, Math.min(100, 60 + ganScore + zhiScore));
  return {
    score,
    detail: `日柱：${a.gan}${a.zhi}（日主${a.ganElement}）配 ${b.gan}${b.zhi}（日主${b.ganElement}）。${ganNote}；${zhiNote}。（日柱为夫妻宫，传统合婚以此为最重）`,
    favorable: score >= 60,
  };
}

// ---------- 五行互补 ----------

function scoreWuXing(a: BaziChart, b: BaziChart): { score: number; detail: string; favorable: boolean; lines: string[] } {
  const lines: string[] = [];
  let bonus = 0;

  // 一方所缺，另一方是否具备（有则互补）
  for (const el of a.wuXingMissing) {
    const cnt = b.wuXingCount[el] ?? 0;
    if (cnt > 0) {
      bonus += 8;
      lines.push(`一方（${a.name || 'A'}）八字缺${el}，另一方（${b.name || 'B'}）有${cnt}个${el}，可补其不足`);
    } else {
      lines.push(`一方（${a.name || 'A'}）缺${el}，另一方（${b.name || 'B'}）亦无${el}，此项无补`);
    }
  }
  for (const el of b.wuXingMissing) {
    const cnt = a.wuXingCount[el] ?? 0;
    if (cnt > 0) {
      bonus += 8;
      lines.push(`一方（${b.name || 'B'}）八字缺${el}，另一方（${a.name || 'A'}）有${cnt}个${el}，可补其不足`);
    } else {
      lines.push(`一方（${b.name || 'B'}）缺${el}，另一方（${a.name || 'A'}）亦无${el}，此项无补`);
    }
  }
  bonus = Math.min(bonus, 24); // 封顶，避免单项过重

  // 双方日主五行关系
  const rel = getWuXingRelation(a.dayMasterElement, b.dayMasterElement);
  let dayMasterBonus = 0;
  if (rel === '生我' || rel === '比和') dayMasterBonus = 10;
  else if (rel === '我生') dayMasterBonus = 2;
  else if (rel === '我克') dayMasterBonus = 4;
  else dayMasterBonus = -6;

  const cntText = (c: BaziChart) =>
    `木${c.wuXingCount.木} 火${c.wuXingCount.火} 土${c.wuXingCount.土} 金${c.wuXingCount.金} 水${c.wuXingCount.水}`;

  const score = Math.max(0, Math.min(100, 60 + bonus + dayMasterBonus));
  const sameMissing =
    a.wuXingMissing.length > 0 &&
    a.wuXingMissing.length === b.wuXingMissing.length &&
    a.wuXingMissing.every((el) => b.wuXingMissing.includes(el));
  const detail =
    `五行分布：${a.name || 'A'}（${cntText(a)}${a.wuXingMissing.length ? '，缺' + a.wuXingMissing.join('、') : ''}）；` +
    `${b.name || 'B'}（${cntText(b)}${b.wuXingMissing.length ? '，缺' + b.wuXingMissing.join('、') : ''}）。` +
    (bonus > 0
      ? '双方五行有互补之处（一方所缺、另一方有以补之）。'
      : sameMissing
        ? '双方所缺五行相同，五行上无明显互补。'
        : '双方五行无缺，或所缺未能相补，此项无补益。') +
    `日主关系为「${relationText(a.dayMasterElement, b.dayMasterElement, rel)}」。`;

  return { score, detail, favorable: score >= 60, lines };
}

// ---------- 年柱纳音 ----------

function naYinNote(a: BaziChart, b: BaziChart): string {
  const na = a.pillars[0]?.naYin || '';
  const nb = b.pillars[0]?.naYin || '';
  if (!na || !nb) return '';
  const elOf = (s: string): WuXing | '' => {
    const m: [string, WuXing][] = [
      ['金', '金'], ['木', '木'], ['水', '水'], ['火', '火'], ['土', '土'],
    ];
    for (const [k, v] of m) if (s.includes(k)) return v;
    return '';
  };
  const ea = elOf(na);
  const eb = elOf(nb);
  if (!ea || !eb) return `年柱纳音：${na} ／ ${nb}。`;
  const rel = getWuXingRelation(ea, eb);
  return `年柱纳音：${na} ／ ${nb}，五行上为「${relationText(ea, eb, rel)}」。传统合婚有「纳音相生则吉」之说，可作旁参。`;
}

// ---------- 主入口 ----------

export function castHepan(personA: HepanPerson, personB: HepanPerson): HepanResult {
  const a = castBazi(personA);
  const b = castBazi(personB);

  const p = (c: BaziChart, i: number) => c.pillars[i];
  const nameA = a.name || 'A';
  const nameB = b.name || 'B';

  // 1. 日柱（权重 0.35）
  const riZhu = scoreRiZhu(
    { gan: p(a, 2).gan, zhi: p(a, 2).zhi, ganElement: p(a, 2).ganElement },
    { gan: p(b, 2).gan, zhi: p(b, 2).zhi, ganElement: p(b, 2).ganElement }
  );

  // 2. 生肖（权重 0.25）
  const shengXiao = scoreShengXiao(p(a, 0).zhi, p(b, 0).zhi);

  // 3. 五行互补（权重 0.20）
  const wuXing = scoreWuXing(a, b);

  // 4. 月柱（权重 0.10）
  const mzRel = getZhiRelation(p(a, 1).zhi, p(b, 1).zhi);
  const month = {
    score: Math.max(0, Math.min(100, 60 + ZHI_REL_SCORE[mzRel])),
    detail: `月柱（家庭宫）：${p(a, 1).ganZhi} 配 ${p(b, 1).ganZhi}，地支${p(a, 1).zhi}与${p(b, 1).zhi}${ZHI_REL_DESC[mzRel]}。`,
  };

  // 5. 时柱（权重 0.10）
  const hzRel = getZhiRelation(p(a, 3).zhi, p(b, 3).zhi);
  const hour = {
    score: Math.max(0, Math.min(100, 60 + ZHI_REL_SCORE[hzRel])),
    detail: `时柱（子女/晚年宫）：${p(a, 3).ganZhi} 配 ${p(b, 3).ganZhi}，地支${p(a, 3).zhi}与${p(b, 3).zhi}${ZHI_REL_DESC[hzRel]}。`,
  };

  const aspects: HepanAspect[] = [
    { key: 'rizhu', label: '日柱（夫妻宫）', score: riZhu.score, weight: 0.35, detail: riZhu.detail, favorable: riZhu.favorable },
    { key: 'shengxiao', label: '生肖（年支）', score: shengXiao.score, weight: 0.25, detail: shengXiao.detail, favorable: shengXiao.favorable },
    { key: 'wuxing', label: '五行互补', score: wuXing.score, weight: 0.2, detail: wuXing.detail, favorable: wuXing.favorable },
    { key: 'month', label: '月柱（家庭宫）', score: month.score, weight: 0.1, detail: month.detail, favorable: month.score >= 60 },
    { key: 'hour', label: '时柱（子女晚年宫）', score: hour.score, weight: 0.1, detail: hour.detail, favorable: hour.score >= 60 },
  ];

  const totalScore = Math.round(aspects.reduce((s, x) => s + x.score * x.weight, 0));

  const grade =
    totalScore >= 85 ? '上佳' :
    totalScore >= 72 ? '良好' :
    totalScore >= 58 ? '中等' :
    totalScore >= 45 ? '需磨合' : '宜慎';

  const gradeDesc =
    totalScore >= 85 ? '各维度多为相合，传统以为难得之配，然仍须以相处为本。' :
    totalScore >= 72 ? '整体相合度较好，偶有需留意处，经营得当则顺。' :
    totalScore >= 58 ? '合冲参半，属常见之配，重在彼此体谅与沟通。' :
    totalScore >= 45 ? '有数处冲害，传统以为须多磨合，宜知所避就。' :
    '冲害偏多，传统以为宜谨慎；然命理为参考，人事仍在人为。';

  // 证据（事实陈述）
  const out: string[] = [];
  out.push(`【${nameA}】${a.solarText}｜四柱 ${a.pillars.map((x) => x.ganZhi).join(' ')}｜日主 ${a.dayMaster}${a.dayMasterElement}`);
  out.push(`【${nameB}】${b.solarText}｜四柱 ${b.pillars.map((x) => x.ganZhi).join(' ')}｜日主 ${b.dayMaster}${b.dayMasterElement}`);
  out.push(`合婚参考分：${totalScore} 分（${grade}）——${gradeDesc}`);
  for (const x of aspects) {
    out.push(`· ${x.label}（子分 ${x.score}，权重 ${Math.round(x.weight * 100)}%）：${x.detail}`);
  }
  if (wuXing.lines.length) out.push(`五行互补明细：${wuXing.lines.join('；')}`);
  const ny = naYinNote(a, b);
  if (ny) out.push(ny);

  return {
    personA: a,
    personB: b,
    aspects,
    totalScore,
    grade,
    gradeDesc,
    wuXingComplement: wuXing.lines,
    naYinNote: ny,
    evidence: out,
  };
}

// ---------- 提示词 ----------

export function hepanToPrompt(result: HepanResult): string {
  let text = '【本次合盘已由系统依双方八字比对完成，请依据以下比对结果解读，勿自行另排八字】\n';
  text += '注意：合婚分数与吉凶倾向均为传统命理说法，属文化参考而非定论。\n';
  text += '请以中肯、有分寸的语气解读：对相合处点明可依托之处，对相冲相害处给「如何相处避就」的实建议，\n';
  text += '而非断定「不宜婚配」。语气应如长者劝和，不制造疑虑。\n\n';
  for (const e of result.evidence) text += e + '\n';
  text += '\n' + HEPAN_INTERPRETATION;
  return text;
}
