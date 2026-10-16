// ============================================================
// 塔罗占卜（抽牌 + 牌阵）
//
// 牌义数据见 tarot-data.ts（78 张，只给关键词）；
// 本文件负责：牌阵定义、洗牌抽牌（可 seed 复现）、正逆位判定，
// 并按「只给事实」产出 evidence[]。
// ============================================================
import { TAROT_DECK, type TarotCardData } from './tarot-data.js';
import { TAROT_INTERPRETATION } from './interpretation.js';

// ---------- 类型 ----------

export type TarotSpread = 'single' | 'three-time' | 'celtic' | 'love' | 'yesno';

export interface TarotInput {
  spread: TarotSpread;
  question?: string;
  seed?: string; // 传了则抽牌结果可复现
}

export interface TarotCard {
  id: string;
  name: string;
  arcana: 'major' | 'minor';
  suit?: string;
  element?: string;
  reversed: boolean;
  keywords: string; // 按正逆位取
  positionLabel: string; // 在该牌阵中的位置
}

export interface TarotResult {
  spread: TarotSpread;
  spreadName: string;
  question?: string;
  cards: TarotCard[];
  evidence: string[];
}

// ---------- 牌阵 ----------

const SPREADS: Record<TarotSpread, { name: string; count: number; positions: string[] }> = {
  single: { name: '单牌占卜', count: 1, positions: ['当下指引'] },
  'three-time': { name: '三牌阵 · 时间流', count: 3, positions: ['过去', '现在', '未来'] },
  celtic: {
    name: '凯尔特十字',
    count: 10,
    positions: ['现状', '阻碍', '根源', '过去', '可能结果', '近期未来', '自我状态', '外部环境', '希望与恐惧', '最终结果'],
  },
  love: { name: '爱情牌阵', count: 5, positions: ['你的状态', '对方的状态', '你们的关系', '阻碍', '发展趋势'] },
  yesno: { name: '是否牌阵', count: 3, positions: ['正面因素', '负面因素', '综合结论'] },
};

// ---------- 可复现随机 ----------

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- 主函数 ----------

export function castTarot(input: TarotInput): TarotResult {
  const spread = SPREADS[input.spread] ?? SPREADS.single;
  const rnd = input.seed ? mulberry32(seedFromString(input.seed)) : Math.random;

  // 洗牌（Fisher-Yates），取前 count 张
  const deck: TarotCardData[] = [...TAROT_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const picked = deck.slice(0, spread.count);
  const cards: TarotCard[] = picked.map((c, i) => {
    const reversed = rnd() < 0.5;
    return {
      id: c.id,
      name: c.name,
      arcana: c.arcana,
      suit: c.suit,
      element: c.element,
      reversed,
      keywords: reversed ? c.reversed : c.upright,
      positionLabel: spread.positions[i] ?? `第${i + 1}张`,
    };
  });

  const result: TarotResult = {
    spread: input.spread,
    spreadName: spread.name,
    question: input.question,
    cards,
    evidence: [],
  };
  result.evidence = buildEvidence(result);
  return result;
}

// ---------- 证据 ----------

function buildEvidence(r: TarotResult): string[] {
  const out: string[] = [];
  out.push(`牌阵：${r.spreadName}（${r.cards.length} 张）`);
  if (r.question) out.push(`所问之事：${r.question}`);
  r.cards.forEach((c, i) => {
    const orient = c.reversed ? '逆位' : '正位';
    out.push(`${i + 1}. ${c.positionLabel}：${c.name}（${orient}）—— ${c.keywords}`);
  });
  return out;
}

// ---------- 结果 → 注入 systemPrompt 的文本 ----------

export function tarotToPrompt(r: TarotResult): string {
  let text = '【塔罗牌已由系统抽定，请严格依据以下牌面与位置解读，不得自行换牌或改判正逆位】\n';
  for (const e of r.evidence) text += `· ${e}\n`;
  text += '\n' + TAROT_INTERPRETATION + '\n';
  return text;
}
