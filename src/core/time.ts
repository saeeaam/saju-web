/**
 * 시계 시각 ↔ 절대 시각(UTC) 환산. 과거 표준시·서머타임은 IANA 시간대 DB(Intl)에 맡긴다.
 * 직접 표를 만들지 않는다. docs: 261110_사주 명식 산출 규칙.md 6절.
 */

export const KST_OFFSET_MS = 9 * 3600_000
export const DEFAULT_TIME_ZONE = 'Asia/Seoul'

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatterCache.set(timeZone, f)
  }
  return f
}

/** 절대 시각(UTC ms)에서 해당 시간대의 UTC 오프셋(ms, 서머타임 포함)을 구한다 */
export function tzOffsetMs(utcMs: number, timeZone: string = DEFAULT_TIME_ZONE): number {
  // 초 미만은 버린다 (LMT +8:27:52 같은 초 단위 오프셋 때문)
  const flooredMs = Math.floor(utcMs / 1000) * 1000
  const parts = getFormatter(timeZone).formatToParts(new Date(flooredMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - flooredMs
}

/** 해당 시간대의 시계 시각(연월일시분) → 절대 시각(UTC ms). 서머타임 경계의 모호한 시각은 첫 번째 해석을 쓴다 */
export function wallClockToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute)
  // 1차 추정 → 추정한 시각의 오프셋으로 재계산 (오프셋이 바뀌는 경계에서도 수렴)
  const guess = asUtc - tzOffsetMs(asUtc, timeZone)
  return asUtc - tzOffsetMs(guess, timeZone)
}

/** 밀리초 시각을 UTC 필드로 분해 (일주·시주 판정용 "기둥 시계"를 읽을 때 사용) */
export function utcFields(ms: number) {
  const d = new Date(ms)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}
