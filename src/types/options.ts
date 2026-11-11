/**
 * 계산 옵션 스키마. 학파·만세력마다 달라지는 부분을 모두 옵션으로 노출한다.
 * 기본값 근거: docs/261110_사주 웹페이지 작업 계획.md 1절.
 */

/**
 * 일(日) 경계 (23:00~23:59 출생의 일주·시간 처리).
 * - midnight: 00:00에 일 변경. 일주·시주 천간 모두 당일 일간 기준 (야자시/조자시 구분)
 * - zi-hour-start: 23:00부터 다음날. 일주·시주 천간 모두 다음날 일간 기준
 * - split-zi: 일주는 당일 유지, 시주 천간만 다음날 일간 기준
 */
export type DayBoundary = 'midnight' | 'zi-hour-start' | 'split-zi'

/** 연주 경계. ipchun: 입춘 시각, lunar-new-year: 음력 1월 1일 */
export type YearBoundary = 'ipchun' | 'lunar-new-year'

/** 출생 시각 경도 보정. none: 없음, longitude: 출생지 경도, fixed-30: 일률 -30분 */
export type SolarTimeCorrection = 'none' | 'longitude' | 'fixed-30'

/** 음력 윤달의 월 처리. as-is: 윤달 그대로 본월, split-15: 15일 이전 전월/이후 익월 (자미두수 명궁 계산용) */
export type LeapMonthRule = 'as-is' | 'split-15'

/** 12운성의 토(土) 처리. fire-earth: 화토동궁(무·기가 병·정과 같음), water-earth: 수토동궁 */
export type EarthStageRule = 'fire-earth' | 'water-earth'

/** 대운 시작 나이 표기. 만 나이(소수 개월) 또는 정수 나이 */
export type DaeunAgeFormat = 'precise' | 'integer'

export interface SajuOptions {
  /**
   * 과거 표준시·서머타임 보정. true면 입력한 시계 시각을 IANA(Asia/Seoul) 규칙으로
   * 절대 시각으로 환산한 뒤 동경 135°(UTC+9) 표준시 기준으로 맞춘다.
   * false면 입력 시각을 그대로 KST(UTC+9)로 간주한다.
   */
  historicalTimeCorrection: boolean
  dayBoundary: DayBoundary
  yearBoundary: YearBoundary
  solarTimeCorrection: SolarTimeCorrection
  /** 균시차까지 적용할지. 기본 false */
  applyEquationOfTime: boolean
  leapMonthRule: LeapMonthRule
  earthStageRule: EarthStageRule
  daeunAgeFormat: DaeunAgeFormat
}

export const DEFAULT_OPTIONS: SajuOptions = {
  historicalTimeCorrection: true,
  dayBoundary: 'midnight',
  yearBoundary: 'ipchun',
  solarTimeCorrection: 'none',
  applyEquationOfTime: false,
  leapMonthRule: 'split-15',
  earthStageRule: 'fire-earth',
  daeunAgeFormat: 'precise',
}
