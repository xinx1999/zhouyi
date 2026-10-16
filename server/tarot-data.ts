// ============================================================
// 塔罗牌义数据（78 张）
//
// 牌义是公开的传统知识，此处只给**关键词**（正位/逆位各数条），
// 不写长篇牌义 —— 组织语言与展开解读由模型完成（见 interpretation.ts）。
//
// 大阿卡纳 22 张 + 小阿卡纳 56 张（四组 × 14）。
// ============================================================

export type Arcana = 'major' | 'minor';
export type Suit = '权杖' | '圣杯' | '宝剑' | '星币';

export interface TarotCardData {
  id: string;
  name: string;
  arcana: Arcana;
  suit?: Suit; // 仅小阿卡纳
  element?: string; // 权杖火 / 圣杯水 / 宝剑风 / 星币土；大阿卡纳为星象或元素
  upright: string; // 正位关键词
  reversed: string; // 逆位关键词
}

// ---------- 大阿卡纳（22 张）----------

const MAJOR: TarotCardData[] = [
  { id: 'm00', name: '愚者', arcana: 'major', element: '天王星', upright: '新的开始·冒险·纯真·自由·无限可能', reversed: '鲁莽·犹豫不决·计划不周·逃避责任·轻率' },
  { id: 'm01', name: '魔术师', arcana: 'major', element: '水星', upright: '创造力·行动力·资源整合·沟通·开始实现', reversed: '欺骗·能力未发挥·犹豫·操控·思路混乱' },
  { id: 'm02', name: '女祭司', arcana: 'major', element: '月亮', upright: '直觉·内在智慧·静观其变·秘密·潜藏的知识', reversed: '忽视直觉·情绪压抑·秘密外泄·焦虑不安' },
  { id: 'm03', name: '皇后', arcana: 'major', element: '金星', upright: '丰饶·滋养·母性·美感·自然生长·感官享受', reversed: '过度依赖·创造力受阻·溺爱·浪费·缺乏关爱' },
  { id: 'm04', name: '皇帝', arcana: 'major', element: '白羊', upright: '权威·秩序·掌控·责任·稳定结构·父性原则', reversed: '专断·僵化·控制欲过强·权威失衡·责任感缺失' },
  { id: 'm05', name: '教皇', arcana: 'major', element: '金牛', upright: '传统·教导·精神指引·制度·团队·道德规范', reversed: '教条·盲目服从·虚伪·规矩束缚·异见受抑' },
  { id: 'm06', name: '恋人', arcana: 'major', element: '双子', upright: '结合·选择·爱情·价值观一致·重要关系', reversed: '关系失衡·选择困难·价值观冲突·三角纠葛·诱惑' },
  { id: 'm07', name: '战车', arcana: 'major', element: '巨蟹', upright: '胜利·意志坚定·前进动力·掌控局面·克服阻碍', reversed: '失控·方向迷失·急功近利·挫败·内耗' },
  { id: 'm08', name: '力量', arcana: 'major', element: '狮子', upright: '内在力量·温柔坚定·耐心·自我掌控·勇气', reversed: '自我怀疑·软弱·急躁·压抑情绪·信心不足' },
  { id: 'm09', name: '隐士', arcana: 'major', element: '处女', upright: '内省·寻求真相·智慧·独处·精神探索', reversed: '孤立·逃避社交·固执·过度挑剔·迷失方向' },
  { id: 'm10', name: '命运之轮', arcana: 'major', element: '木星', upright: '转机·循环·机遇·命运转折·时来运转', reversed: '停滞·抗拒改变·坏运气·重复旧模式·时机未到' },
  { id: 'm11', name: '正义', arcana: 'major', element: '天秤', upright: '公平·真相·因果·理性抉择·承担责任', reversed: '不公·偏见·逃避责任·失衡·误判' },
  { id: 'm12', name: '倒吊人', arcana: 'major', element: '海王星', upright: '换位思考·牺牲·等待·暂停·自愿的付出', reversed: '徒劳无功·无谓牺牲·停滞不前·抗拒放手' },
  { id: 'm13', name: '死神', arcana: 'major', element: '天蝎', upright: '结束与重生·彻底转变·放下过去·蜕变', reversed: '抗拒改变·拖延结束·旧事纠缠·停滞' },
  { id: 'm14', name: '节制', arcana: 'major', element: '射手', upright: '平衡·调和·耐心·中庸之道·长期主义', reversed: '失衡·极端·急躁·浪费精力·缺乏节制' },
  { id: 'm15', name: '恶魔', arcana: 'major', element: '摩羯', upright: '束缚·执念·欲望·成瘾·物质主义·被限制', reversed: '解脱束缚·觉醒·破除执念·重获自由' },
  { id: 'm16', name: '高塔', arcana: 'major', element: '火星', upright: '突变·崩塌·真相揭露·破而后立·剧烈改变', reversed: '延迟的危机·勉强维持·勉强逃过·恐惧改变' },
  { id: 'm17', name: '星星', arcana: 'major', element: '水瓶', upright: '希望·灵感·疗愈·信心·宁静·愿望成真', reversed: '失望·信心受挫·迷茫·不切实际·自我怀疑' },
  { id: 'm18', name: '月亮', arcana: 'major', element: '双鱼', upright: '潜意识·不安·幻象·直觉·迷雾中前行', reversed: '迷雾散去·真相浮现·焦虑缓解·走出困惑' },
  { id: 'm19', name: '太阳', arcana: 'major', element: '太阳', upright: '成功·喜悦·活力·真相·光明·丰盛', reversed: '短暂的阴霾·过度乐观·延迟的好消息·活力不足' },
  { id: 'm20', name: '审判', arcana: 'major', element: '冥王星', upright: '觉醒·召唤·重生·清算过往·重要决定', reversed: '自我怀疑·逃避召唤·拖延决定·旧事未了' },
  { id: 'm21', name: '世界', arcana: 'major', element: '土星', upright: '完成·圆满·整合·成就·旅途终点·圆满循环', reversed: '未完成·差临门一脚·延迟圆满·收尾困难' },
];

// ---------- 小阿卡纳（四组 × 14 张）----------

interface MinorSeed {
  suit: Suit;
  element: string;
  prefix: string;
}

const SUITS: MinorSeed[] = [
  { suit: '权杖', element: '火', prefix: 'w' },
  { suit: '圣杯', element: '水', prefix: 'c' },
  { suit: '宝剑', element: '风', prefix: 's' },
  { suit: '星币', element: '土', prefix: 'p' },
];

// 四组的「数字牌」与「宫廷牌」关键词（按牌义共性组织，避免 56 份重复劳动）
const NUMERALS: { label: string; upright: string; reversed: string }[] = [
  { label: 'A', upright: '新起点·灵感萌发·种子·潜能的注入', reversed: '时机未到·阻碍·灵感受阻·冲动' },
  { label: '二', upright: '平衡·选择·规划·初步权衡', reversed: '失衡·犹豫不决·信息不足·失衡' },
  { label: '三', upright: '初步成果·扩展·合作·萌芽壮大', reversed: '延迟·合作不畅·成果未显·重复' },
  { label: '四', upright: '稳固·休息·休整·基础建立', reversed: '停滞·抗拒改变·过度保守·松动' },
  { label: '五', upright: '冲突·变动·考验·竞争的代价', reversed: '冲突缓和·逃避冲突·内耗·僵持' },
  { label: '六', upright: '转机·和解·顺流·给予与接受', reversed: '不平等的交换·依赖·原地踏步' },
  { label: '七', upright: '坚持·评估·选择·耐住性子等待', reversed: '急躁·判断失误·放弃过早·不切实际' },
  { label: '八', upright: '努力见效·加速推进·精进·自律', reversed: '阻碍·效率低·徒劳·急于求成' },
  { label: '九', upright: '接近完成·独立·收获前夜·坚守', reversed: '焦虑·防备过当·遗留问题·难以放下' },
  { label: '十', upright: '圆满达成·重担与责任·周期收束', reversed: '负担过重·过度承担·难以放手·重来' },
];

const COURTS: { label: string; upright: string; reversed: string }[] = [
  { label: '侍者', upright: '学习·消息·新尝试·好奇与热情', reversed: '三心二意·坏消息·不成熟·浅尝辄止' },
  { label: '骑士', upright: '行动·追求·热忱·奔赴目标', reversed: '冲动·半途而废·鲁莽·方向不定' },
  { label: '皇后', upright: '滋养·成熟·直觉·包容与关怀', reversed: '情绪化·过度保护·依赖·忽视自身' },
  { label: '国王', upright: '掌控·权威·决断·成熟的担当', reversed: '专断·僵化·滥用权力·冷酷' },
];

// 把数字共性词 + 牌组特性词拼成该牌的牌义
const SUIT_FLAVOR: Record<Suit, { up: string; down: string }> = {
  权杖: { up: '激情·行动·创造力·事业开拓', down: '冲动·精力分散·急躁·方向不明' },
  圣杯: { up: '情感·关系·直觉·内心丰盈', down: '情绪泛滥·沉溺幻想·感情失衡' },
  宝剑: { up: '思考·沟通·真相·理性判断', down: '思虑过甚·言语伤害·焦虑·执念' },
  星币: { up: '物质·务实·积累·身体健康', down: '固执守旧·功利短视·精力不济·金钱焦虑' },
};

function buildMinor(seed: MinorSeed, label: string, up: string, down: string): TarotCardData {
  const flavor = SUIT_FLAVOR[seed.suit];
  return {
    id: `${seed.prefix}-${label}`,
    name: `${seed.suit}${label}`,
    arcana: 'minor',
    suit: seed.suit,
    element: seed.element,
    upright: `${up}（${flavor.up}）`,
    reversed: `${down}（${flavor.down}）`,
  };
}

const MINOR: TarotCardData[] = [];
for (const seed of SUITS) {
  for (const n of NUMERALS) MINOR.push(buildMinor(seed, n.label, n.upright, n.reversed));
  for (const c of COURTS) MINOR.push(buildMinor(seed, c.label, c.upright, c.reversed));
}

// ---------- 导出 ----------

export const TAROT_DECK: TarotCardData[] = [...MAJOR, ...MINOR];

export const DECK_SIZE = TAROT_DECK.length; // 78

export function findCard(id: string): TarotCardData | undefined {
  return TAROT_DECK.find((c) => c.id === id);
}
