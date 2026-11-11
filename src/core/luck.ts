/**
 * 세운(歲運)·월운(月運). 해당 연도의 연주와 12개월의 월주를 나열한다.
 * 연주는 입춘, 월주는 절(節)이 기준이며 월건의 천간은 입춘 기준 연간으로 정한다(오호둔).
 */
import { jieAround, termsOfYear } from './calendar.ts'
import type { TermInstant } from './calendar.ts'
import { ganjiFromParts, mod } from './ganji.ts'
import type { Ganji } from './ganji.ts'
import { yearPillarFromYear } from './pillars.ts'

/** 세운: 사주 연도(입춘 기준)의 연주 */
export function seunPillar(sajuYear: number): Ganji {
  return yearPillarFromYear(sajuYear)
}

export interface WolunEntry {
  ganji: Ganji
  /** 이 달을 시작하는 절 */
  jie: TermInstant
}

/** 월운: 사주 연도의 인월(입춘)~축월(소한) 12개월 */
export function wolunPillars(sajuYear: number): WolunEntry[] {
  const yearStem = seunPillar(sajuYear).stem
  const firstStem = mod((yearStem % 5) * 2 + 2, 10) // 인월의 천간
  // 입춘부터 다음 해 소한까지 절 12개
  const jie = jieAround(sajuYear).filter(
    (t) => t.ms >= termsOfYear(sajuYear)[2].ms && t.ms < termsOfYear(sajuYear + 1)[2].ms,
  )
  return jie.map((t, i) => {
    const branch = mod(2 + i, 12)
    return { ganji: ganjiFromParts(mod(firstStem + i, 10), branch), jie: t }
  })
}
