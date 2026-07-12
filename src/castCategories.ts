// 起卦三大法类：梅花易数 / 铜钱法 / 揲蓍法
// 供「起卦」标签页与起卦弹窗共用，避免重复维护标题 / 说明。
//
// 设计说明：方法元数据（METHOD_META）与「分类分组」（CAST_CATEGORIES）解耦。
// 这样即使某个方法不挂在任何分类卡片下（例如「姓名生辰」只走「常用起卦」与
// 「自定义起卦」入口），CAST_META 仍能解析到它，弹窗标题 / 说明与自定义起卦
// 网格不会因缺失而崩溃。

export type CastCategoryId = 'meihua' | 'coin' | 'yarrow';

export type CastMethodKey =
  | 'coin'
  | 'number'
  | 'time'
  | 'char'
  | 'direction'
  | 'sound'
  | 'report'
  | 'yarrow'
  | 'najia'
  | 'person';

export interface CastMethodMeta {
  method: CastMethodKey;
  title: string; // 弹窗标题 / 卡片名
  short: string; // 卡片副标题
  icon: string; // 卡片上的古字印章
  hint: string; // 起卦弹窗内的方法说明
  when: string; // 卡片上的「何时用」白话提示
}

// 方法元数据的唯一来源：与分类分组解耦。
export const METHOD_META: Record<CastMethodKey, CastMethodMeta> = {
  coin: {
    method: 'coin',
    title: '三枚铜钱',
    short: '三钱掷六次',
    icon: '錢',
    when: '想随手掷钱、最省心时',
    hint:
      '三枚铜钱法（金钱卦）：抛掷六次，以字背定阴阳——两背一字为阳爻，两字一背为阴爻，自下而上排成六爻。最宜随手起占，心念所问、钱落即卦。',
  },
  number: {
    method: 'number',
    title: '数字起卦',
    short: '两数定上下卦',
    icon: '數',
    when: '随手有个数字时最方便',
    hint:
      '填写两个正整数（任意正整数皆可，不必限于 1–8）：第一个数定上卦、第二个定下卦，均除以 8 取余数对应先天八卦（余1乾、2兑、3离、4震、5巽、6坎、7艮、8坤）；两数之和除以 6 取余定动爻。例如填 8 与 3 → 上兑下离、动爻第五。心中所念、眼前所见之数，皆可入卦。',
  },
  person: {
    method: 'person',
    title: '姓名生辰起卦',
    short: '姓名·生日·性别',
    icon: '名',
    when: '想为本人的生命信息起一卦时',
    hint:
      '输入姓名、公历生日与性别：姓名所禀之数定上卦，生辰年月日之和定下卦，姓名与生辰之和再合以性别（男 1 女 2）取余定动爻。一人一卦，最宜问终身、姻缘、前程等切身之事。',
  },
  time: {
    method: 'time',
    title: '时间起卦',
    short: '取年月日时',
    icon: '時',
    when: '记得某一具体时刻时',
    hint:
      '以你选择的公历时刻起卦：上卦取「年月日之和 ÷ 8 余」，下卦取「年月日时之和 ÷ 8 余」，动爻取「年月日时之和 ÷ 6 余」。无需自己计算，选好时间即可。',
  },
  char: {
    method: 'char',
    title: '汉字起卦',
    short: '按字占取数',
    icon: '字',
    when: '脑中浮起一个词或一句心语',
    hint:
      '输入 1 个或几个汉字（如一个词、一句心语皆可）。取每个字所禀之数，前半字定上卦、后半字定下卦、全字之和定动爻。字数不拘，随心所起。',
  },
  direction: {
    method: 'direction',
    title: '方位起卦',
    short: '面朝何方',
    icon: '方',
    when: '心有所向、身面某方时',
    hint:
      '选你所面向的方位：上卦取该方位的先天数（西北乾1、西兑2、南离3、东震4、东南巽5、北坎6、东北艮7、西南坤8），下卦取此刻时辰之数，二者之和定动爻。所谓「不动不占」——心有所向、身有所面，方成一卦。',
  },
  sound: {
    method: 'sound',
    title: '声音起卦',
    short: '听声计数',
    icon: '聲',
    when: '耳闻声响、口出言句时',
    hint:
      '听声起卦：填你方才所闻之声数与所言之句数。声数定上卦、句数定下卦，二者之和定动爻。耳中所接，皆可成卦。',
  },
  report: {
    method: 'report',
    title: '报数起卦',
    short: '随口报数',
    icon: '報',
    when: '对方便利随口报数时',
    hint:
      '报数起卦：对方随口所报之数。填 1 个数（上下卦相承推演）或 2 个数（上卦、下卦各一），动爻由数之和而定。',
  },
  najia: {
    method: 'najia',
    title: '纳甲六爻',
    short: '配干支世应',
    icon: '甲',
    when: '想配干支世应做精细占断',
    hint:
      '纳甲六爻（京房纳甲）：先选一种基础起卦法得出本卦，再依京房之法配入干支、六亲、世应、六神，做更精细的占断。',
  },
  yarrow: {
    method: 'yarrow',
    title: '揲蓍起卦',
    short: '五十策十八变',
    icon: '蓍',
    when: '想行古法、庄重起卦时',
    hint:
      '揲蓍法（大衍筮法）：以五十策、分二挂一、揲四归奇，三变成一爻、十八变成一卦。此乃《周易》最古之筮法，无需填数，点「起卦」即由系统依古法演算。',
  },
};

export interface CastCategory {
  id: CastCategoryId;
  title: string; // 梅花易数
  origin: string; // 邵雍 · 取数成卦
  desc: string;
  methods: CastMethodKey[]; // 仅分组用：哪些方法挂在此分类卡片下
}

export const CAST_CATEGORIES: CastCategory[] = [
  {
    id: 'meihua',
    title: '梅花易数',
    origin: '邵雍 · 取数成卦',
    desc: '以所见所闻之数起卦：一声一物、一字一时，皆可入卦。灵活自然，最宜随机起占。',
    // 取数成卦诸法；「姓名生辰」不在此列（另走常用起卦 / 自定义起卦入口）
    methods: ['number', 'time', 'char', 'direction', 'sound', 'report'],
  },
  {
    id: 'coin',
    title: '铜钱法',
    origin: '三钱 · 金钱卦',
    desc: '三枚铜钱抛掷六次，以字背定阴阳，民间最普及。纳甲六爻更在其上配入干支世应，做精细占断。',
    methods: ['coin', 'najia'],
  },
  {
    id: 'yarrow',
    title: '揲蓍法',
    origin: '大衍筮法',
    desc: '五十策、分二挂一、揲四归奇，三变成一爻、十八变成一卦。《周易》最古之筮法，庄重而精微。',
    methods: ['yarrow'],
  },
];

// 方法 → 元数据 速查表（弹窗标题 / 说明 / 自定义起卦网格使用）。
// 直接指向 METHOD_META，故不依赖方法是否挂在某个分类下。
export const CAST_META: Record<CastMethodKey, CastMethodMeta> = METHOD_META;
