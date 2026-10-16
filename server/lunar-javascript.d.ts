// lunar-javascript 的最小类型声明（该库未自带 .d.ts）
// 只声明本项目用到的部分，避免 any 扩散。
declare module 'lunar-javascript' {
  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    // —— 八字扩展（十神 / 藏干 / 纳音 / 十二长生 / 旬空 / 大运）——
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearHideGan(): string[];
    getMonthHideGan(): string[];
    getDayHideGan(): string[];
    getTimeHideGan(): string[];
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    getYearXunKong(): string;
    getMonthXunKong(): string;
    getDayXunKong(): string;
    getTimeXunKong(): string;
    getTaiYuan(): string;
    getMingGong(): string;
    getShenGong(): string;
    getYun(gender: number, sect?: number): Yun;
  }

  export interface LiuNian {
    getYear(): number;
    getAge(): number;
    getGanZhi(): string;
  }

  export interface DaYun {
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getGanZhi(): string;
    getLiuNian(): LiuNian[];
  }

  export interface Yun {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getDaYun(): DaYun[];
  }

  export interface Lunar {
    getEightChar(): EightChar;
    getJieQi(): string;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
  }

  export interface Solar {
    getLunar(): Lunar;
  }

  export const Solar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Solar;
    fromDate(date: Date): Solar;
  };

  export const Lunar: {
    fromDate(date: Date): Lunar;
  };
}
