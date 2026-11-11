import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from '../types/options.ts'
import {
  elementDistribution,
  hiddenStemsOf,
  napeumOf,
  tenGodOfBranch,
  tenGodOfStem,
  twelveStage,
  voidBranches,
} from './analysis.ts'
import { calculateSaju } from './index.ts'
import { ganjiFromParts, ganjiName } from './ganji.ts'

// 천간: 갑0 을1 병2 정3 무4 기5 경6 신7 임8 계9 / 지지: 자0 축1 인2 묘3 진4 사5 오6 미7 신8 유9 술10 해11

describe('십성', () => {
  it('갑 일간 기준 10개 천간', () => {
    const names = Array.from({ length: 10 }, (_, s) => tenGodOfStem(0, s).name)
    expect(names).toEqual(['비견', '겁재', '식신', '상관', '편재', '정재', '칠살', '정관', '편인', '정인'])
  })

  it('음간 일간(을) 기준: 같은 음양이 편, 다른 음양이 정', () => {
    // 을(음목): 정(음화)=식신, 병(양화)=상관, 신(음금)=칠살, 경(양금)=정관
    expect(tenGodOfStem(1, 3).name).toBe('식신')
    expect(tenGodOfStem(1, 2).name).toBe('상관')
    expect(tenGodOfStem(1, 7).name).toBe('칠살')
    expect(tenGodOfStem(1, 6).name).toBe('정관')
    // 을 기준 계(음수)=편인, 임(양수)=정인
    expect(tenGodOfStem(1, 9).name).toBe('편인')
    expect(tenGodOfStem(1, 8).name).toBe('정인')
  })

  it('묶음(그룹) 이름', () => {
    expect(tenGodOfStem(0, 6).group).toBe('관성')
    expect(tenGodOfStem(0, 4).group).toBe('재성')
  })

  it('지지의 십성은 정기 기준: 갑 일간에게 신(申)은 경 정기 → 칠살', () => {
    expect(tenGodOfBranch(0, 8).name).toBe('칠살')
    expect(tenGodOfBranch(0, 0).name).toBe('정인') // 자 정기 계
  })
})

describe('지장간', () => {
  it('인 = 무·병·갑, 묘 = 갑·을', () => {
    expect(hiddenStemsOf(2)).toEqual([4, 2, 0])
    expect(hiddenStemsOf(3)).toEqual([0, 1])
  })
})

describe('12운성', () => {
  const stageAt = (stem: number, branch: number) => twelveStage(stem, branch).name

  it('갑목: 해 장생, 자 목욕, 축 관대, 인 건록, 묘 제왕 … 미 묘, 신 절', () => {
    expect(stageAt(0, 11)).toBe('장생')
    expect(stageAt(0, 0)).toBe('목욕')
    expect(stageAt(0, 1)).toBe('관대')
    expect(stageAt(0, 2)).toBe('건록')
    expect(stageAt(0, 3)).toBe('제왕')
    expect(stageAt(0, 7)).toBe('묘')
    expect(stageAt(0, 8)).toBe('절')
  })

  it('을목(음간)은 역행: 오 장생, 사 목욕, 묘 건록, 인 제왕', () => {
    expect(stageAt(1, 6)).toBe('장생')
    expect(stageAt(1, 5)).toBe('목욕')
    expect(stageAt(1, 3)).toBe('건록')
    expect(stageAt(1, 2)).toBe('제왕')
  })

  it('건록: 갑 인, 을 묘, 병 사, 정 오, 경 신, 신 유, 임 해, 계 자', () => {
    const rok = [2, 3, 5, 6, 8, 9, 11, 0]
    const stems = [0, 1, 2, 3, 6, 7, 8, 9]
    stems.forEach((s, i) => expect(stageAt(s, rok[i])).toBe('건록'))
  })

  it('토의 처리: 화토동궁은 무가 인 장생, 수토동궁은 무가 신 장생', () => {
    expect(twelveStage(4, 2, 'fire-earth').name).toBe('장생')
    expect(twelveStage(4, 8, 'water-earth').name).toBe('장생')
    expect(twelveStage(5, 9, 'fire-earth').name).toBe('장생') // 기: 유
    expect(twelveStage(5, 3, 'water-earth').name).toBe('장생') // 기: 묘 (계와 같음)
  })

  it('12지지에 12단계가 한 번씩 대응한다', () => {
    for (let stem = 0; stem < 10; stem++) {
      const set = new Set(Array.from({ length: 12 }, (_, b) => twelveStage(stem, b).index))
      expect(set.size).toBe(12)
    }
  })
})

describe('납음', () => {
  it('60갑자 쌍: 갑자·을축 = 해중금, 경자 = 벽상토, 임술·계해 = 대해수', () => {
    expect(napeumOf(0).ko).toBe('해중금')
    expect(napeumOf(1).ko).toBe('해중금')
    expect(napeumOf(36).ko).toBe('벽상토')
    expect(napeumOf(58).ko).toBe('대해수')
    expect(napeumOf(59).ko).toBe('대해수')
  })
})

describe('공망', () => {
  it('순(旬)별 공망: 갑자순 술·해, 갑술순 신·유, 갑신순 오·미, 갑오순 진·사, 갑진순 인·묘, 갑인순 자·축', () => {
    expect(voidBranches(0)).toEqual([10, 11])
    expect(voidBranches(9)).toEqual([10, 11])
    expect(voidBranches(10)).toEqual([8, 9])
    expect(voidBranches(20)).toEqual([6, 7])
    expect(voidBranches(30)).toEqual([4, 5])
    expect(voidBranches(40)).toEqual([2, 3])
    expect(voidBranches(50)).toEqual([0, 1])
    expect(voidBranches(59)).toEqual([0, 1])
  })

  it('공망 지지는 해당 순에 쓰이지 않은 지지이다', () => {
    for (let xun = 0; xun < 60; xun += 10) {
      const used = new Set(Array.from({ length: 10 }, (_, i) => (xun + i) % 12))
      const [a, b] = voidBranches(xun)
      expect(used.has(a)).toBe(false)
      expect(used.has(b)).toBe(false)
    }
  })
})

describe('오행 분포', () => {
  it('2000-01-01 12:00 (기묘 병자 무오 무오): 천간 토2·화1·토..', () => {
    const chart = calculateSaju({
      calendar: 'solar', year: 2000, month: 1, day: 1, time: { hour: 12, minute: 0 }, gender: 'male',
    })
    const gs = chart.pillars.map((p) => p.ganji)
    expect(gs.map(ganjiName)).toEqual(['기묘', '병자', '무오', '무오'])
    const d = elementDistribution(gs)
    expect(d.stems).toEqual({ wood: 0, fire: 1, earth: 3, metal: 0, water: 0 }) // 기 병 무 무
    expect(d.branches).toEqual({ wood: 1, fire: 2, earth: 0, metal: 0, water: 1 }) // 묘 자 오 오
    expect(d.total.earth).toBe(3)
    expect(Object.values(d.total).reduce((a, b) => a + b, 0)).toBe(8)
  })
})

describe('calculateSaju 통합', () => {
  const input = {
    calendar: 'solar' as const, year: 1992, month: 10, day: 24,
    time: { hour: 5, minute: 30 }, gender: 'male' as const,
  }

  it('1992-10-24 05:30 → 임신 경술 계유 을묘, 일간 계(9)', () => {
    const c = calculateSaju(input)
    expect(c.pillars.map((p) => ganjiName(p.ganji))).toEqual(['임신', '경술', '계유', '을묘'])
    expect(c.dayMaster).toBe(9)
    expect(c.pillars[2].stemTenGod).toBeNull() // 일간 자신
    expect(c.pillars[0].stemTenGod!.name).toBe('겁재') // 일간 계(음수) vs 임(양수): 같은 오행, 음양 다름
  })

  it('음력 입력(1992-09-29)이 같은 양력 날짜로 변환된다', () => {
    const c = calculateSaju({ ...input, calendar: 'lunar', month: 9, day: 29 })
    expect(c.solarDate).toEqual({ year: 1992, month: 10, day: 24 })
    expect(c.pillars.map((p) => ganjiName(p.ganji))).toEqual(['임신', '경술', '계유', '을묘'])
  })

  it('시간 모름: 시주 없이 3주, 공망·십성은 계산된다', () => {
    const c = calculateSaju({ ...input, time: null })
    expect(c.pillars).toHaveLength(3)
    expect(c.pillars.map((p) => p.key)).toEqual(['year', 'month', 'day'])
  })

  it('일주 자신은 공망 표시 대상이 아니다', () => {
    const c = calculateSaju(input)
    expect(c.pillars[2].isVoid).toBe(false)
  })

  it('잘못된 입력은 RangeError', () => {
    expect(() => calculateSaju({ ...input, month: 2, day: 30 })).toThrow(RangeError)
    expect(() => calculateSaju({ ...input, year: 1700 })).toThrow(RangeError)
    expect(() => calculateSaju({ ...input, time: { hour: 24, minute: 0 } })).toThrow(RangeError)
    expect(() => calculateSaju({ ...input, month: 13 })).toThrow(RangeError)
  })

  it('경도 보정을 켰는데 출생지가 없으면 RangeError (조용히 건너뛰지 않음)', () => {
    expect(() => calculateSaju(input, { solarTimeCorrection: 'longitude' })).toThrow(RangeError)
    expect(() =>
      calculateSaju({ ...input, place: { longitude: 126.978 } }, { solarTimeCorrection: 'longitude' }),
    ).not.toThrow()
    // 시간을 모르면 보정할 시각이 없으므로 출생지 없이도 계산된다
    expect(() => calculateSaju({ ...input, time: null }, { solarTimeCorrection: 'longitude' })).not.toThrow()
    expect(() => calculateSaju({ ...input, place: { longitude: 500 } })).toThrow(RangeError)
  })

  it('옵션 기본값이 적용된다', () => {
    expect(calculateSaju(input).options).toEqual(DEFAULT_OPTIONS)
  })

  it('경고: 자시·절입 근처·1908년 이전', () => {
    expect(calculateSaju({ ...input, time: { hour: 23, minute: 30 } }).warnings).toContain('ZI_HOUR_BOUNDARY')
    expect(calculateSaju({ ...input, year: 1900, month: 6, day: 1 }).warnings).toContain('PRE_1908_LMT')
    // 2024 입춘 17:27 KST
    expect(
      calculateSaju({ ...input, year: 2024, month: 2, day: 4, time: { hour: 17, minute: 40 } }).warnings,
    ).toContain('NEAR_TERM_BOUNDARY')
    // 입춘 당일 시간 모름
    expect(calculateSaju({ ...input, year: 2024, month: 2, day: 4, time: null }).warnings).toContain('TERM_DAY_NO_TIME')
  })

  it('ganjiFromParts: 음양이 다른 조합은 오류', () => {
    expect(() => ganjiFromParts(0, 1)).toThrow(RangeError)
    expect(ganjiFromParts(0, 0).index).toBe(0)
    expect(ganjiFromParts(9, 11).index).toBe(59)
  })
})
