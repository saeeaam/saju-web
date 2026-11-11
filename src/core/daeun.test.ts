import { describe, expect, it } from 'vitest'
import { daeunStartFromMinutes, isForward } from './daeun.ts'

describe('대운 시작 나이 환산 (3일=1년, 1일=4개월, 1개월=30일)', () => {
  it('3일 = 1년', () => {
    expect(daeunStartFromMinutes(3 * 1440, 'precise')).toMatchObject({ years: 1, months: 0, days: 0, age: 1 })
  })

  it('1일 = 4개월, 2시간(1시진) = 10일', () => {
    expect(daeunStartFromMinutes(1440, 'precise')).toMatchObject({ years: 0, months: 4, days: 0 })
    expect(daeunStartFromMinutes(120, 'precise')).toMatchObject({ years: 0, months: 0, days: 10 })
  })

  it('9일 6시간 = 3년 1개월(6시간 = 1.5×... 30일 → 1개월)', () => {
    // 9일 = 3년, 6시간 = 360분 = 1개월
    expect(daeunStartFromMinutes(9 * 1440 + 360, 'precise')).toMatchObject({ years: 3, months: 1, days: 0 })
  })

  it('반일 동점(6분 = 0.5일)은 올림한다', () => {
    expect(daeunStartFromMinutes(6, 'precise').days).toBe(1)
    expect(daeunStartFromMinutes(18, 'precise').days).toBe(2) // 1.5 → 2
  })

  it('일이 30이 되면 월로, 월이 12가 되면 년으로 올린다', () => {
    // 359분 = 29.92일 → 30일 → 1개월
    expect(daeunStartFromMinutes(359, 'precise')).toMatchObject({ years: 0, months: 1, days: 0 })
    // 3일 - 1분 = 11개월 29.92일 → 12개월 → 1년
    expect(daeunStartFromMinutes(3 * 1440 - 1, 'precise')).toMatchObject({ years: 1, months: 0, days: 0 })
  })

  it('정수 나이 표기는 일수/3 반올림, 최소 1', () => {
    expect(daeunStartFromMinutes(60, 'integer').age).toBe(1)
    expect(daeunStartFromMinutes(4 * 1440, 'integer').age).toBe(1) // 1.33 → 1
    expect(daeunStartFromMinutes(5 * 1440, 'integer').age).toBe(2) // 1.67 → 2
  })
})

describe('순행/역행 (양남음녀 순행)', () => {
  it('갑(양)년 남자는 순행, 여자는 역행', () => {
    expect(isForward(0, 'male')).toBe(true)
    expect(isForward(0, 'female')).toBe(false)
  })

  it('을(음)년 남자는 역행, 여자는 순행', () => {
    expect(isForward(1, 'male')).toBe(false)
    expect(isForward(1, 'female')).toBe(true)
  })
})
