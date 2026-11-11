/** lunar-javascript(교차 검증 전용 devDependency)의 최소 타입 선언. 테스트에서 쓰는 API만 정의한다 */
declare module 'lunar-javascript' {
  export interface EightChar {
    getSect(): number
    setSect(sect: number): void
    getYear(): string
    getMonth(): string
    getDay(): string
    getTime(): string
    getYearHideGan(): string[]
    getMonthHideGan(): string[]
    getDayHideGan(): string[]
    getTimeHideGan(): string[]
    getYearDiShi(): string
    getMonthDiShi(): string
    getDayDiShi(): string
    getTimeDiShi(): string
    getDayNaYin(): string
    getYearShiShenGan(): string
    getMonthShiShenGan(): string
    getDayShiShenGan(): string
    getTimeShiShenGan(): string
    getYearShiShenZhi(): string[]
    getMonthShiShenZhi(): string[]
    getDayShiShenZhi(): string[]
    getTimeShiShenZhi(): string[]
  }

  export interface Lunar {
    getEightChar(): EightChar
    getYear(): number
    /** 윤달이면 음수 */
    getMonth(): number
    getDay(): number
  }

  export interface SolarInstance {
    getLunar(): Lunar
  }

  export const Solar: {
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): SolarInstance
  }
}
