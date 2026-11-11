import type { SajuChart } from '../core/index.ts'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 입력 시계 시각과 계산에 쓴 기둥 시계 시각을 문장으로 */
export function describeClock(chart: SajuChart): string {
  const { solarDate: d, input, correctionMinutes } = chart
  if (!input.time) return `${d.year}-${pad(d.month)}-${pad(d.day)} (시간 모름)`
  const wall = Date.UTC(d.year, d.month - 1, d.day, input.time.hour, input.time.minute)
  const wallText = `${d.year}-${pad(d.month)}-${pad(d.day)} ${pad(input.time.hour)}:${pad(input.time.minute)}`
  if (correctionMinutes === 0) return `입력 시각 ${wallText} (보정 없음)`
  const c = new Date(wall + correctionMinutes * 60_000)
  const clockText = `${c.getUTCFullYear()}-${pad(c.getUTCMonth() + 1)}-${pad(c.getUTCDate())} ${pad(c.getUTCHours())}:${pad(c.getUTCMinutes())}`
  const sign = correctionMinutes > 0 ? '+' : '−'
  return `입력 시각 ${wallText} → 날·시 글자 계산 시각 ${clockText} (보정 ${sign}${Math.abs(correctionMinutes)}분)`
}
