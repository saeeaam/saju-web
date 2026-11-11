import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from '../types/options.ts'
import { ganjiName } from './ganji.ts'
import { seunPillar, wolunPillars } from './luck.ts'
import { calculatePillars, resolveBirthMoment } from './pillars.ts'

describe('세운', () => {
  it('2024 갑진, 2025 을사, 2000 경진, 1984 갑자', () => {
    expect(ganjiName(seunPillar(2024))).toBe('갑진')
    expect(ganjiName(seunPillar(2025))).toBe('을사')
    expect(ganjiName(seunPillar(2000))).toBe('경진')
    expect(ganjiName(seunPillar(1984))).toBe('갑자')
  })
})

describe('월운', () => {
  it('12개월이고 인월~축월 순서', () => {
    const w = wolunPillars(2024)
    expect(w).toHaveLength(12)
    expect(w.map((e) => e.ganji.branch)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1])
    expect(w[0].jie.name).toBe('입춘')
    expect(w[11].jie.name).toBe('소한')
  })

  it('갑진년(2024) 월운: 병인 정묘 무진 기사 경오 신미 임신 계유 갑술 을해 병자 정축', () => {
    expect(wolunPillars(2024).map((e) => ganjiName(e.ganji)).join(' ')).toBe(
      '병인 정묘 무진 기사 경오 신미 임신 계유 갑술 을해 병자 정축',
    )
  })

  it('각 달 한가운데 시각의 실제 월주 계산과 일치한다 (1900~2050, 연도별 12개월)', () => {
    for (let y = 1901; y <= 2049; y += 4) {
      const w = wolunPillars(y)
      for (const e of w) {
        const mid = e.jie.ms + 10 * 86_400_000 // 절입 10일 후
        const date = new Date(mid + 9 * 3600_000)
        const moment = resolveBirthMoment({
          date: { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() },
          time: { hour: 12, minute: 0 },
          options: { ...DEFAULT_OPTIONS, historicalTimeCorrection: false },
        })
        const p = calculatePillars(moment, true, DEFAULT_OPTIONS)
        expect(ganjiName(p.month), `${y}년 ${e.jie.name}`).toBe(ganjiName(e.ganji))
        expect(p.year.index).toBe(seunPillar(y).index)
      }
    }
  })
})
