import { describe, expect, it } from 'vitest'
import { ZIWEI } from '../data/index.ts'
import { calculateZiwei, effectiveLunarMonth, palaceStem, soulAndBody, ziweiPosition } from './ziwei.ts'
import type { ZiweiChart } from './ziwei.ts'

// 지지: 자0 축1 인2 묘3 진4 사5 오6 미7 신8 유9 술10 해11
const starAt = (c: ZiweiChart, id: string) => c.palaces.find((p) => p.stars.some((s) => s.id === id))!.branch

describe('자미성 위치 (문서 알고리즘)', () => {
  it('알려진 값: 수2국 초일 축, 초이 인, 화6국 초일 유', () => {
    expect(ziweiPosition(2, 1)).toBe(1)
    expect(ziweiPosition(2, 2)).toBe(2)
    expect(ziweiPosition(6, 1)).toBe(9)
  })

  it('모든 국·일(2~6국 × 1~30일)에서 0~11 사이 값', () => {
    for (let n = 2; n <= 6; n++) for (let d = 1; d <= 30; d++) {
      const z = ziweiPosition(n, d)
      expect(z).toBeGreaterThanOrEqual(0)
      expect(z).toBeLessThan(12)
    }
  })
})

describe('명궁·신궁, 궁 천간, 윤달', () => {
  it('자·오시생은 명궁과 신궁이 같다', () => {
    for (let m = 1; m <= 12; m++) {
      for (const h of [0, 6]) {
        const { soul, body } = soulAndBody(m, h)
        expect(soul).toBe(body)
      }
    }
  })

  it('신궁 위치 규칙: 축·미시 복덕, 인·신시 관록, 묘·유시 천이, 진·술시 재백, 사·해시 부처 (문서·카페 설명)', () => {
    // 명궁에서 역행 순서: 명0 형제1 부처2 자녀3 재백4 질액5 천이6 노복7 관록8 전택9 복덕10 부모11
    const expected: Record<number, number> = { 1: 10, 7: 10, 2: 8, 8: 8, 3: 6, 9: 6, 4: 4, 10: 4, 5: 2, 11: 2 }
    for (let m = 1; m <= 12; m++) {
      for (const [h, order] of Object.entries(expected)) {
        const { soul, body } = soulAndBody(m, Number(h))
        expect(((soul - body) % 12 + 12) % 12, `월 ${m} 시 ${h}`).toBe(order)
      }
    }
  })

  it('궁 천간: 임년은 인궁이 임, 미궁이 정', () => {
    expect(palaceStem(8, 2)).toBe(8)
    expect(palaceStem(8, 7)).toBe(3)
  })

  it('윤달: split-15는 15일까지 그 달, 16일부터 다음 달 / as-is는 그대로', () => {
    expect(effectiveLunarMonth({ year: 2020, month: 4, day: 15, isLeapMonth: true }, 'split-15')).toBe(4)
    expect(effectiveLunarMonth({ year: 2020, month: 4, day: 16, isLeapMonth: true }, 'split-15')).toBe(5)
    expect(effectiveLunarMonth({ year: 2020, month: 4, day: 20, isLeapMonth: true }, 'as-is')).toBe(4)
    expect(effectiveLunarMonth({ year: 2020, month: 4, day: 20, isLeapMonth: false }, 'split-15')).toBe(4)
  })
})

describe('손계산 명반: 음력 1992-09-29 묘시 남 (양력 1992-10-24 05:30)', () => {
  const c = calculateZiwei({
    lunar: { year: 1992, month: 9, day: 29, isLeapMonth: false },
    hourBranch: 3,
    gender: 'male',
    leapMonthRule: 'split-15',
  })

  it('생년 임신, 명궁 미, 신궁 축', () => {
    expect(c.yearGanji.index).toBe(8) // 임신
    expect(c.soulBranch).toBe(7)
    expect(c.bodyBranch).toBe(1)
  })

  it('명궁 정미 → 천하수 → 수2국, 자미 묘', () => {
    expect(c.palaces[7].stem).toBe(3)
    expect(c.bureau).toEqual({ number: 2, element: 'water', napeum: '천하수' })
    expect(c.ziweiBranch).toBe(3)
  })

  it('14주성 위치', () => {
    const exp: Record<string, number> = {
      ziwei: 3, tianji: 2, taiyang: 0, wuqu: 11, tiantong: 10, lianzhen: 7,
      tianfu: 1, taiyin: 2, tanlang: 3, jumen: 4, tianxiang: 5, tianliang: 6, qisha: 7, pojun: 11,
    }
    for (const [id, b] of Object.entries(exp)) expect(starAt(c, id), id).toBe(b)
  })

  it('육길·록존·살성 위치', () => {
    const exp: Record<string, number> = {
      zuofu: 0, youbi: 2, wenchang: 7, wenqu: 7, tiankui: 3, tianyue: 5,
      lucun: 11, qingyang: 0, tuoluo: 10, dijie: 2, dikong: 8, huoxing: 5, lingxing: 1,
    }
    for (const [id, b] of Object.entries(exp)) expect(starAt(c, id), id).toBe(b)
  })

  it('생년 사화(임): 천량 록, 자미 권, 좌보 과, 무곡 기', () => {
    const sihua = Object.fromEntries(c.palaces.flatMap((p) => p.stars.filter((s) => s.sihua).map((s) => [s.id, s.sihua])))
    expect(sihua).toEqual({ tianliang: '록', ziwei: '권', zuofu: '과', wuqu: '기' })
  })

  it('궁 이름: 명궁 미, 형제 오, 부모 신 (명궁에서 역행)', () => {
    expect(c.palaces[7].name).toBe('명궁')
    expect(c.palaces[6].name).toBe('형제궁')
    expect(c.palaces[8].name).toBe('부모궁')
    expect(c.palaces[1].isBody).toBe(true)
  })

  it('대한: 수2국 2세부터, 임(양)년 남자 순행 → 미 2-11, 신 12-21, 오 112-121', () => {
    expect(c.decadeForward).toBe(true)
    expect(c.palaces[7].decade).toEqual([2, 11])
    expect(c.palaces[8].decade).toEqual([12, 21])
    expect(c.palaces[6].decade).toEqual([112, 121])
  })
})

describe('구조 불변식', () => {
  it('27개 별이 모두 정확히 한 궁에 놓인다', () => {
    for (let d = 1; d <= 30; d += 7) {
      for (let h = 0; h < 12; h += 5) {
        const c = calculateZiwei({ lunar: { year: 1990 + d, month: (d % 12) + 1, day: d, isLeapMonth: false }, hourBranch: h, gender: 'female', leapMonthRule: 'split-15' })
        const ids = c.palaces.flatMap((p) => p.stars.map((s) => s.id))
        expect(ids).toHaveLength(ZIWEI.stars.length)
        expect(new Set(ids).size).toBe(ZIWEI.stars.length)
      }
    }
  })

  it('12궁 이름이 한 번씩, 대한 범위가 10년 간격으로 겹치지 않는다', () => {
    const c = calculateZiwei({ lunar: { year: 1985, month: 3, day: 14, isLeapMonth: false }, hourBranch: 9, gender: 'male', leapMonthRule: 'split-15' })
    expect(new Set(c.palaces.map((p) => p.name)).size).toBe(12)
    const starts = c.palaces.map((p) => p.decade[0]).sort((a, b) => a - b)
    starts.forEach((s, i) => expect(s).toBe(c.bureau.number + 10 * i))
  })

  it('사화는 항상 4개', () => {
    for (let y = 1984; y < 1994; y++) {
      const c = calculateZiwei({ lunar: { year: y, month: 6, day: 10, isLeapMonth: false }, hourBranch: 4, gender: 'male', leapMonthRule: 'as-is' })
      expect(c.palaces.flatMap((p) => p.stars.filter((s) => s.sihua))).toHaveLength(4)
    }
  })
})
