/**
 * 사주 명식 계산 진입점. 입력과 옵션을 받아 4주와 파생값을 한 번에 돌려준다.
 * 모든 계산은 브라우저에서 수행하며 외부로 전송하지 않는다.
 */
import type { BirthInput } from '../types/input.ts'
import { DEFAULT_OPTIONS } from '../types/options.ts'
import type { SajuOptions } from '../types/options.ts'
import {
  elementDistribution,
  hiddenStemsOf,
  napeumOf,
  tenGodOfBranch,
  tenGodOfStem,
  twelveStage,
  voidBranches,
} from './analysis.ts'
import type { ElementDistribution, TenGod, TwelveStage } from './analysis.ts'
import { jieAround, lunarToSolar, termsOfYear } from './calendar.ts'
import { calculateDaeun } from './daeun.ts'
import type { DaeunResult } from './daeun.ts'
import type { Ganji } from './ganji.ts'
import type { YMD } from './jdn.ts'
import { calculatePillars, resolveBirthMoment } from './pillars.ts'

export type PillarKey = 'year' | 'month' | 'day' | 'hour'

export interface PillarDetail {
  key: PillarKey
  ganji: Ganji
  /** 천간의 십성. 일주는 null(일간 자신) */
  stemTenGod: TenGod | null
  /** 지지(정기 기준)의 십성 */
  branchTenGod: TenGod
  /** 지장간 [여기, 중기, 정기]와 각각의 십성 */
  hiddenStems: { stem: number; tenGod: TenGod }[]
  /** 일간 기준 12운성 */
  twelveStage: TwelveStage
  /** 60갑자 납음오행 이름 */
  napeum: string
  /** 일주 기준 공망에 해당하는 지지인가 */
  isVoid: boolean
}

export type WarningCode =
  | 'PRE_1908_LMT' // 1908년 이전 시각: 표준시 도입 전
  | 'NEAR_TERM_BOUNDARY' // 절입 시각 60분 이내
  | 'TERM_DAY_NO_TIME' // 시간을 몰라 절입 당일의 월주(·연주)가 불확실
  | 'ZI_HOUR_BOUNDARY' // 23:00~00:59: 일 경계 옵션에 따라 일주·시주가 달라짐
  | 'HISTORICAL_TIME_ADJUSTED' // 과거 표준시·서머타임 보정이 시각을 바꿈

export interface SajuChart {
  input: BirthInput
  options: SajuOptions
  /** 계산에 쓴 양력 날짜 (음력 입력이면 변환 결과) */
  solarDate: YMD
  /** 절대 시각(UTC ms) */
  instantMs: number
  /** 입력 시계 → 기둥 시계 사이의 총 보정(분) */
  correctionMinutes: number
  /** 연주 판정에 쓴 사주 연도 */
  sajuYear: number
  /** 일주를 정한 양력 날짜 (시각 보정·일 경계 옵션 적용 후) */
  dayDate: YMD
  pillars: PillarDetail[]
  dayMaster: number
  voidBranches: [number, number]
  elements: ElementDistribution
  daeun: DaeunResult
  warnings: WarningCode[]
}

export function calculateSaju(input: BirthInput, partial: Partial<SajuOptions> = {}): SajuChart {
  const options: SajuOptions = { ...DEFAULT_OPTIONS, ...partial }
  validate(input)
  if (options.solarTimeCorrection === 'longitude' && input.time) {
    // 경도 보정을 켰는데 출생지가 없으면 조용히 보정을 건너뛰지 않고 오류로 알린다
    if (!input.place) throw new RangeError('경도 보정을 쓰려면 출생지 경도가 필요합니다')
  }
  if (input.place && !(Number.isFinite(input.place.longitude) && Math.abs(input.place.longitude) <= 180)) {
    throw new RangeError(`출생지 경도가 올바르지 않습니다: ${input.place.longitude}`)
  }

  const solarDate: YMD =
    input.calendar === 'lunar'
      ? lunarToSolar({ year: input.year, month: input.month, day: input.day }, input.isLeapMonth ?? false)
      : { year: input.year, month: input.month, day: input.day }

  const moment = resolveBirthMoment({ date: solarDate, time: input.time, place: input.place, options })
  const hasTime = input.time !== null
  const p = calculatePillars(moment, hasTime, options)

  const dayStem = p.day.stem
  const voids = voidBranches(p.day.index)

  const entries: [PillarKey, Ganji][] = [
    ['year', p.year],
    ['month', p.month],
    ['day', p.day],
  ]
  if (p.hour) entries.push(['hour', p.hour])

  const pillars: PillarDetail[] = entries.map(([key, ganji]) => ({
    key,
    ganji,
    stemTenGod: key === 'day' ? null : tenGodOfStem(dayStem, ganji.stem),
    branchTenGod: tenGodOfBranch(dayStem, ganji.branch),
    hiddenStems: hiddenStemsOf(ganji.branch).map((stem) => ({ stem, tenGod: tenGodOfStem(dayStem, stem) })),
    twelveStage: twelveStage(dayStem, ganji.branch, options.earthStageRule),
    napeum: napeumOf(ganji.index).ko,
    isVoid: key !== 'day' && voids.includes(ganji.branch),
  }))

  const daeun = calculateDaeun({
    instantMs: moment.instantMs,
    monthGanjiIndex: p.month.index,
    yearStem: p.year.stem,
    gender: input.gender,
    ageFormat: options.daeunAgeFormat,
  })

  return {
    input,
    options,
    solarDate,
    instantMs: moment.instantMs,
    correctionMinutes: moment.correctionMinutes,
    sajuYear: p.sajuYear,
    dayDate: p.dayDate,
    pillars,
    dayMaster: dayStem,
    voidBranches: voids,
    elements: elementDistribution(entries.map(([, g]) => g)),
    daeun,
    warnings: collectWarnings(solarDate, moment.instantMs, moment.correctionMinutes, p.clockHour, hasTime, options),
  }
}

function validate(input: BirthInput): void {
  const { year, month, day, time } = input
  const maxYear = input.calendar === 'lunar' ? 2100 : 2300
  if (!Number.isInteger(year) || year < 1800 || year > maxYear) {
    throw new RangeError(`지원 연도 범위를 벗어났습니다: ${year} (1800~${maxYear})`)
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`월이 올바르지 않습니다: ${month}`)
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new RangeError(`일이 올바르지 않습니다: ${day}`)
  if (input.calendar === 'solar') {
    const d = new Date(Date.UTC(year, month - 1, day))
    if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      throw new RangeError(`존재하지 않는 양력 날짜입니다: ${year}-${month}-${day}`)
    }
  }
  if (time) {
    if (!Number.isInteger(time.hour) || time.hour < 0 || time.hour > 23) throw new RangeError(`시가 올바르지 않습니다: ${time.hour}`)
    if (!Number.isInteger(time.minute) || time.minute < 0 || time.minute > 59) throw new RangeError(`분이 올바르지 않습니다: ${time.minute}`)
  }
}

function collectWarnings(
  date: YMD,
  instantMs: number,
  correctionMinutes: number,
  clockHour: number | null,
  hasTime: boolean,
  options: SajuOptions,
): WarningCode[] {
  const out: WarningCode[] = []
  if (date.year < 1908 || (date.year === 1908 && date.month < 4)) out.push('PRE_1908_LMT')

  const nearest = jieAround(new Date(instantMs).getUTCFullYear()).reduce((a, b) =>
    Math.abs(b.ms - instantMs) < Math.abs(a.ms - instantMs) ? b : a,
  )
  if (hasTime && Math.abs(nearest.ms - instantMs) <= 60 * 60_000) out.push('NEAR_TERM_BOUNDARY')

  if (!hasTime) {
    const dayStart = Date.UTC(date.year, date.month - 1, date.day) - 9 * 3600_000
    const hit = termsOfYear(date.year).some((t) => t.index % 2 === 0 && t.ms >= dayStart && t.ms < dayStart + 86_400_000)
    if (hit) out.push('TERM_DAY_NO_TIME')
  }
  if (clockHour !== null && (clockHour >= 23 || clockHour === 0)) out.push('ZI_HOUR_BOUNDARY')
  if (options.historicalTimeCorrection && hasTime && correctionMinutes !== 0 && options.solarTimeCorrection === 'none') {
    out.push('HISTORICAL_TIME_ADJUSTED')
  }
  return out
}

export { seunPillar, wolunPillars } from './luck.ts'
export type { WolunEntry } from './luck.ts'
export { ganjiHanja, ganjiName } from './ganji.ts'
export type { Ganji } from './ganji.ts'
