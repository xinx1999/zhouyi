// ============================================================
// MBTI 性格测评（题库 + 计分 + 16 型描述）
//
// 题库为原创措辞（现成 MBTI 题库多有版权），每题二选一，
// 四个维度各 20 题：EI（外向-内向）· SN（实感-直觉）· TF（思考-情感）· JP（判断-知觉）。
//
// 计分纯逻辑、无外部依赖；结果只给「型与得分」，
// 性格描述来自本文件的 16 型表（同样是概括性描述，非版权内容）。
// ============================================================

// ---------- 类型 ----------

export type MbtiDimension = 'EI' | 'SN' | 'TF' | 'JP';
export type MbtiLetter = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export interface MbtiQuestion {
  id: number;
  dim: MbtiDimension;
  text: string;
  a: string; // 选 a 记 aPole 一分
  b: string; // 选 b 记 bPole 一分
  aPole: string; // 'E' | 'S' | 'T' | 'J'
  bPole: string; // 'I' | 'N' | 'F' | 'P'
}

// ---------- 题库（80 题，每维 20 题）----------

const RAW: Array<[MbtiDimension, string, string, string]> = [
  // ===== EI 外向 / 内向 =====
  ['EI', '周末你更愿意…', '约朋友出去热闹一下', '一个人安静待着'],
  ['EI', '在陌生聚会里，你通常…', '主动找话题搭话', '等别人先开口'],
  ['EI', '忙碌一周后，让你恢复精力的是…', '和人聚一聚', '独处放空'],
  ['EI', '遇到难题时，你更倾向于…', '找人聊一聊理思路', '自己想明白再说'],
  ['EI', '长时间一个人待着，你感到…', '有点闷，想找人说说话', '很舒服，是种充电'],
  ['EI', '在会议上，你更常…', '脱口而出想到什么', '先在脑里过一遍再发言'],
  ['EI', '认识新朋友这件事…', '让你觉得兴奋', '让你有点耗神'],
  ['EI', '打电话和发消息之间，你…', '更愿意直接打电话', '更愿意发消息'],
  ['EI', '一群人里你通常…', '是比较活跃的那个', '多在旁边听着'],
  ['EI', '你的一天结束后，更想要…', '热闹一点的活动', '安静一点的独处'],
  ['EI', '被要求在众人面前发言，你…', '会觉得来劲', '会提前紧张很久'],
  ['EI', '你的想法通常是…', '边说边成形', '在心里基本想好了才出口'],
  ['EI', '在一个大办公室里工作，你…', '喜欢有人说话的氛围', '更希望戴耳机安静做事'],
  ['EI', '旅行时你更喜欢…', '结伴同行热热闹闹', '自己安排行程'],
  ['EI', '你的社交圈…', '广而浅，常认识新朋友', '窄而深，就那么几个老友'],
  ['EI', '做重要决定时，你…', '习惯听听别人的看法', '更多靠自己的判断'],
  ['EI', '安静地待一整天不说话…', '对你来说很难受', '对你来说很平常'],
  ['EI', '刚进入一个新环境，你…', '很快就和人熟络起来', '需要一段时间才放得开'],
  ['EI', '你更喜欢的下班安排是…', '约同事吃点东西', '直接回家'],
  ['EI', '「独处」对你来说是…', '有点无聊', '一种享受'],

  // ===== SN 实感 / 直觉 =====
  ['SN', '面对一件事，你更先注意到…', '具体的事实和细节', '整体的感觉和可能性'],
  ['SN', '你更信任…', '亲眼所见、亲身经验', '直觉和联想'],
  ['SN', '学新东西时你更喜欢…', '按步骤一步步来', '先看个大概再自己摸索'],
  ['SN', '聊天时你更容易…', '聊具体的近况和琐事', '跳到概念和假设'],
  ['SN', '看一部电影，你更在意…', '情节是否讲得清楚', '有没有让人回味的余味'],
  ['SN', '你更愿意做…', '已经有成熟做法的事', '从没做过、要自己试的事'],
  ['SN', '描述一个地方，你…', '会说清它长什么样', '会说它给你什么感觉'],
  ['SN', '计划旅行时你…', '先把住宿和路线定好', '先想这趟旅程的意义'],
  ['SN', '你解决问题靠…', '过去有效的办法', '换个角度的新点子'],
  ['SN', '别人说一件事，你更关心…', '它现在实际怎么样', '它将来可能怎样'],
  ['SN', '你更擅长的记忆是…', '细节和数据', '大意和印象'],
  ['SN', '一份报告，你更看重…', '论据是否扎实', '观点是否新颖'],
  ['SN', '你更容易被…', '眼前真实的问题吸引', '脑中的构想吸引'],
  ['SN', '别人说话绕弯时，你…', '希望他说得具体点', '能跟上他的跳跃'],
  ['SN', '选工作时你更看重…', '职责是否清晰、待遇是否实在', '是否有成长空间和想象'],
  ['SN', '你更相信…', '统计出来的数字', '趋势给人的感觉'],
  ['SN', '你的房间更可能是…', '每样东西各有其位', '随手放，乱中有序'],
  ['SN', '读说明书时你…', '从头看到尾再动手', '翻一下就直接开始试'],
  ['SN', '你更喜欢的话题是…', '具体的人和事', '抽象的观念和理论'],
  ['SN', '「脚踏实地」和「脑洞大」，你…', '偏向前者', '偏向后者'],

  // ===== TF 思考 / 情感 =====
  ['TF', '做决定时你更看重…', '哪个选择更合理', '哪个选择让大家更舒服'],
  ['TF', '朋友向你诉苦，你通常…', '帮他分析问题出在哪', '先让他知道你理解他'],
  ['TF', '你更希望别人评价你…', '公正、有逻辑', '温暖、为人着想'],
  ['TF', '争论中你更在意…', '道理上谁对谁错', '关系有没有弄僵'],
  ['TF', '规则与情面冲突时，你…', '倾向按规则来', '倾向看情况通融'],
  ['TF', '别人批评你的方案，你…', '先想他说得对不对', '先在意他是不是针对我'],
  ['TF', '你更难拒绝…', '明显不讲理的要求', '显得可怜的要求'],
  ['TF', '团队里你更像…', '把关质量的人', '维系气氛的人'],
  ['TF', '「对事不对人」你…', '觉得很合理', '觉得有点冷'],
  ['TF', '评价一件事，你更容易…', '先看利弊得失', '先看影响的是谁'],
  ['TF', '你希望别人说你…', '靠谱、讲理', '善良、贴心'],
  ['TF', '看到不公平的事，你…', '先弄清是怎么回事', '先感到气愤'],
  ['TF', '你更容易原谅…', '讲清缘由的人', '真诚道歉的人'],
  ['TF', '安排事务时你…', '按效率和逻辑排', '按人的情况灵活调'],
  ['TF', '别人情绪低落时，你…', '问他需不需要建议', '安静陪着'],
  ['TF', '你觉得「诚实」就是…', '把事实说清楚', '不伤害人的前提下说清楚'],
  ['TF', '做绩效评价时你…', '按标准打分', '会照顾对方的处境'],
  ['TF', '你更怕成为…', '做事糊涂的人', '让人失望的人'],
  ['TF', '你和人产生分歧，你…', '会直接说出来讨论', '会先想怎么说不伤感情'],
  ['TF', '「理性」和「感性」，你…', '更认前者', '更认后者'],

  // ===== JP 判断 / 知觉 =====
  ['JP', '出门旅行前，你会…', '把行程和住宿都订好', '定个大方向就出发'],
  ['JP', '任务截止前，你…', '提前做完才安心', '常常到最后才动起来'],
  ['JP', '你的桌面和文件…', '会定期整理归位', '堆着，能找到就行'],
  ['JP', '计划被打乱时，你…', '觉得不舒服，想改回去', '觉得也行，顺其自然'],
  ['JP', '周末的安排你…', '通常提前想好', '当天再看心情'],
  ['JP', '购物清单对你…', '很有用，会照着买', '大概看一眼就去了'],
  ['JP', '你更喜欢的工作方式是…', '有明确的时间节点', '保持弹性、随时调整'],
  ['JP', '面对多个待办，你…', '先排个优先级', '来了就做，谁急谁先'],
  ['JP', '做出选择后，你…', '就不再想回头', '仍会看看别的可能'],
  ['JP', '「定下来」这件事让你…', '感到安心', '感到有点受限'],
  ['JP', '你的待办清单…', '写下来并勾掉', '主要在脑子里'],
  ['JP', '临时被改计划，你…', '需要一点时间适应', '无所谓，随机应变'],
  ['JP', '一件事没做完，你…', '会一直挂心', '做完就放下'],
  ['JP', '你更擅长…', '把一件事收尾', '把一件事开个头'],
  ['JP', ' Deadline 前一天你…', '通常已经做完了', '通常正在赶'],
  ['JP', '你对「意外」的态度是…', '尽量提前规避', '来了就应对'],
  ['JP', '你的日程表…', '记得比较满、比较清楚', '留很多空、比较模糊'],
  ['JP', '决定一件事，你…', '倾向尽快定下来', '倾向再看看'],
  ['JP', '房间乱了你会…', '找个时间收拾干净', '乱着也能住下去'],
  ['JP', '你更喜欢的状态是…', '有条不紊、心里有数', '开放、留有余地'],
];

export const MBTI_QUESTIONS: MbtiQuestion[] = RAW.map((r, i) => ({
  id: i + 1,
  dim: r[0],
  text: r[1],
  a: r[2],
  b: r[3],
  aPole: r[0][0], // E / S / T / J
  bPole: r[0][1], // I / N / F / P
}));

// ---------- 16 型描述 ----------

export interface MbtiTypeInfo {
  code: string;
  name: string;
  alias: string;
  strengths: string;
  watchouts: string;
}

export const MBTI_TYPES: Record<string, MbtiTypeInfo> = {
  INTJ: { code: 'INTJ', name: '建筑师', alias: '策划者', strengths: '长于战略与体系，独立、有主见、目标感强', watchouts: '易显疏离，对他人情绪不够敏感' },
  INTP: { code: 'INTP', name: '逻辑学家', alias: '思考者', strengths: '求知欲强、逻辑严密、善于发现矛盾', watchouts: '易陷思虑，落地执行偏弱' },
  ENTJ: { code: 'ENTJ', name: '指挥官', alias: '领导者', strengths: '果断、组织力强、敢于拍板', watchouts: '易强势，忽视他人感受' },
  ENTP: { code: 'ENTP', name: '辩论家', alias: '智多星', strengths: '点子多、反应快、善于打破常规', watchouts: '易半途而废，喜争辩' },
  INFJ: { code: 'INFJ', name: '提倡者', alias: '咨询者', strengths: '洞察力深、有理想、善解人意', watchouts: '对自己要求过高，易内耗' },
  INFP: { code: 'INFP', name: '调停者', alias: '治愈者', strengths: '共情力强、重价值、有创造力', watchouts: '易逃避冲突，决策偏慢' },
  ENFJ: { code: 'ENFJ', name: '主人公', alias: '教导者', strengths: '有感召力、善于凝聚人、乐于助人', watchouts: '过度付出，忽视自身需求' },
  ENFP: { code: 'ENFP', name: '竞选者', alias: '激励者', strengths: '热情、好奇、擅长鼓舞他人', watchouts: '兴趣易转移，难坚持到底' },
  ISTJ: { code: 'ISTJ', name: '物流师', alias: '检查者', strengths: '可靠、务实、重规则与承诺', watchouts: '偏保守，对变化适应慢' },
  ISFJ: { code: 'ISFJ', name: '守卫者', alias: '保护者', strengths: '细致、体贴、默默承担责任', watchouts: '不擅表达需求，易委屈自己' },
  ESTJ: { code: 'ESTJ', name: '总经理', alias: '管理者', strengths: '执行有力、条理清晰、责任心强', watchouts: '偏强硬，不易接受异议' },
  ESFJ: { code: 'ESFJ', name: '执政官', alias: '供应者', strengths: '热心、善组织、重视人际和谐', watchouts: '在意他人评价，易被裹挟' },
  ISTP: { code: 'ISTP', name: '鉴赏家', alias: '巧匠', strengths: '冷静、动手能力强、临危不乱', watchouts: '偏独来独往，不善表达情感' },
  ISFP: { code: 'ISFP', name: '探险家', alias: '创作者', strengths: '审美敏锐、温和、活在当下', watchouts: '回避冲突，规划偏弱' },
  ESTP: { code: 'ESTP', name: '企业家', alias: '促进者', strengths: '行动快、敢冒险、善于应变', watchouts: '易冲动，缺乏耐心' },
  ESFP: { code: 'ESFP', name: '表演者', alias: '实践者', strengths: '热情活泼、感染力强、享受当下', watchouts: '易受外界牵引，难抗枯燥' },
};

// ---------- 计分 ----------

export interface MbtiInput {
  answers: (0 | 1 | null)[]; // 与 MBTI_QUESTIONS 对齐：0=选 a，1=选 b，null=未答
}

export interface MbtiDimensionScore {
  dim: MbtiDimension;
  letter: string; // 最终倾向
  poleA: string; // 第一极
  poleB: string; // 第二极
  scoreA: number;
  scoreB: number;
  total: number;
  percentA: number; // poleA 占比
  answered: number;
  label: string;
}

export interface MbtiResult {
  code: string; // 如 INTJ
  type: MbtiTypeInfo;
  dimensions: MbtiDimensionScore[];
  answered: number;
  total: number;
  complete: boolean; // 是否全部答完
  evidence: string[];
}

const DIM_LABEL: Record<MbtiDimension, string> = {
  EI: '能量方向（外向 E / 内向 I）',
  SN: '信息获取（实感 S / 直觉 N）',
  TF: '决策方式（思考 T / 情感 F）',
  JP: '生活态度（判断 J / 知觉 P）',
};

export function scoreMbti(input: MbtiInput): MbtiResult {
  const dims: MbtiDimensionScore[] = (['EI', 'SN', 'TF', 'JP'] as MbtiDimension[]).map((dim) => {
    const qs = MBTI_QUESTIONS.filter((q) => q.dim === dim);
    let a = 0;
    let b = 0;
    let answered = 0;
    for (const q of qs) {
      const ans = input.answers[q.id - 1];
      if (ans === 0) { a++; answered++; }
      else if (ans === 1) { b++; answered++; }
    }
    const total = qs.length;
    return {
      dim,
      letter: a >= b ? qs[0].aPole : qs[0].bPole,
      poleA: qs[0].aPole,
      poleB: qs[0].bPole,
      scoreA: a,
      scoreB: b,
      total,
      percentA: answered > 0 ? Math.round((a / answered) * 100) : 50,
      answered,
      label: DIM_LABEL[dim],
    };
  });

  const code = dims.map((d) => d.letter).join('');
  const type = MBTI_TYPES[code] ?? {
    code,
    name: code,
    alias: '',
    strengths: '',
    watchouts: '',
  };
  const answered = dims.reduce((s, d) => s + d.answered, 0);

  const evidence = [
    `测评结果：${code}（${type.name}${type.alias ? ' · ' + type.alias : ''}）`,
    `已作答 ${answered} / ${MBTI_QUESTIONS.length} 题`,
    ...dims.map(
      (d) =>
        `${d.label}：${d.letter}（${d.poleA} ${d.scoreA} 票 · ${d.poleB} ${d.scoreB} 票，${d.letter} 占 ${d.letter === d.poleA ? d.percentA : 100 - d.percentA}%）`
    ),
    `核心优势：${type.strengths}`,
    `需留意：${type.watchouts}`,
  ];

  return { code, type, dimensions: dims, answered, total: MBTI_QUESTIONS.length, complete: answered === MBTI_QUESTIONS.length, evidence };
}
