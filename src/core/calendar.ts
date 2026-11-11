/**
 * 음양력 변환·절기 어댑터. 외부 라이브러리(manseryeok, KASI 데이터 기반)를 이 파일 뒤에 숨겨
 * 교체·교차 검증이 쉽게 한다. 다른 모듈은 manseryeok를 직접 import하지 않는다.
 */
import {
  equationOfTimeMinutes,
  getSolarTermsOfYear,
  lunarToSolar as libLunarToSolar,
  solarToLunar as libSolarToLunar,
} from 'manseryeok'
import type { YMD } from './jdn.ts'

export interface LunarDate extends YMD {
  isLeapMonth: boolean
}

/** 절기 한 건. index: 0=소한, 2=입춘 … 23=동지. 짝수 index가 절(節, 월의 시작) */
export interface TermInstant {
  index: number
  name: string
  ms: number
}

export function lunarToSolar(date: YMD, isLeapMonth: boolean): YMD {
  const r = libLunarToSolar(date.year, date.month, date.day, isLeapMonth)
  return { year: r.year, month: r.month, day: r.day }
}

export function solarToLunar(date: YMD): LunarDate {
  const r = libSolarToLunar(date.year, date.month, date.day)
  return { year: r.year, month: r.month, day: r.day, isLeapMonth: r.isLeapMonth }
}

const termCache = new Map<number, TermInstant[]>()

/** 한 해의 24절기 (시간순) */
export function termsOfYear(year: number): TermInstant[] {
  let cached = termCache.get(year)
  if (!cached) {
    cached = getSolarTermsOfYear(year).map((t) => ({ index: t.index, name: t.name, ms: t.date.getTime() }))
    termCache.set(year, cached)
  }
  return cached
}

/** 절(節)만 모은 목록. 기준 연도의 전년~다음해를 포함해 시간순으로 반환 */
export function jieAround(year: number): TermInstant[] {
  return [year - 1, year, year + 1]
    .flatMap((y) => termsOfYear(y))
    .filter((t) => t.index % 2 === 0)
    .sort((a, b) => a.ms - b.ms)
}

/** 입춘(index 2)의 절대 시각 */
export function lichunMs(year: number): number {
  return termsOfYear(year)[2].ms
}

/** 균시차(분). 양수면 진태양시가 평균태양시보다 빠르다 */
export function equationOfTime(utcMs: number): number {
  return equationOfTimeMinutes(utcMs)
}
