// ============================================================
// 八字排盘（四柱命理）
//
// 基础四柱 / 十神 / 藏干 / 纳音 / 十二长生 / 大运 / 流年 由 lunar-javascript 提供；
// 本文件补齐：五行统计、缺失五行、干支关系、核心神煞，并按「只给事实」产出 evidence[]。
//
// 与六爻/梅花一致的分层：计算归计算，断语交给模型（见 interpretation.ts）。
// ============================================================
import { Solar } from 'lunar-javascript';
import { BAZI_INTERPRETATION } from './interpretation.js';
import {
  type WuXing,
  BRANCH_ELEMENT,
  GAN_ELEMENT,
  LIU_CHONG,
  LIU_HE,
} from './ganzhi.js';

// ---------- 输入 / 输出 ----------

export interface BaziInput {
  name?: string;
  gender: 'male' | 'female';
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

export interface BaziPillar {
  label: string; // 年 / 月 / 日 / 时
  gan: string;
  zhi: string;
  ganZhi: string;
  ganElement: WuXing;
  zhiElement: WuXing;
  shiShenGan: string; // 天干十神（日柱为「日主」）
  hideGan: string[]; // 地支藏干
  shiShenZhi: string[]; // 藏干对应十神
  naYin: string; // 纳音
  diShi: string; // 十二长生（地势）
  xunKong: string; // 旬空
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
  solarText: string; // 公历
  lunarText: string; // 农历
  dayMaster: string; // 日主天干
  dayMasterElement: WuXing;
  pillars: BaziPillar[];
  wuXingCount: Record<WuXing, number>; // 五行统计（四柱本气）
  wuXingMissing: WuXing[]; // 缺失的五行
  relations: string[]; // 四柱干支关系（合冲害）
  shenSha: string[]; // 核心神煞
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  startYunText: string; // 起运
  daYun: DaYunStep[];
  evidence: string[]; // 结构化证据
}

// ---------- 神煞规则表 ----------

// 天乙贵人（以日干查四支）
const TIAN_YI: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};

// 文昌贵人（以日干查）
const WEN_CHANG: Record<string, string> = {
  甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉',
  己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
};

// 羊刃（以日干查）
const YANG_REN: Record<string, string> = {
  甲: '卯', 乙: '寅', 丙: '午', 戊: '午', 丁: '巳',
  己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥',
};

// 三合局 → 桃花 / 驿马 / 华盖 / 将星（以年支或日支查）
const GROUP_STARS: Record<string, { 桃花: string; 驿马: string; 华盖: string; 将星: string }> = {
  申: { 桃花: '酉', 驿马: '寅', 华盖: '辰', 将星: '子' },
  子: { 桃花: '酉', 驿马: '寅', 华盖: '辰', 将星: '子' },
  辰: { 桃花: '酉', 驿马: '寅', 华盖: '辰', 将星: '子' },
  寅: { 桃花: '卯', 驿马: '申', 华盖: '戌', 将星: '午' },
  午: { 桃花: '卯', 驿马: '申', 华盖: '戌', 将星: '午' },
  戌: { 桃花: '卯', 驿马: '申', 华盖: '戌', 将星: '午' },
  巳: { 桃花: '午', 驿马: '亥', 华盖: '丑', 将星: '酉' },
  酉: { 桃花: '午', 驿马: '亥', 华盖: '丑', 将星: '酉' },
  丑: { 桃花: '午', 驿马: '亥', 华盖: '丑', 将星: '酉' },
  亥: { 桃花: '子', 驿马: '巳', 华盖: '未', 将星: '卯' },
  卯: { 桃花: '子', 驿马: '巳', 华盖: '未', 将星: '卯' },
  未: { 桃花: '子', 驿马: '巳', 华盖: '未', 将星: '卯' },
};

const ALL_WU_XING: WuXing[] = ['金', '木', '水', '火', '土'];

// ---------- 主函数 ----------

export function castBazi(input: BaziInput): BaziChart {
  const { year, month, day, hour, minute = 0, gender } = input;

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const mk = (label: string, gan: string, zhi: string, shiShenGan: string, hideGan: string[], shiShenZhi: string[], naYin: string, diShi: string, xunKong: string): BaziPillar => ({
    label,
    gan,
    zhi,
    ganZhi: `${gan}${zhi}`,
    ganElement: GAN_ELEMENT[gan] ?? '土',
    zhiElement: BRANCH_ELEMENT[zhi] ?? '土',
    shiShenGan,
    hideGan,
    shiShenZhi,
    naYin,
    diShi,
    xunKong,
  });

  const pillars: BaziPillar[] = [
    mk('年', ec.getYearGan(), ec.getYearZhi(), ec.getYearShiShenGan(), ec.getYearHideGan(), ec.getYearShiShenZhi(), ec.getYearNaYin(), ec.getYearDiShi(), ec.getYearXunKong()),
    mk('月', ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthShiShenGan(), ec.getMonthHideGan(), ec.getMonthShiShenZhi(), ec.getMonthNaYin(), ec.getMonthDiShi(), ec.getMonthXunKong()),
    mk('日', ec.getDayGan(), ec.getDayZhi(), '日主', ec.getDayHideGan(), ec.getDayShiShenZhi(), ec.getDayNaYin(), ec.getDayDiShi(), ec.getDayXunKong()),
    mk('时', ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeShiShenGan(), ec.getTimeHideGan(), ec.getTimeShiShenZhi(), ec.getTimeNaYin(), ec.getTimeDiShi(), ec.getTimeXunKong()),
  ];

  const dayMaster = ec.getDayGan();
  const dayMasterElement = GAN_ELEMENT[dayMaster] ?? '土';

  // ---- 五行统计（四柱本气：4 天干 + 4 地支）----
  const wuXingCount = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 } as Record<WuXing, number>;
  for (const p of pillars) {
    wuXingCount[p.ganElement] = (wuXingCount[p.ganElement] ?? 0) + 1;
    wuXingCount[p.zhiElement] = (wuXingCount[p.zhiElement] ?? 0) + 1;
  }
  const wuXingMissing = ALL_WU_XING.filter((e) => wuXingCount[e] === 0);

  // ---- 干支关系（四柱两两之间）----
  const relations: string[] = [];
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i];
      const b = pillars[j];
      if (LIU_HE[a.zhi] === b.zhi) relations.push(`${a.label}支${a.zhi} 与 ${b.label}支${b.zhi} 六合`);
      if (LIU_CHONG[a.zhi] === b.zhi) relations.push(`${a.label}支${a.zhi} 与 ${b.label}支${b.zhi} 相冲`);
    }
  }

  // ---- 神煞 ----
  const zhis = pillars.map((p) => p.zhi);
  const shenSha: string[] = [];
  const tianYi = TIAN_YI[dayMaster] ?? [];
  for (const z of tianYi) {
    if (zhis.includes(z)) shenSha.push(`天乙贵人（${z}）`);
  }
  const wenChang = WEN_CHANG[dayMaster];
  if (wenChang && zhis.includes(wenChang)) shenSha.push(`文昌贵人（${wenChang}）`);
  const yangRen = YANG_REN[dayMaster];
  if (yangRen && zhis.includes(yangRen)) shenSha.push(`羊刃（${yangRen}）`);
  // 以年支与日支为基准查四类星
  for (const base of [pillars[0].zhi, pillars[2].zhi]) {
    const g = GROUP_STARS[base];
    if (!g) continue;
    for (const key of ['桃花', '驿马', '华盖', '将星'] as const) {
      const target = g[key];
      if (zhis.includes(target) && !shenSha.some((s) => s.startsWith(key))) {
        shenSha.push(`${key}（${target}）`);
      }
    }
  }

  // ---- 大运 / 流年 ----
  const yun = ec.getYun(gender === 'male' ? 1 : 0);
  const startYunText = `${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}天起运`;
  const daYun: DaYunStep[] = yun.getDaYun().map((d: any) => ({
    startYear: d.getStartYear(),
    endYear: d.getEndYear(),
    startAge: d.getStartAge(),
    ganZhi: d.getGanZhi(),
    liuNian: (d.getLiuNian() || []).map((x: any) => ({
      year: x.getYear(),
      age: x.getAge(),
      ganZhi: x.getGanZhi(),
    })),
  }));

  const chart: BaziChart = {
    name: input.name,
    gender,
    solarText: `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    lunarText: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    dayMaster,
    dayMasterElement,
    pillars,
    wuXingCount,
    wuXingMissing,
    relations,
    shenSha,
    taiYuan: ec.getTaiYuan(),
    mingGong: ec.getMingGong(),
    shenGong: ec.getShenGong(),
    startYunText,
    daYun,
    evidence: [],
  };

  chart.evidence = buildEvidence(chart);
  return chart;
}

// ---------- 排盘 → 注入 systemPrompt 的文本（事实层）----------

export function baziToPrompt(chart: BaziChart): string {
  let text = '【命主八字已由系统排定，请严格依据以下命盘论断，不得自行推算干支、十神或大运】\n';
  text += `命主：${chart.name || '（未具名）'}　性别：${chart.gender === 'male' ? '男' : '女'}\n`;
  text += `公历：${chart.solarText}　农历：${chart.lunarText}\n`;
  for (const e of chart.evidence) text += `· ${e}\n`;
  text += '\n' + BAZI_INTERPRETATION + '\n';
  return text;
}

// ---------- 证据（事实陈述，不含吉凶断语）----------

function buildEvidence(c: BaziChart): string[] {
  const out: string[] = [];
  const p = c.pillars;
  out.push(
    `四柱：${p[0].ganZhi}（年） ${p[1].ganZhi}（月） ${p[2].ganZhi}（日） ${p[3].ganZhi}（时）　日主：${c.dayMaster}（${c.dayMasterElement}）`
  );
  out.push(
    `十神（天干）：年${p[0].shiShenGan} 月${p[1].shiShenGan} 日主 时${p[3].shiShenGan}`
  );
  out.push(
    `纳音：${p.map((x) => `${x.label}${x.naYin}`).join(' · ')}`
  );
  out.push(
    `十二长生：${p.map((x) => `${x.label}${x.diShi}`).join(' · ')}`
  );
  out.push(
    `五行统计（四柱本气）：金${c.wuXingCount.金} 木${c.wuXingCount.木} 水${c.wuXingCount.水} 火${c.wuXingCount.火} 土${c.wuXingCount.土}` +
      (c.wuXingMissing.length ? `　缺：${c.wuXingMissing.join('、')}` : '　五行俱全')
  );
  if (c.relations.length) out.push(`干支关系：${c.relations.join('；')}`);
  if (c.shenSha.length) out.push(`神煞：${c.shenSha.join('、')}`);
  out.push(`胎元 ${c.taiYuan} · 命宫 ${c.mingGong} · 身宫 ${c.shenGong}`);
  out.push(`起运：${c.startYunText}`);

  // 大运首几步（供推运参考）
  const steps = c.daYun.filter((d) => d.ganZhi).slice(0, 6);
  if (steps.length) {
    out.push(
      '大运：' + steps.map((d) => `${d.startAge}岁起 ${d.ganZhi}（${d.startYear}-${d.endYear}）`).join(' · ')
    );
  }
  return out;
}
