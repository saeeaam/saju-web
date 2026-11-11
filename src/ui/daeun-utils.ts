import type { SajuChart } from '../core/index.ts'

export const YEAR_MS = 365.2425 * 86_400_000

/** 현재 나이(소수 년). 출생 이전이면 음수 */
export function ageAt(chart: SajuChart, now: Date): number {
  return (now.getTime() - chart.instantMs) / YEAR_MS
}

/** 현재 대운의 인덱스. 첫 대운 시작 전이면 -1 */
export function currentDaeunIndex(chart: SajuChart, now: Date): number {
  const age = ageAt(chart, now)
  let idx = -1
  chart.daeun.pillars.forEach((p, i) => {
    if (p.startAge <= age) idx = i
  })
  return idx
}
