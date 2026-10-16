// ============================================================
// 紫微斗数排盘
//
// 排盘由 iztro（MIT）提供：十二宫、主星辅星杂曜、四化、亮度、
// 十二长生、大限、命主身主、五行局。
// 本文件负责：换算时辰、整理为前端/模型可用的结构、产出 evidence[]。
//
// 与八字一致的分层：只给事实，断语交给模型（见 interpretation.ts）。
// ============================================================
import { astro } from 'iztro';
import { ZIWEI_INTERPRETATION } from './interpretation.js';

// ---------- 输入 / 输出 ----------

export interface ZiweiInput {
  name?: string;
  gender: 'male' | 'female';
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

export interface ZiweiStar {
  name: string;
  brightness?: string; // 庙旺得利平不陷
  mutagen?: string; // 禄 / 权 / 科 / 忌
}

export interface ZiweiPalace {
  index: number;
  name: string; // 命宫 / 兄弟 / 夫妻 / 子女 / 财帛 / 疾厄 / 迁移 / 仆役 / 官禄 / 田宅 / 福德 / 父母
  heavenlyStem: string;
  earthlyBranch: string;
  ganZhi: string;
  isBodyPalace: boolean; // 身宫所在
  isOriginalPalace: boolean; // 来因宫
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: string[];
  changsheng12: string; // 十二长生
  decadal: { range: [number, number]; ganZhi: string };
  ages: number[];
}

export interface ZiweiChart {
  name?: string;
  gender: 'male' | 'female';
  solarDate: string;
  lunarDate: string;
  chineseDate: string; // 四柱
  timeRange: string; // 时辰
  soul: string; // 命主
  body: string; // 身主
  fiveElementsClass: string; // 五行局
  zodiac: string;
  sign: string;
  palaces: ZiweiPalace[];
  evidence: string[]; // 结构化证据
}

// ---------- 时辰换算 ----------
// 0-23 时 → 紫微时辰序（0=早子 1=丑 … 11=亥 12=晚子）
function hourToTimeIndex(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

// ---------- 主函数 ----------

export function castZiwei(input: ZiweiInput): ZiweiChart {
  const { year, month, day, hour, gender } = input;
  const dateStr = `${year}-${month}-${day}`;
  const timeIndex = hourToTimeIndex(hour);

  const a = astro.bySolar(dateStr, timeIndex, gender === 'male' ? '男' : '女', true, 'zh-CN');

  const toStars = (arr: any[]): ZiweiStar[] =>
    (arr || []).map((s: any) => ({
      name: s.name,
      brightness: s.brightness || undefined,
      mutagen: s.mutagen || undefined,
    }));

  const palaces: ZiweiPalace[] = (a.palaces || []).map((p: any, i: number) => ({
    index: i,
    name: p.name,
    heavenlyStem: p.heavenlyStem,
    earthlyBranch: p.earthlyBranch,
    ganZhi: `${p.heavenlyStem}${p.earthlyBranch}`,
    isBodyPalace: !!p.isBodyPalace,
    isOriginalPalace: !!p.isOriginalPalace,
    majorStars: toStars(p.majorStars),
    minorStars: toStars(p.minorStars),
    adjectiveStars: (p.adjectiveStars || []).map((s: any) => s.name),
    changsheng12: p.changsheng12 || '',
    decadal: {
      range: p.decadal?.range ?? [0, 0],
      ganZhi: `${p.decadal?.heavenlyStem ?? ''}${p.decadal?.earthlyBranch ?? ''}`,
    },
    ages: p.ages || [],
  }));

  const chart: ZiweiChart = {
    name: input.name,
    gender,
    solarDate: a.solarDate,
    lunarDate: a.lunarDate,
    chineseDate: a.chineseDate,
    timeRange: a.timeRange || '',
    soul: a.soul,
    body: a.body,
    fiveElementsClass: a.fiveElementsClass,
    zodiac: a.zodiac,
    sign: a.sign,
    palaces,
    evidence: [],
  };

  chart.evidence = buildEvidence(chart);
  return chart;
}

// ---------- 证据（事实陈述，不含吉凶断语）----------

function starLine(stars: ZiweiStar[]): string {
  if (!stars.length) return '';
  return stars
    .map((s) => {
      let t = s.name;
      if (s.brightness) t += `（${s.brightness}）`;
      if (s.mutagen) t += `化${s.mutagen}`;
      return t;
    })
    .join(' ');
}

function buildEvidence(c: ZiweiChart): string[] {
  const out: string[] = [];
  out.push(`公历 ${c.solarDate} · 农历 ${c.lunarDate} · ${c.timeRange}`);
  out.push(`四柱：${c.chineseDate}`);
  out.push(`命主 ${c.soul} · 身主 ${c.body} · 五行局 ${c.fiveElementsClass} · 生肖 ${c.zodiac} · 星座 ${c.sign}`);

  // 命宫 / 身宫
  const ming = c.palaces.find((p) => p.name === '命宫');
  const shen = c.palaces.find((p) => p.isBodyPalace);
  if (ming) {
    const major = starLine(ming.majorStars) || '空宫';
    const minor = starLine(ming.minorStars);
    out.push(`命宫在${ming.ganZhi}，主星：${major}${minor ? '；辅星：' + minor : ''}`);
  }
  if (shen) out.push(`身宫落${shen.name}（${shen.ganZhi}）`);

  // 十二宫主星分布
  out.push('十二宫：');
  for (const p of c.palaces) {
    const major = starLine(p.majorStars) || '空宫';
    const minor = starLine(p.minorStars);
    out.push(
      `　${p.name}（${p.ganZhi}）主星 ${major}${minor ? ' · 辅星 ' + minor : ''}`
    );
  }

  // 四化落宫
  const hua: string[] = [];
  for (const p of c.palaces) {
    for (const s of [...p.majorStars, ...p.minorStars]) {
      if (s.mutagen) hua.push(`${s.name}化${s.mutagen}在${p.name}宫`);
    }
  }
  if (hua.length) out.push(`四化：${hua.join(' · ')}`);

  // 大限（各宫起止年龄，按年龄排序）
  const decadal = c.palaces
    .filter((p) => p.decadal.range[1] > 0)
    .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])
    .map((p) => {
      // 「命宫」本身已带「宫」字，避免拼成「命宫宫」
      const label = p.name.endsWith('宫') ? p.name : p.name + '宫';
      return `${p.decadal.range[0]}-${p.decadal.range[1]}岁走${label}（${p.decadal.ganZhi}）`;
    });
  if (decadal.length) out.push(`大限：${decadal.join(' · ')}`);

  return out;
}

// ---------- 排盘 → 注入 systemPrompt 的文本 ----------

export function ziweiToPrompt(chart: ZiweiChart): string {
  let text = '【命主紫微斗数命盘已由系统排定，请严格依据以下星盘论断，不得自行推算星曜或四化】\n';
  text += `命主：${chart.name || '（未具名）'}　性别：${chart.gender === 'male' ? '男' : '女'}\n`;
  for (const e of chart.evidence) text += `· ${e}\n`;
  text += '\n' + ZIWEI_INTERPRETATION + '\n';
  return text;
}
