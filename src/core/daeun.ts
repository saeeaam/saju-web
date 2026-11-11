/**
 * 대운(大運). 규칙: docs/261110_사주 명식 산출 규칙.md 7절
 * - 양남음녀 순행, 음남양녀 역행 (연간의 음양 기준)
 * - 시작 나이: 출생~다음(순행)/이전(역행) 절입까지 3일 = 1년, 1일 = 4개월
 */
import { STEMS } from '../data/index.ts'
import type { Gender } from '../types/input.ts'
import type { DaeunAgeFormat } from '../types/options.ts'
import { jieAround } from './calendar.ts'
import { ganjiFromIndex, mod } from './ganji.ts'
import type { Ganji } from './ganji.ts'

const MIN = 60_000
const DAY_MIN = 1440

export interface DaeunStart {
  years: number
  months: number
  days: number
  /** 표기용 나이. precise: 년 + 월/12, integer: 일수/3 반올림(최소 1) */
  age: number
}

export interface DaeunPillar {
  /** 이 대운이 시작하는 나이 (startAge + 10 × n) */
  startAge: number
  ganji: Ganji
}

export interface DaeunResult {
  forward: boolean
  /** 기준이 된 절의 절대 시각(ms) */
  baseTermMs: number
  start: DaeunStart
  pillars: DaeunPillar[]
}

/** 순행 여부. 양남·음녀 순행 */
export function isForward(yearStem: number, gender: Gender): boolean {
  const yang = STEMS[yearStem].yinYang === 'yang'
  return gender === 'male' ? yang : !yang
}

export function daeunStartFromMinutes(totalMinutes: number, format: DaeunAgeFormat): DaeunStart {
  let years = Math.floor(totalMinutes / (3 * DAY_MIN))
  const rest = totalMinutes - years * 3 * DAY_MIN
  // 1일(1440분) = 4개월 → 360분 = 1개월, 1개월 = 30일 → 12분 = 1일
  let months = Math.floor(rest / 360)
  // 남은 일수는 가장 가까운 정수로 반올림하고, 30일이 되면 월로 올린다
  let days = Math.round((rest - months * 360) / 12)
  if (days >= 30) {
    days -= 30
    months += 1
  }
  if (months >= 12) {
    months -= 12
    years += 1
  }
  const age =
    format === 'precise'
      ? years + months / 12
      : Math.max(1, Math.round(totalMinutes / DAY_MIN / 3))
  return { years, months, days, age }
}

export interface DaeunParams {
  instantMs: number
  monthGanjiIndex: number
  yearStem: number
  gender: Gender
  ageFormat: DaeunAgeFormat
  /** 만들 대운 개수 (기본 10) */
  count?: number
}

export function calculateDaeun(p: DaeunParams): DaeunResult {
  const forward = isForward(p.yearStem, p.gender)
  const year = new Date(p.instantMs).getUTCFullYear()
  const jie = jieAround(year)

  let base: number
  if (forward) {
    base = jie.find((t) => t.ms > p.instantMs)!.ms
  } else {
    base = [...jie].reverse().find((t) => t.ms <= p.instantMs)!.ms
  }
  const minutes = Math.abs(base - p.instantMs) / MIN
  const start = daeunStartFromMinutes(minutes, p.ageFormat)

  const count = p.count ?? 10
  const step = forward ? 1 : -1
  const pillars: DaeunPillar[] = []
  for (let n = 0; n < count; n++) {
    pillars.push({
      startAge: start.age + 10 * n,
      ganji: ganjiFromIndex(mod(p.monthGanjiIndex + step * (n + 1), 60)),
    })
  }
  return { forward, baseTermMs: base, start, pillars }
}
