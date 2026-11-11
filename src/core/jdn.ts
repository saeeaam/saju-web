import { mod } from './ganji.ts'

/** 그레고리력 날짜 → 율리우스 적일(JDN, 정오 기준 정수). 2000-01-01 = 2451545 */
export function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

/** 일주의 60갑자 순번. (JDN + 49) mod 60. 2000-01-01 → 54(무오) */
export function dayPillarIndex(year: number, month: number, day: number): number {
  return mod(gregorianToJdn(year, month, day) + 49, 60)
}

export interface YMD {
  year: number
  month: number
  day: number
}

/** 달력 날짜에 일수를 더한다 (월말·윤년 처리) */
export function addDays(date: YMD, days: number): YMD {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}
