// ============================================================
// 奇门遁甲排盘（洛书九宫 · 五层盘局）
//
// 排盘由 qimen-dunjia（MIT）提供：定局（拆补法）、地盘、天盘、
// 八门、九星、八神、旬首/符首/值符/值使、孤虚。
// 本文件负责：调用、换算时辰、整理为九宫结构、产出 evidence[]。
//
// 与其它体系一致的分层：只给事实，断语交给模型（见 interpretation.ts）。
// ============================================================
import { Solar } from 'lunar-javascript';
import * as qm from 'qimen-dunjia';
import { QIMEN_INTERPRETATION } from './interpretation.js';

// ---------- 输入 / 输出 ----------

export interface QimenInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

export interface QimenPalace {
  index: number; // 0-8，4 为中宫
  palace: string; // 巽離坤震中兌艮坎乾
  direction: string; // 东南 南 西南 东 中 西 东北 北 西北
  diPan: string; // 地盘干
  tianPan: string; // 天盘干
  door: string; // 八门（中宫为空）
  star: string; // 九星
  god: string; // 八神（中宫为空）
}

export interface QimenChart {
  solarText: string;
  fourPillars: string;
  jieQiName: string;
  yuanName: string;
  daysSinceJieQi: number;
  juShu: number; // 局数 1-9
  yinYang: '陽' | '陰';
  xunShou: string; // 旬首
  fuShou: string; // 符首
  zhiFu: string; // 值符（星）
  zhiFuPalace: string;
  zhiShi: string; // 值使（门）
  zhiShiPalace: string;
  tianQinPalace: string; // 天禽落宫
  palaces: QimenPalace[];
  kongWang: { year: string; month: string; day: string; hour: string };
  evidence: string[];
}

// 九宫方位中文名（对应 qimen-dunjia 的方位数组）
const DIRECTION_NAME: Record<string, string> = {
  巽: '东南', 離: '南', 坤: '西南', 震: '东', 中: '中宫', 兌: '西', 艮: '东北', 坎: '北', 乾: '西北',
};

// ---------- 主函数 ----------

export function castQimen(input: QimenInput): QimenChart {
  const { year, month, day, hour, minute = 0 } = input;
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);

  // 定局（拆补法）
  const ju = qm.calculateJuByChaiBu(solar, qm.JIEQI_JUSHU, qm.YUAN_NAMES);

  // 四柱干支
  const ec = solar.getLunar().getEightChar();

  // 排盘
  const chart = qm.generateQimenChart({
    年柱: ec.getYear(),
    月柱: ec.getMonth(),
    日柱: ec.getDay(),
    時柱: ec.getTime(),
    局數: ju.gameNumber,
    陰陽: ju.yinYang,
  });
  const o: any = qm.chartToObject(chart);

  const palaces: QimenPalace[] = (o.方位 as string[]).map((palace: string, i: number) => ({
    index: i,
    palace,
    direction: DIRECTION_NAME[palace] ?? palace,
    diPan: o.地盤?.[i] ?? '',
    tianPan: o.天盤?.[i] ?? '',
    door: o.地門?.[i] ?? '',
    star: o.九星?.[i] ?? '',
    god: o.八神?.[i] ?? '',
  }));

  const fmtKong = (v: any): string => {
    if (!v || typeof v !== 'object') return '';
    // 孤/虛 各为一组 24 山细分方位，用「、」分隔以免读成一片
    const g = Array.isArray(v.孤) ? v.孤.join('、') : '';
    const x = Array.isArray(v.虛) ? v.虛.join('、') : '';
    return `孤${g} 虛${x}`;
  };

  const chartData: QimenChart = {
    solarText: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    fourPillars: `${ec.getYear()} ${ec.getMonth()} ${ec.getDay()} ${ec.getTime()}`,
    jieQiName: ju.jieQiName,
    yuanName: ju.yuanName,
    daysSinceJieQi: ju.daysSinceJieQi,
    juShu: ju.gameNumber,
    yinYang: ju.yinYang,
    xunShou: o.旬首,
    fuShou: o.符首,
    zhiFu: o.值符,
    zhiFuPalace: o.值符落宮,
    zhiShi: o.值使,
    zhiShiPalace: o.值使落宮,
    tianQinPalace: o.天禽落宮,
    palaces,
    kongWang: {
      year: fmtKong(o.年旬空),
      month: fmtKong(o.月旬空),
      day: fmtKong(o.日旬空),
      hour: fmtKong(o.時旬空),
    },
    evidence: [],
  };

  chartData.evidence = buildEvidence(chartData);
  return chartData;
}

// ---------- 证据 ----------

function buildEvidence(c: QimenChart): string[] {
  const out: string[] = [];
  out.push(`时间：${c.solarText}　四柱：${c.fourPillars}`);
  out.push(`节气：${c.jieQiName}（${c.yuanName}，距节气 ${c.daysSinceJieQi} 天）　${c.yinYang}遁${c.juShu}局`);
  out.push(`旬首 ${c.xunShou} · 符首 ${c.fuShou}`);
  out.push(`值符 ${c.zhiFu}（落${c.zhiFuPalace}宫）· 值使 ${c.zhiShi}（落${c.zhiShiPalace}宫）`);
  out.push(`天禽星寄${c.tianQinPalace}宫`);
  if (c.kongWang.day) out.push(`日柱孤虚：${c.kongWang.day}`);

  out.push('九宫盘（地盘 / 天盘 / 八门 / 九星 / 八神）：');
  for (const p of c.palaces) {
    if (p.palace === '中') {
      out.push(`　中宫：九星 ${p.star}（天禽所寄），八门八神不落中宫`);
      continue;
    }
    out.push(
      `　${p.palace}宫（${p.direction}）：${p.star} · ${p.door} · ${p.god} · 地盘${p.diPan} / 天盘${p.tianPan}`
    );
  }
  return out;
}

// ---------- 排盘 → 注入 systemPrompt 的文本 ----------

export function qimenToPrompt(chart: QimenChart): string {
  let text = '【奇门遁甲盘已由系统排定，请严格依据以下九宫盘局论断，不得自行排盘或另立格局】\n';
  for (const e of chart.evidence) text += `· ${e}\n`;
  text += '\n' + QIMEN_INTERPRETATION + '\n';
  return text;
}
