/**
 * 사주 명식(SajuChart) → 자미두수 명반 입력.
 * - 날짜: 일주를 정한 날짜(시각 보정·일 경계 옵션 반영)를 한국 음력으로 바꾼다.
 * - 시: 시주의 지지. 시간을 모르면 명반을 만들 수 없다(null).
 */
import { solarToLunar } from './calendar.ts'
import type { SajuChart } from './index.ts'
import { calculateZiwei } from './ziwei.ts'
import type { ZiweiChart } from './ziwei.ts'

export interface ZiweiResult {
  chart: ZiweiChart
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean }
  hourBranch: number
}

export function ziweiFromChart(saju: SajuChart): ZiweiResult | null {
  const hour = saju.pillars.find((p) => p.key === 'hour')
  if (!hour) return null
  const lunar = solarToLunar(saju.dayDate)
  const hourBranch = hour.ganji.branch
  return {
    chart: calculateZiwei({ lunar, hourBranch, gender: saju.input.gender, leapMonthRule: saju.options.leapMonthRule }),
    lunar,
    hourBranch,
  }
}

/** 세는 나이(자미두수 대한은 세는 나이 기준). 음력 생년과 올해 연도로 근사한다 */
export function nominalAge(lunarBirthYear: number, now: Date): number {
  const thisYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear()
  return thisYear - lunarBirthYear + 1
}
