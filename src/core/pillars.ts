/**
 * 연·월·일·시주 계산. 규칙: docs/261110_사주 명식 산출 규칙.md
 * - 연·월주: 절기의 절대 시각(UTC)으로 판정 (경도 보정과 무관)
 * - 일·시주: "기둥 시계"(표준시 → 선택적 경도/균시차 보정)로 판정
 */
import type { BirthPlace } from '../types/input.ts'
import type { SajuOptions } from '../types/options.ts'
import { equationOfTime, jieAround, lichunMs, solarToLunar } from './calendar.ts'
import type { TermInstant } from './calendar.ts'
import { ganjiFromParts, mod } from './ganji.ts'
import type { Ganji } from './ganji.ts'
import { addDays, dayPillarIndex } from './jdn.ts'
import type { YMD } from './jdn.ts'
import { DEFAULT_TIME_ZONE, KST_OFFSET_MS, utcFields, wallClockToUtcMs } from './time.ts'

/** 동경 135° (한국 표준시 자오선) */
export const STANDARD_MERIDIAN = 135

/** 한국 표준시 도입일 (1908-04-01). 이전 날짜는 입력을 KST로 간주 */
const STANDARD_TIME_START_MS = Date.UTC(1908, 3, 1)

export interface BirthMoment {
  /** 절대 시각(UTC ms). 연·월주·대운 판정용 */
  instantMs: number
  /** 일·시주 판정용 "기둥 시계"를 UTC 필드로 표현한 ms */
  clockMs: number
  /** 입력 시계 시각 → 기둥 시계 사이의 총 보정(분) */
  correctionMinutes: number
}

export interface ResolveMomentParams {
  date: YMD
  /** null이면 시간 모름 → 낮 12시로 두고 보정하지 않는다 */
  time: { hour: number; minute: number } | null
  place?: BirthPlace
  options: SajuOptions
}

/** 시계 시각을 절대 시각과 기둥 시계로 환산 */
export function resolveBirthMoment({ date, time, place, options }: ResolveMomentParams): BirthMoment {
  const hour = time?.hour ?? 12
  const minute = time?.minute ?? 0
  const timeZone = place?.timeZone ?? DEFAULT_TIME_ZONE

  // 표준시 도입(1908-04-01) 이전은 지방시가 제각각이라 IANA의 서울 LMT를 쓰지 않고
  // 입력 시각을 KST(UTC+9)로 간주한다. 지방시를 반영하려면 경도 보정 옵션을 쓴다.
  const beforeStandardTime = Date.UTC(date.year, date.month - 1, date.day) < STANDARD_TIME_START_MS
  const instantMs =
    options.historicalTimeCorrection && !beforeStandardTime
      ? wallClockToUtcMs(date.year, date.month, date.day, hour, minute, timeZone)
      : Date.UTC(date.year, date.month - 1, date.day, hour, minute) - KST_OFFSET_MS

  // 기둥 시계는 동경 135° 표준시(UTC+9)에서 출발한다
  let clockMs = instantMs + KST_OFFSET_MS
  if (time) {
    if (options.solarTimeCorrection === 'longitude' && place) {
      clockMs += (place.longitude - STANDARD_MERIDIAN) * 4 * 60_000
    } else if (options.solarTimeCorrection === 'fixed-30') {
      clockMs -= 30 * 60_000
    }
    if (options.applyEquationOfTime && options.solarTimeCorrection !== 'none') {
      clockMs += equationOfTime(instantMs) * 60_000
    }
  } else {
    // 시간을 모르면 날짜만 쓴다 (입력 날짜 그대로)
    clockMs = Date.UTC(date.year, date.month - 1, date.day, 12, 0)
  }
  const wallAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, minute)
  return { instantMs, clockMs, correctionMinutes: Math.round((clockMs - wallAsUtc) / 60_000) }
}

/** 절대 시각 직전(포함)의 절(節) */
export function currentJie(instantMs: number): TermInstant {
  const year = new Date(instantMs).getUTCFullYear()
  const list = jieAround(year)
  let found = list[0]
  for (const t of list) {
    if (t.ms <= instantMs) found = t
    else break
  }
  return found
}

/** 입춘 기준 사주 연도 */
export function ipchunYear(instantMs: number): number {
  const y = new Date(instantMs).getUTCFullYear()
  for (const cand of [y + 1, y, y - 1]) {
    if (lichunMs(cand) <= instantMs) return cand
  }
  return y - 2
}

export function yearPillarFromYear(sajuYear: number): Ganji {
  const index = mod(sajuYear - 4, 60)
  return { stem: index % 10, branch: index % 12, index }
}

/** 월주. 월건(月建)의 천간은 항상 입춘 기준 연간으로 정한다(오호둔) */
export function monthPillar(jie: TermInstant, ipchunYearStem: number): Ganji {
  const branch = mod(jie.index / 2 + 1, 12)
  const firstStem = mod((ipchunYearStem % 5) * 2 + 2, 10) // 인월의 천간
  const stem = mod(firstStem + mod(branch - 2, 12), 10)
  return ganjiFromParts(stem, branch)
}

export function dayPillarOf(date: YMD): Ganji {
  const index = dayPillarIndex(date.year, date.month, date.day)
  return { stem: index % 10, branch: index % 12, index }
}

/** 시지: 23~00시 자, 01~02시 축 … */
export function hourBranch(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12
}

/** 시주. 시간 천간은 일간으로 정한다(오서둔) */
export function hourPillar(dayStem: number, branch: number): Ganji {
  const stem = mod((dayStem % 5) * 2 + branch, 10)
  return ganjiFromParts(stem, branch)
}

export interface PillarsResult {
  year: Ganji
  month: Ganji
  day: Ganji
  /** 시간을 모르면 null */
  hour: Ganji | null
  /** 연주 판정에 쓴 연도 */
  sajuYear: number
  /** 월주를 정한 절 */
  monthJie: TermInstant
  /** 일·시주 판정에 쓴 기둥 시계의 날짜 (일 경계 옵션 적용 전) */
  clockDate: YMD
  /** 일주를 정한 날짜 (일 경계 옵션 적용 후). 자미두수의 음력 생일에 쓴다 */
  dayDate: YMD
  clockHour: number | null
}

export function calculatePillars(
  moment: BirthMoment,
  hasTime: boolean,
  options: SajuOptions,
): PillarsResult {
  const clock = utcFields(moment.clockMs)
  const clockDate: YMD = { year: clock.year, month: clock.month, day: clock.day }

  const ipchunY = ipchunYear(moment.instantMs)
  const ipchunYearPillar = yearPillarFromYear(ipchunY)

  let sajuYear = ipchunY
  if (options.yearBoundary === 'lunar-new-year') {
    sajuYear = solarToLunar(clockDate).year
  }
  const year = yearPillarFromYear(sajuYear)

  const monthJie = currentJie(moment.instantMs)
  const month = monthPillar(monthJie, ipchunYearPillar.stem)

  const isZiLate = hasTime && clock.hour >= 23
  const nextDate = addDays(clockDate, 1)
  const dayDate = isZiLate && options.dayBoundary === 'zi-hour-start' ? nextDate : clockDate
  const day = dayPillarOf(dayDate)

  let hour: Ganji | null = null
  if (hasTime) {
    const refDate = isZiLate && options.dayBoundary !== 'midnight' ? nextDate : clockDate
    hour = hourPillar(dayPillarOf(refDate).stem, hourBranch(clock.hour))
  }

  return { year, month, day, hour, sajuYear, monthJie, clockDate, dayDate, clockHour: hasTime ? clock.hour : null }
}
