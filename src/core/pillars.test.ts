import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from '../types/options.ts'
import type { SajuOptions } from '../types/options.ts'
import { ganjiName } from './ganji.ts'
import { addDays, dayPillarIndex, gregorianToJdn } from './jdn.ts'
import { calculatePillars, resolveBirthMoment } from './pillars.ts'
import { tzOffsetMs, wallClockToUtcMs } from './time.ts'
import type { YMD } from './jdn.ts'

function pillars(
  date: YMD,
  time: { hour: number; minute: number } | null,
  opts: Partial<SajuOptions> = {},
  place?: { longitude: number },
) {
  const options = { ...DEFAULT_OPTIONS, ...opts }
  const moment = resolveBirthMoment({ date, time, place, options })
  const r = calculatePillars(moment, time !== null, options)
  return {
    text: [r.year, r.month, r.day, r.hour].map((g) => (g ? ganjiName(g) : '-')).join(' '),
    r,
    moment,
  }
}

const D = (year: number, month: number, day: number): YMD => ({ year, month, day })

describe('율리우스 적일·일주', () => {
  it('2000-01-01은 JDN 2451545, 무오일(순번 54)', () => {
    expect(gregorianToJdn(2000, 1, 1)).toBe(2451545)
    expect(dayPillarIndex(2000, 1, 1)).toBe(54)
  })

  it('일주는 하루 지날 때마다 1씩 증가하고 60일 주기이다', () => {
    const a = dayPillarIndex(2024, 2, 28)
    expect(dayPillarIndex(2024, 2, 29)).toBe((a + 1) % 60) // 윤일
    expect(dayPillarIndex(2024, 3, 1)).toBe((a + 2) % 60)
    expect(dayPillarIndex(2024, 4, 28)).toBe(a) // 60일 뒤
  })

  it('addDays가 월말·연말을 넘긴다', () => {
    expect(addDays(D(2023, 12, 31), 1)).toEqual(D(2024, 1, 1))
    expect(addDays(D(2024, 2, 28), 1)).toEqual(D(2024, 2, 29))
  })
})

describe('시간대 환산 (IANA)', () => {
  it('현재 한국은 UTC+9', () => {
    expect(tzOffsetMs(Date.UTC(2020, 0, 1))).toBe(9 * 3600_000)
  })

  it('1954-03-21~1961-08-10은 UTC+8:30', () => {
    expect(tzOffsetMs(Date.UTC(1954, 2, 22))).toBe(8.5 * 3600_000)
    expect(tzOffsetMs(Date.UTC(1961, 7, 9))).toBe(8.5 * 3600_000)
    expect(tzOffsetMs(Date.UTC(1961, 7, 11))).toBe(9 * 3600_000)
  })

  it('1988년 여름은 서머타임(UTC+10)', () => {
    expect(tzOffsetMs(Date.UTC(1988, 6, 1))).toBe(10 * 3600_000)
  })

  it('시계 시각 → 절대 시각 환산이 서머타임에서 한 시간 이르다', () => {
    // 1988-07-01 12:00 (서머타임) = 02:00Z
    expect(wallClockToUtcMs(1988, 7, 1, 12, 0)).toBe(Date.UTC(1988, 6, 1, 2, 0))
    // 2000-01-01 12:00 = 03:00Z
    expect(wallClockToUtcMs(2000, 1, 1, 12, 0)).toBe(Date.UTC(2000, 0, 1, 3, 0))
  })
})

describe('4주 계산: 테스트 벡터', () => {
  it('2000-01-01 12:00 → 기묘 병자 무오 무오 (문서 테스트 벡터)', () => {
    expect(pillars(D(2000, 1, 1), { hour: 12, minute: 0 }).text).toBe('기묘 병자 무오 무오')
  })

  it('1992-10-24 05:30 → 임신 경술 계유 을묘 (manseryeok 문서 예시)', () => {
    expect(pillars(D(1992, 10, 24), { hour: 5, minute: 30 }).text).toBe('임신 경술 계유 을묘')
  })

  it('시간 모름이면 시주 없이 3주', () => {
    const { r } = pillars(D(2000, 1, 1), null)
    expect(r.hour).toBeNull()
  })
})

describe('연주: 입춘 경계', () => {
  // 2024년 입춘: 2월 4일 17:27 KST (= 중국 표준시 16:27). manseryeok·lunar-javascript 두 라이브러리 일치 확인
  it('입춘 직전은 전년(계묘), 직후는 갑진', () => {
    expect(pillars(D(2024, 2, 4), { hour: 17, minute: 20 }).r.year.index).toBe(39) // 계묘
    expect(pillars(D(2024, 2, 4), { hour: 17, minute: 35 }).r.year.index).toBe(40) // 갑진
  })

  it('입춘 직전의 월주는 을축월, 직후는 병인월 (갑진년 병인)', () => {
    expect(ganjiName(pillars(D(2024, 2, 4), { hour: 17, minute: 20 }).r.month)).toBe('을축')
    expect(ganjiName(pillars(D(2024, 2, 4), { hour: 17, minute: 35 }).r.month)).toBe('병인')
  })

  it('음력 설 기준 옵션: 설(2012-01-23) 이후 입춘(2012-02-04) 이전은 임진년', () => {
    const date = D(2012, 1, 30)
    expect(ganjiName(pillars(date, { hour: 12, minute: 0 }).r.year)).toBe('신묘')
    expect(
      ganjiName(pillars(date, { hour: 12, minute: 0 }, { yearBoundary: 'lunar-new-year' }).r.year),
    ).toBe('임진')
  })

  it('음력 설 기준이어도 월주 천간은 입춘 기준 연간으로 정한다 (신묘년의 신축월)', () => {
    const { r } = pillars(D(2012, 1, 30), { hour: 12, minute: 0 }, { yearBoundary: 'lunar-new-year' })
    expect(ganjiName(r.month)).toBe('신축')
  })
})

describe('자시(23:00~23:59) 일 경계 옵션', () => {
  // 2000-01-01 23:30. 일주: 무오(54). 다음날(1/2)은 기미(55)
  const t = { hour: 23, minute: 30 }
  it('midnight: 일주·시간 모두 당일 일간 기준 → 무오일 임자시', () => {
    const { r } = pillars(D(2000, 1, 1), t, { dayBoundary: 'midnight' })
    expect(ganjiName(r.day)).toBe('무오')
    expect(ganjiName(r.hour!)).toBe('임자') // 무일 자시 = 임자
  })

  it('zi-hour-start: 다음날 기미일, 시간은 다음날 일간 기준 → 갑자시', () => {
    const { r } = pillars(D(2000, 1, 1), t, { dayBoundary: 'zi-hour-start' })
    expect(ganjiName(r.day)).toBe('기미')
    expect(ganjiName(r.hour!)).toBe('갑자') // 기일 자시 = 갑자
  })

  it('split-zi: 일주는 당일(무오), 시간 천간만 다음날 기준 → 갑자시', () => {
    const { r } = pillars(D(2000, 1, 1), t, { dayBoundary: 'split-zi' })
    expect(ganjiName(r.day)).toBe('무오')
    expect(ganjiName(r.hour!)).toBe('갑자')
  })

  it('00:30은 옵션과 상관없이 다음날 일주 (조자시)', () => {
    for (const dayBoundary of ['midnight', 'zi-hour-start', 'split-zi'] as const) {
      const { r } = pillars(D(2000, 1, 2), { hour: 0, minute: 30 }, { dayBoundary })
      expect(ganjiName(r.day)).toBe('기미')
      expect(ganjiName(r.hour!)).toBe('갑자')
    }
  })
})

describe('시각 보정', () => {
  it('서머타임(1988-07-01 08:30 = 표준시 07:30)은 진시(07~09)', () => {
    const { moment, r } = pillars(D(1988, 7, 1), { hour: 8, minute: 30 })
    expect(moment.correctionMinutes).toBe(-60)
    expect(r.clockHour).toBe(7)
  })

  it('경도 보정: 서울(126.978°E)은 약 -32분, 07:05 → 06:33 묘시', () => {
    const { moment, r } = pillars(
      D(1990, 5, 15),
      { hour: 7, minute: 5 },
      { solarTimeCorrection: 'longitude' },
      { longitude: 126.978 },
    )
    expect(moment.correctionMinutes).toBe(-32)
    expect(r.clockHour).toBe(6)
    expect(ganjiName(r.hour!).endsWith('묘')).toBe(true)
  })

  it('고정 -30분 옵션', () => {
    const { moment } = pillars(D(2000, 1, 1), { hour: 12, minute: 0 }, { solarTimeCorrection: 'fixed-30' })
    expect(moment.correctionMinutes).toBe(-30)
  })

  it('경도 보정은 연·월주 판정에 영향을 주지 않는다 (절대 시각 기준)', () => {
    const a = pillars(D(2024, 2, 4), { hour: 17, minute: 35 })
    const b = pillars(D(2024, 2, 4), { hour: 17, minute: 35 }, { solarTimeCorrection: 'longitude' }, { longitude: 126.978 })
    expect(b.r.year.index).toBe(a.r.year.index)
    expect(b.r.month.index).toBe(a.r.month.index)
  })
})
