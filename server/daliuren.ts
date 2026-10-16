// ============================================================
// 大六壬起课引擎（基于 liuren-ts-lib，Apache-2.0）
// 大六壬以月将加占时立天地盘，观四课三传以断吉凶。
// 本模块只做「事实」：月将、天地盘、四课、三传、神煞、贵人，
// 吉凶断语交由模型依解读方法论判断。
// ============================================================

import { getLiuRenByDate } from 'liuren-ts-lib';
import { DALIUREN_INTERPRETATION } from './interpretation.js';

// ---------- 类型定义 ----------

// 一课的干支（如 ["子癸", "青龙"]）
export type DlrKe = [string, string];

// 天地盘：以十二地支为键（自子至亥）
export interface DlrTianDiPan {
  diPan: Record<string, string>;
  tianPan: Record<string, string>;
  tianJiang: Record<string, string>;
}

// 四课
export interface DlrSiKe {
  ke1: DlrKe;
  ke2: DlrKe;
  ke3: DlrKe;
  ke4: DlrKe;
}

// 一传：地支、天将、六亲、遁干
export type DlrChuan = [string, string, string, string];

// 三传 + 课体
export interface DlrSanChuan {
  chuChuan: DlrChuan;
  zhongChuan: DlrChuan;
  moChuan: DlrChuan;
  keTi: string;
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
  tianDiPan: DlrTianDiPan;
  siKe: DlrSiKe;
  sanChuan: DlrSanChuan;
  dunGan: Record<string, string>;
  chuJian: Record<string, string>;
  fuJian: Record<string, string>;
  jianChu: Record<string, string>;
  shenSha: DlrShenShaItem[];
  yinYangGuiRen: { yangGuiRen: Record<string, string>; yinGuiRen: Record<string, string> };
  // 派生字段
  pillars: string[]; // 四柱（年 月 日 时）
  keTis: string[]; // 四课课名
  evidence: string[];
}

// ---------- 输入 ----------

export interface DaliurenInput {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  timestamp?: number; // 与上面二选一
}

// ---------- 常量 ----------

// 地支标准顺序（子→亥），用于把键值对转成有序数组
// liuren-ts-lib 的天地盘等字段以拼音为键（zi/chou/yin…），这里建拼音→中文映射
const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZHI_PINYIN: Record<string, string> = {
  子: 'zi', 丑: 'chou', 寅: 'yin', 卯: 'mao', 辰: 'chen',
  巳: 'si', 午: 'wu', 未: 'wei', 申: 'shen', 酉: 'you',
  戌: 'xu', 亥: 'hai',
};

// ---------- 工具 ----------

function zhiKeysInOrder(pan: DlrTianDiPan): DlrGongPan[] {
  return ZHI_ORDER.map((zhi) => {
    const key = ZHI_PINYIN[zhi];
    return {
      zhi,
      diPan: pan.diPan?.[key] ?? '',
      tianPan: pan.tianPan?.[key] ?? '',
      tianJiang: pan.tianJiang?.[key] ?? '',
    };
  });
}

function toDate(input: DaliurenInput): Date {
  if (typeof input.timestamp === 'number' && input.timestamp > 0) {
    return new Date(input.timestamp);
  }
  const year = input.year ?? new Date().getFullYear();
  const month = input.month ?? new Date().getMonth() + 1;
  const day = input.day ?? new Date().getDate();
  const hour = input.hour ?? new Date().getHours();
  const minute = input.minute ?? 0;
  // JS 的 Date 月份从 0 开始；小时按钟表时间传入（库内部会按占时定位）
  return new Date(year, month - 1, day, hour, minute, 0);
}

// liuren-ts-lib 的字段是「具体键」的 interface（无索引签名），
// 且数组元素数量不保证，统一做一层规范化，转成本模块的宽松类型
function normGong(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === 'string') out[k] = val;
    }
  }
  return out;
}

function normKe(ke: unknown): DlrKe {
  const a = Array.isArray(ke) ? ke : [];
  return [String(a[0] ?? ''), String(a[1] ?? '')];
}

function normChuan(c: unknown): DlrChuan {
  const a = Array.isArray(c) ? c : [];
  return [String(a[0] ?? ''), String(a[1] ?? ''), String(a[2] ?? ''), String(a[3] ?? '')];
}

// 三传格式化为单行文本（供 evidence 与面板复用）
function chuanText(chuan: DlrChuan): string {
  const [zhi, tianJiang, liuQin, dunGan] = chuan;
  const liuQinPart = liuQin ? `·${liuQin}` : '';
  const dunGanPart = dunGan ? `·${dunGan}` : '';
  return `${zhi} ${tianJiang}${liuQinPart}${dunGanPart}`;
}

// ---------- 排盘入口 ----------

export function castDaliuren(input: DaliurenInput): DaliurenChart {
  const date = toDate(input);
  const raw = getLiuRenByDate(date);

  const info: DlrDateInfo = {
    bazi: raw.dateInfo.bazi,
    date: raw.dateInfo.date,
    kong: raw.dateInfo.kong,
    yima: raw.dateInfo.yima,
    yuejiang: raw.dateInfo.yuejiang,
    xun: raw.dateInfo.xun,
    dingma: raw.dateInfo.dingma,
    tianma: raw.dateInfo.tianma,
  };

  const chart: DaliurenChart = {
    dateInfo: info,
    tianDiPan: {
      diPan: normGong(raw.tianDiPan.diPan),
      tianPan: normGong(raw.tianDiPan.tianPan),
      tianJiang: normGong(raw.tianDiPan.tianJiang),
    },
    siKe: {
      ke1: normKe(raw.siKe.ke1),
      ke2: normKe(raw.siKe.ke2),
      ke3: normKe(raw.siKe.ke3),
      ke4: normKe(raw.siKe.ke4),
    },
    sanChuan: {
      chuChuan: normChuan(raw.sanChuan.chuChuan),
      zhongChuan: normChuan(raw.sanChuan.zhongChuan),
      moChuan: normChuan(raw.sanChuan.moChuan),
      keTi: String(raw.sanChuan.keTi ?? ''),
    },
    dunGan: normGong(raw.dunGan),
    chuJian: normGong(raw.chuJian),
    fuJian: normGong(raw.fuJian),
    jianChu: normGong(raw.jianChu),
    shenSha: (raw.shenSha ?? []).map((s) => ({
      name: String(s.name ?? ''),
      value: String(s.value ?? ''),
      description: String(s.description ?? ''),
    })),
    yinYangGuiRen: {
      yangGuiRen: normGong(raw.yinYangGuiRen.yangGuiRen),
      yinGuiRen: normGong(raw.yinYangGuiRen.yinGuiRen),
    },
    pillars: info.bazi.split(/\s+/),
    keTis: ['第一课', '第二课', '第三课', '第四课'],
    evidence: [],
  };

  // 证据：只列事实，不作吉凶断语
  const out: string[] = [];

  out.push(`占时：${info.date}（四柱 ${info.bazi}）`);
  out.push(`月将：${info.yuejiang}`);
  out.push(`旬首：${info.xun}`);
  out.push(`旬空：${info.kong.join('、') || '无'}`);

  // 天地盘（含天将十二神）
  const diPanText = ZHI_ORDER.map((zhi) => `${zhi}${chart.tianDiPan.diPan[ZHI_PINYIN[zhi]]}`).join(' ');
  const tianPanText = ZHI_ORDER.map((zhi) => `${zhi}${chart.tianDiPan.tianPan[ZHI_PINYIN[zhi]]}`).join(' ');
  out.push(`地盘：${diPanText}`);
  out.push(`天盘：${tianPanText}`);

  // 四课
  const keList: DlrKe[] = [chart.siKe.ke1, chart.siKe.ke2, chart.siKe.ke3, chart.siKe.ke4];
  const keTexts = keList.map((ke, i) => `${chart.keTis[i]}：${ke[0]}（${ke[1]}）`);
  out.push(`四课：${keTexts.join('；')}`);

  // 三传
  out.push(`课体：${chart.sanChuan.keTi}`);
  out.push(`初传（发用）：${chuanText(chart.sanChuan.chuChuan)}`);
  out.push(`中传：${chuanText(chart.sanChuan.zhongChuan)}`);
  out.push(`末传（归计）：${chuanText(chart.sanChuan.moChuan)}`);

  // 遁干（天地盘之干，键为拼音）
  const dunGanText = ZHI_ORDER.map((zhi) => `${zhi}${chart.dunGan[ZHI_PINYIN[zhi]] ?? ''}`).join(' ');
  if (dunGanText) out.push(`遁干：${dunGanText}`);

  // 建除（按日，键为拼音）
  const jianChuText = ZHI_ORDER.map((zhi) => `${zhi}${chart.jianChu[ZHI_PINYIN[zhi]] ?? ''}`).join(' ');
  if (jianChuText) out.push(`建除：${jianChuText}`);

  // 神煞（只列吉凶明确的常见类，全部列表供模型自取）
  const shenShaText = chart.shenSha
    .map((s) => `${s.name}${s.value}`)
    .join(' ');
  if (shenShaText) out.push(`神煞：${shenShaText}`);

  // 阴阳贵人盘（阳贵人、阴贵人各一）
  const yangGuiRenText = ZHI_ORDER.map((zhi) => `${zhi}${chart.yinYangGuiRen.yangGuiRen[ZHI_PINYIN[zhi]]}`).join(' ');
  const yinGuiRenText = ZHI_ORDER.map((zhi) => `${zhi}${chart.yinYangGuiRen.yinGuiRen[ZHI_PINYIN[zhi]]}`).join(' ');
  out.push(`阳贵人盘：${yangGuiRenText}`);
  out.push(`阴贵人盘：${yinGuiRenText}`);

  chart.evidence = out;
  return chart;
}

// ---------- 提示词生成 ----------

// 把排盘结果转为注入 systemPrompt 的文本（只含事实）
export function daliurenToPrompt(chart: DaliurenChart): string {
  let text = '【大六壬起课已由系统完成，请严格依据以下课盘解读，切勿另起一课】\n';
  text += `起课时间：${chart.dateInfo.date}（四柱 ${chart.dateInfo.bazi}）\n`;
  text += `月将：${chart.dateInfo.yuejiang}（月将加占时以立天盘，为课之根）\n`;
  text += `旬首：${chart.dateInfo.xun}　旬空：${chart.dateInfo.kong.join('、') || '无'}（落空之支主事体虚而不实、待时而应，须与所问之事相参）\n`;
  text += `驿马：${chart.dateInfo.yima}　丁马：${chart.dateInfo.dingma}　天马：${chart.dateInfo.tianma}（三马主迁动、出行、变动）\n`;

  // 天地盘（地支顺序：子丑寅卯…亥）
  text += '\n天地盘（自子至亥：天盘·地盘·天将）：\n';
  const diPan = chart.tianDiPan.diPan;
  const tianPan = chart.tianDiPan.tianPan;
  const tianJiang = chart.tianDiPan.tianJiang;
  for (const zhi of ZHI_ORDER) {
    const key = ZHI_PINYIN[zhi];
    text += `　${zhi}　天盘${tianPan[key]}　地盘${diPan[key]}　${tianJiang[key]}\n`;
  }

  text += '\n四课（自下而上）：\n';
  text += '　【读法】每课写作「上神+下神」：第一课＝日干之上神＋日干；第二课＝第一课上神之上神＋第一课上神；\n';
  text += '　第三课＝日支之上神＋日支；第四课＝第三课上神之上神＋第三课上神。括号内为该课天将。\n';
  const keList: DlrKe[] = [chart.siKe.ke1, chart.siKe.ke2, chart.siKe.ke3, chart.siKe.ke4];
  keList.forEach((ke, i) => {
    text += `　${chart.keTis[i]}：${ke[0]}（${ke[1]}）\n`;
  });

  text += '\n三传：\n';
  text += `　课体：${chart.sanChuan.keTi}\n`;
  text += `　初传（发用）：${chuanText(chart.sanChuan.chuChuan)}\n`;
  text += `　中传：${chuanText(chart.sanChuan.zhongChuan)}\n`;
  text += `　末传（归计）：${chuanText(chart.sanChuan.moChuan)}\n`;

  if (chart.shenSha.length) {
    text += '\n神煞（名称·落宫）：\n';
    chart.shenSha.forEach((s) => {
      text += `　${s.name}${s.value}　${s.description}\n`;
    });
  }

  text += '\n' + DALIUREN_INTERPRETATION;
  return text;
}

// 导出一个便捷函数，供面板按地支顺序渲染天地盘
export function buildGongPan(chart: DaliurenChart): DlrGongPan[] {
  return zhiKeysInOrder(chart.tianDiPan);
}
