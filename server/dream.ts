// ============================================================
// 周公解梦 · 意象匹配引擎
//
// 用户以自然语言描述梦境，本模块从词库中匹配出对应意象，
// 产出「传统释义」作为证据，交模型综合解读。
//
// 匹配策略（中文无空格，故用「长词优先 + 位置占用」）：
//   1. 所有关键词按长度降序排列，长词先匹配；
//   2. 匹配成功的字符区间标记为「已占用」，短词不得再覆盖该区间。
//   此举可避免「火车」被拆成「火」+「车」、「开心」误命中「心」。
// ============================================================

import { DREAM_SYMBOLS, DREAM_CATEGORIES, DREAM_SYMBOL_COUNT, type DreamSymbol, type DreamOmen } from './dream-data.js';
import { DREAM_INTERPRETATION } from './interpretation.js';

export { DREAM_SYMBOLS, DREAM_CATEGORIES, DREAM_SYMBOL_COUNT };
export type { DreamSymbol, DreamOmen };

// 单次解读最多呈现的意象数（避免长文本命中过多、冲淡重点）
const MAX_HITS = 20;

export interface DreamHit {
  id: string;
  name: string;
  category: string;
  omen: DreamOmen;
  meaning: string;
  matchedKeyword: string; // 实际命中的词
}

export interface DreamResult {
  dreamText: string;
  hits: DreamHit[];
  unmatched: boolean; // 是否一条都没命中
  evidence: string[];
}

// 预构建「关键词 → 意象」索引，按关键词长度降序（长词优先）
interface KwEntry {
  kw: string;
  symbol: DreamSymbol;
}
const KW_INDEX: KwEntry[] = (() => {
  const list: KwEntry[] = [];
  for (const symbol of DREAM_SYMBOLS) {
    for (const kw of symbol.keywords) list.push({ kw, symbol });
  }
  // 长度降序；同长度时保持原顺序（稳定）
  return list.sort((a, b) => b.kw.length - a.kw.length);
})();

// 规范化输入：去掉空白与常见标点，减少匹配干扰（保留中文与字母数字）
function normalize(text: string): string {
  return text.replace(/[\s，。！？、；：""''（）【】《》,.!?;:'"()\[\]{}<>\-—_/\\|~`@#$%^&*+=]/g, '');
}

// 停用词：这些是「日常用词」，本身不是梦境意象，但内含单字意象词，
// 会污染匹配（如「今天」命中「天」、「专门」命中「门」、「符合」命中「符」）。
// 处理方式：替换为等长的占位符（长度不变 → 索引不乱），使其不参与匹配。
//
// 收录原则（重要）：
//   ① 只放「整体与任何意象都无关」的词；
//   ② 绝不放「本身是某意象关键词」的词（如「满足」是「情感-满足」的关键词、
//      「伤心」是「悲伤」的关键词），否则会导致真意象漏匹配；
//   ③ 不放「屏蔽后会连累正确意象」的词（如「香烟」——屏蔽它会让「烟」也匹配不到）。
const STOP_WORDS = [
  // 含「天」
  '今天', '明天', '昨天', '前天', '天天', '每天', '白天', '一天', '几天',
  '那天', '这天', '哪天', '改天', '当天', '有时', '这时', '那时',
  // 含「门」
  '专门', '部门', '门路',
  // 含「花」
  '花钱', '花费', '花了', '花掉', '花光',
  // 含「路」
  '思路', '出路',
  // 含「追」
  '追求', '追问', '追忆', '追溯', '追查',
  // 含「家」
  '大家', '人家', '国家', '专家', '作家', '画家', '家长', '科学家',
  // 含「果」
  '结果', '如果', '果然', '成果', '效果', '后果', '果断',
  // 含「麻」
  '麻烦', '麻辣', '麻木', '芝麻',
  // 含「足」
  '不足', '足够', '手足', '充足', '十足',
  // 含「符」
  '符合', '符号', '音符',
  // 含「香」
  '香蕉', '香港', '香水', '香菇', '香味',
  // 含「考」
  '考虑', '思考', '参考', '考察', '考验',
  // 含「院」
  '医院', '学院', '法院', '院校',
  // 含「宫」
  '子宫', '迷宫',
  // 含「市」
  '城市', '市场', '超市', '市区', '上市', '股市', '都市',
  // 含「刺」
  '刺激', '讽刺', '刺眼',
  // 含「皮」
  '调皮', '皮鞋', '头皮', '皮球',
  // 含「鼓」
  '鼓励', '鼓掌', '鼓动',
  // 含「金」
  '奖金', '基金', '资金', '金属',
  // 含「笑」
  '笑话', '玩笑', '见笑',
  // 含「急」
  '着急', '紧急', '急忙', '急躁',
  // 含「官」
  '官方', '五官', '器官', '军官',
  // 含「藏」
  '西藏', '收藏', '珍藏', '宝藏',
  // 含「松」
  '轻松', '放松', '松开', '松手',
  // 含「李」
  '行李',
  // 含「桃」
  '核桃', '樱桃',
  // 含「瓜」
  '傻瓜',
  // 含「根」
  '根本', '根据',
  // 含「死」
  '烦死', '累死', '要死',
  // 含「偷」
  '偷偷',
  // 含「病」
  '毛病',
];
const MASK = '\u0001';

function maskStopWords(text: string): string {
  let out = text;
  for (const w of STOP_WORDS) {
    if (out.includes(w)) out = out.split(w).join(MASK.repeat(w.length));
  }
  return out;
}

export function castDream(input: { dreamText: string }): DreamResult {
  const raw = (input.dreamText || '').trim();
  const text = maskStopWords(normalize(raw));

  const hits: { hit: DreamHit; index: number }[] = [];
  const hitIds = new Set<string>();

  if (text) {
    const used = new Array<boolean>(text.length).fill(false);

    for (const { kw, symbol } of KW_INDEX) {
      if (hitIds.has(symbol.id)) continue; // 同一意象只记一次
      let from = 0;
      while (from <= text.length - kw.length) {
        const idx = text.indexOf(kw, from);
        if (idx < 0) break;
        // 检查该区间是否已被更长的关键词占用
        let free = true;
        for (let i = idx; i < idx + kw.length; i++) {
          if (used[i]) { free = false; break; }
        }
        if (free) {
          for (let i = idx; i < idx + kw.length; i++) used[i] = true;
          hitIds.add(symbol.id);
          hits.push({
            index: idx,
            hit: {
              id: symbol.id,
              name: symbol.name,
              category: symbol.category,
              omen: symbol.omen,
              meaning: symbol.meaning,
              matchedKeyword: kw,
            },
          });
          break; // 该意象已命中，不再找它别的关键词
        }
        from = idx + 1;
      }
      if (hits.length >= MAX_HITS) break;
    }
  }

  // 按在梦境文本中出现的先后排序（更贴合叙述顺序）
  hits.sort((a, b) => a.index - b.index);
  const finalHits = hits.map((h) => h.hit);

  // 证据：只列「传统怎么说」，不含本模块的吉凶结论
  const evidence: string[] = [];
  evidence.push(`梦境原文：${raw || '（空）'}`);
  if (finalHits.length) {
    evidence.push(`命中意象 ${finalHits.length} 个（据传统民俗解梦之说）：`);
    for (const h of finalHits) {
      evidence.push(`· ${h.name}（${h.category}｜传统倾向：${h.omen}）——${h.meaning}（梦中出现「${h.matchedKeyword}」）`);
    }
  } else {
    evidence.push('未从词库中匹配到明确意象（或描述过于简略）。请按梦的整体情境、情绪与所问之事作通解。');
  }

  return {
    dreamText: raw,
    hits: finalHits,
    unmatched: finalHits.length === 0,
    evidence,
  };
}

// 把匹配结果转为注入 systemPrompt 的文本（只含事实）
export function dreamToPrompt(result: DreamResult): string {
  let text = '【本次解梦已由系统检索传统意象词库，请依据以下意象释义解读，勿凭空另解】\n';
  text += '重要前提：以下吉凶倾向均为传统民俗说法，是文化参考而非预言。\n';
  text += '请以温和、有分寸的语气解读，把「凶」解为「提示与提醒」而非「断定」——\n';
  text += '例如「传统以为此象主口舌，是在提醒你留意言语」，而不是「你将遭遇口舌之灾」。\n';
  text += '结尾不必另加免责声明（界面上已有）。\n\n';
  text += `梦境描述：${result.dreamText}\n\n`;

  if (result.hits.length) {
    text += `命中传统意象 ${result.hits.length} 个：\n`;
    for (const h of result.hits) {
      text += `· ${h.name}（${h.category}｜传统倾向：${h.omen}）：${h.meaning}\n`;
    }
  } else {
    text += '未匹配到词库中的明确意象。请按梦的整体情境、情绪氛围与所问之事作通解，不要强行套用具体意象。\n';
  }

  text += '\n' + DREAM_INTERPRETATION;
  return text;
}
