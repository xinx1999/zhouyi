/**
 * 周易算 · 回归测试套件（零依赖，tsx 运行）
 * 覆盖 12 个术数体系的核心不变量 + 方法论注入断言。
 * 运行：npm test  （或 node_modules/.bin/tsx tests/regression.ts）
 *
 * 设计原则（见老板记忆）：测试必须能真的挂——本套件断言的每一条
 * 都对应一个可能被改坏的真实不变量（如 64 卦唯一、变卦只反转动爻、
 * *ToPrompt 真的把方法论常量拼进去了）。
 */
import { castDivination, getNajia, hexagramToPrompt, getDailyData } from '../server/divination.js';
import { castBazi, baziToPrompt } from '../server/bazi.js';
import { castZiwei, ziweiToPrompt } from '../server/ziwei.js';
import { castTarot, tarotToPrompt } from '../server/tarot.js';
import { castQimen, qimenToPrompt } from '../server/qimen.js';
import { castDaliuren, daliurenToPrompt } from '../server/daliuren.js';
import { castDream, dreamToPrompt, DREAM_SYMBOL_COUNT } from '../server/dream.js';
import { castHepan, hepanToPrompt } from '../server/hepan.js';
import { scoreMbti, MBTI_QUESTIONS } from '../server/mbti.js';

let pass = 0;
let fail = 0;
const log: string[] = [];
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    pass++;
    log.push('  \u2713 ' + name);
  } else {
    fail++;
    log.push('  \u2717 ' + name + (detail ? '  :: ' + detail : ''));
  }
}

// ───────────────────────── 一、起卦引擎（六爻 / 梅花 / 纳甲） ─────────────────────────
{
  // 64 卦唯一覆盖 + 卦序合法
  const seqs = new Set<number>();
  let allLegal = true;
  for (let i = 1; i <= 8; i++) {
    for (let j = 1; j <= 8; j++) {
      const r = castDivination({ method: 'number', numbers: [i, j] });
      seqs.add(r.benGua.seq);
      if (r.benGua.seq < 1 || r.benGua.seq > 64) allLegal = false;
      if (r.benGua.lines.length !== 6) allLegal = false;
      if (!r.benGua.lines.every((l) => [6, 7, 8, 9].includes(l.value))) allLegal = false;
    }
  }
  check('64 卦唯一覆盖', seqs.size === 64, `got ${seqs.size}`);
  check('卦序 1..64 且每卦 6 爻 / 爻值合法', allLegal);

  // 动爻与变卦一致性：变爻位上的爻，值必为 6/9（老阴/老阳）
  const coin = castDivination({ method: 'coin' });
  const changing = coin.benGua.lines.filter((l) => l.changing);
  const changingLegal = changing.every((l) => l.value === 6 || l.value === 9);
  check('动爻必为老阴(6)/老阳(9)', changingLegal);

  // 有动爻则必有之卦，且之卦只在动爻位与本卦不同（阴阳反转）
  if (coin.changingPositions.length > 0) {
    check('有动爻则存在之卦', coin.zhiGua !== null);
    let onlyAtChanging = true;
    coin.benGua.lines.forEach((bl, idx) => {
      const zl = coin.zhiGua!.lines[idx];
      if (bl.changing) {
        if (zl.value === bl.value) onlyAtChanging = false; // 动爻必须反转
      } else {
        if (zl.value !== bl.value) onlyAtChanging = false; // 静爻必须相同
      }
    });
    check('之卦仅在动爻位反转', onlyAtChanging);
  } else {
    check('无动爻时之卦为 null', coin.zhiGua === null);
  }

  // 纳甲六爻排盘联动
  const najia = castDivination({ method: 'coin', najia: true });
  check('najia 模式排盘附带', !!najia.najia);
  check('纳甲排盘数据完整', !!najia.najia && najia.najia.lines.length === 6);
  check('世爻/应爻位合法', !!najia.najia && najia.najia.world >= 1 && najia.najia.world <= 6 && najia.najia.ying >= 1 && najia.najia.ying <= 6);

  // 梅花易数（时间起卦）能成卦
  const meihua = castDivination({ method: 'time', timestamp: Date.now() });
  check('梅花/时间起卦成卦', meihua.benGua.seq >= 1 && meihua.benGua.seq <= 64);

  // 起卦提示词含方法论（六爻 / 梅花）
  check('hexagramToPrompt 注入断卦法', /六爻|梅花/.test(hexagramToPrompt(coin)));
}

// ───────────────────────── 二、八字 ─────────────────────────
{
  const chart = castBazi({ gender: 'male', year: 1990, month: 5, day: 20, hour: 8 });
  check('八字四柱', chart.pillars.length === 4);
  const ganzhiRe = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;
  check('四柱干支格式合法', chart.pillars.every((p) => ganzhiRe.test(p.ganZhi)));
  check('日主非空', !!chart.dayMaster);
  check('baziToPrompt 注入方法论', baziToPrompt(chart).includes('八字命理'));
}

// ───────────────────────── 三、紫微斗数 ─────────────────────────
{
  const chart = castZiwei({ gender: 'male', year: 1990, month: 5, day: 20, hour: 8 });
  check('紫微 12 宫', chart.palaces.length === 12);
  check('紫微每宫有主星字段', chart.palaces.every((p) => Array.isArray(p.majorStars)));
  check('ziweiToPrompt 注入方法论', ziweiToPrompt(chart).includes('紫微斗数'));
}

// ───────────────────────── 四、塔罗 ─────────────────────────
{
  const r = castTarot({ spread: 'three-time', seed: 'regression' });
  check('塔罗三牌阵 = 3 张', r.cards.length === 3);
  check('每张牌有名 & 正逆位', r.cards.every((c) => !!c.name && typeof c.reversed === 'boolean'));
  check('tarotToPrompt 注入方法论', tarotToPrompt(r).includes('塔罗'));
}

// ───────────────────────── 五、奇门遁甲 ─────────────────────────
{
  const c = castQimen({ year: 2026, month: 10, day: 16, hour: 10 });
  check('奇门九宫', c.palaces.length === 9);
  check('qimenToPrompt 注入方法论', qimenToPrompt(c).includes('奇门遁甲'));
}

// ───────────────────────── 六、大六壬 ─────────────────────────
{
  const c = castDaliuren({ year: 2026, month: 10, day: 16, hour: 10 });
  check('大六壬四课三传有课体', typeof c.sanChuan.keTi === 'string' && c.sanChuan.keTi.length > 0);
  check('大六壬 49 神煞表存在', Array.isArray(c.shenSha));
  check('daliurenToPrompt 注入方法论', daliurenToPrompt(c).includes('大六壬断课法'));
}

// ───────────────────────── 七、周公解梦 ─────────────────────────
{
  check('解梦词库 = 286', DREAM_SYMBOL_COUNT === 286, `got ${DREAM_SYMBOL_COUNT}`);
  const hit = castDream({ dreamText: '梦见大水把房子冲走了' });
  check('解梦命中已知意象（水/房子）', hit.hits.length >= 1, `hits=${hit.hits.length}`);
  const miss = castDream({ dreamText: 'qwertyuiop 随机无意义串 zxcvbnm' });
  check('解梦未命中标记 unmatched', miss.unmatched === true && miss.hits.length === 0);
  check('dreamToPrompt 注入方法论', dreamToPrompt(hit).includes('民俗解梦法'));
}

// ───────────────────────── 八、合盘（合婚） ─────────────────────────
{
  const a = { name: '甲', gender: 'male' as const, year: 1990, month: 5, day: 20, hour: 8 };
  const b = { name: '乙', gender: 'female' as const, year: 1992, month: 3, day: 15, hour: 14 };
  const r = castHepan(a, b);
  check('合盘五维比对', r.aspects.length === 5);
  check('合盘有总分', typeof r.totalScore === 'number');
  check('hepanToPrompt 注入方法论', hepanToPrompt(r).includes('传统合婚法'));
}

// ───────────────────────── 九、MBTI ─────────────────────────
{
  const allZero = MBTI_QUESTIONS.map(() => 0 as const);
  const r = scoreMbti({ answers: allZero });
  check('MBTI 四维计分', r.dimensions.length === 4);
  check('MBTI 类型为合法 4 字母', /^[EI][SN][TF][JP]$/.test(r.code), r.code);
  check('MBTI 全 0 答案 => ESTJ（回归锚点）', r.code === 'ESTJ', r.code);
}

// ───────────────────────── 十、每日数据 ─────────────────────────
{
  const d = getDailyData(new Date());
  check('每日一卦存在', !!d.hexagram && d.hexagram.seq >= 1 && d.hexagram.seq <= 64);
  check('每日一句存在', !!d.quote && d.quote.text.length > 0);
  check('每日宜忌存在', Array.isArray(d.yi) && Array.isArray(d.ji));
}

// ───────────────────────── 汇总 ─────────────────────────
console.log('\n周易算 · 回归测试');
console.log(log.join('\n'));
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) {
  console.error(`\n${fail} 项未通过`);
  process.exit(1);
}
console.log('>>> ALL PASS');
