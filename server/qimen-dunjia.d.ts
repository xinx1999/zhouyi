// qimen-dunjia 的最小类型声明（该包未提供 .d.ts）
// 只声明本项目用到的部分，其余按 any 处理。
declare module 'qimen-dunjia' {
  export const JIEQI_JUSHU: any;
  export const YUAN_NAMES: any;

  export function calculateJuByChaiBu(
    solar: any,
    jieQiJuShu: any,
    yuanNames: any
  ): {
    jieQiName: string;
    yuan: number;
    yuanName: string;
    isYang: boolean;
    yinYang: '陽' | '陰';
    gameNumber: number;
    daysSinceJieQi: number;
  };

  export function generateQimenChart(pillars: {
    年柱: string;
    月柱: string;
    日柱: string;
    時柱: string;
    局數: number;
    陰陽: '陽' | '陰';
  }): any;

  export function chartToObject(chart: any): any;
}
