import { describe, expect, it } from 'vitest'
import type { BirthInput } from '../types/input.ts'
import { buildCompatibility } from './compatibility.ts'
import { calculateSaju } from './index.ts'

const ME: BirthInput = { calendar: 'solar', year: 1992, month: 10, day: 24, time: { hour: 5, minute: 30 }, gender: 'male' } // 계유일
const PARTNER: BirthInput = { calendar: 'solar', year: 1994, month: 3, day: 15, time: { hour: 12, minute: 0 }, gender: 'female' } // 경자일

const ids = (lines: { id: string }[]) => lines.map((l) => l.id)
const compat = (a: BirthInput, b: BirthInput) => buildCompatibility(calculateSaju(a), calculateSaju(b))

/** 원하는 일간(천간 id)을 가진 날짜를 찾는다 (일주는 하루에 1씩 증가) */
function withDayStem(stem: number, base: BirthInput): BirthInput {
  for (let d = 1; d <= 10; d++) {
    const input = { ...base, day: d }
    if (calculateSaju(input).dayMaster === stem) return input
  }
  throw new Error('찾지 못함')
}

describe('궁합 손풀이: 1992 계유일(남) × 1994 경자일(여)', () => {
  const r = compat(ME, PARTNER)

  it('좋은 점: 상대가 나를 돕는 관계(쇠가 물을 생함), 내게 없는 불을 상대가 채움', () => {
    expect(ids(r.strengths)).toEqual(['cp-they-give', 'cp-fill-me-fire'])
  })

  it('맞춰 갈 점: 받는 쪽 익숙함 주의, 배우자 자리 유·자 사이의 작은 긴장(자유파)', () => {
    expect(ids(r.adjustments)).toEqual(['cp-they-tired', 'cp-home-tension'])
  })

  it('요약은 균형 문장, 점수는 없다', () => {
    expect(r.summary).toBe('잘 맞는 부분과 맞춰 갈 부분이 함께 있습니다.')
    expect(JSON.stringify(r)).not.toMatch(/\d+\s*점/)
  })

  it('근거: 두 사람의 글자·배우자 자리·띠·기운 세기', () => {
    expect(r.basis.map((b) => b.plain)).toEqual([
      '두 사람을 뜻하는 글자: 나 계(물) · 상대 경(쇠)',
      '배우자 자리: 나 유 · 상대 자',
      '띠: 원숭이띠·개띠',
      '기운의 세기: 나 균형 · 상대 약한 편',
    ])
  })
})

describe('궁합 규칙별 확인', () => {
  const base: BirthInput = { calendar: 'solar', year: 1994, month: 3, day: 1, time: { hour: 12, minute: 0 }, gender: 'female' }

  it('계(물)와 무(흙)는 서로 끌려 묶이는 글자(무계합)', () => {
    const r = compat(ME, withDayStem(4, base))
    expect(ids(r.strengths)).toContain('cp-stem-combine')
  })

  it('계(물)와 정(불)은 부딪히는 글자(정계충), 정은 남성 계의 배우자 기운(불)과 같다', () => {
    const r = compat(ME, withDayStem(3, base))
    expect(ids(r.adjustments)).toContain('cp-stem-clash')
    expect(ids(r.strengths)).toContain('cp-spouse-me')
    // 여성 정(불)의 배우자 기운은 불을 다스리는 물 → 계(물)와 같다
    expect(ids(r.strengths)).toContain('cp-spouse-them')
  })

  it('같은 성별이면 배우자 기운 항목을 보지 않고 그 이유를 알린다', () => {
    const r = compat(ME, { ...withDayStem(3, base), gender: 'male' })
    expect(ids(r.strengths).some((id) => id.startsWith('cp-spouse'))).toBe(false)
    expect(r.note).toContain('남녀를 기준으로')
  })

  it('나를 기준으로 본 결과와 상대를 기준으로 본 결과는 역할이 뒤바뀐다 (돕는 쪽 ↔ 받는 쪽)', () => {
    expect(ids(compat(PARTNER, ME).strengths)[0]).toBe('cp-i-give')
  })
})

describe('궁합 전수 검사: 임의 1000쌍', () => {
  function rng(seed: number) {
    let a = seed
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const r = rng(2024)
  const rand = (): BirthInput => ({
    calendar: 'solar', year: 1950 + Math.floor(r() * 70), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28),
    time: r() < 0.2 ? null : { hour: Math.floor(r() * 24), minute: 0 }, gender: r() < 0.5 ? 'male' : 'female',
  })
  const pairs = Array.from({ length: 1000 }, () => [rand(), rand()] as const)
  const JARGON = ['일간', '일지', '연지', '천간', '지지', '비견', '겁재', '정재', '편재', '정관', '칠살', '정인', '편인', '식신', '상관', '신강', '신약', '용신', '합화', '천간합', '육합', '삼합']
  const FORBIDDEN = ['반드시', '틀림없', '무조건', '불행', '이혼', '파혼', '헤어', '나쁜 궁합', '최악', '상극이라']

  it('항상 요약·좋은 점·맞춰 갈 점이 있고, 정해진 세 가지 요약 중 하나', () => {
    const SUMMARIES = ['서로 잘 맞는 부분이 많은 편입니다.', '잘 맞는 부분과 맞춰 갈 부분이 함께 있습니다.', '맞춰 갈 부분이 있는 만큼, 서로의 차이를 이해하면 좋은 관계로 이어질 수 있습니다.']
    for (const [a, b] of pairs) {
      const c = compat(a, b)
      expect(c.strengths.length).toBeGreaterThan(0)
      expect(c.adjustments.length).toBeGreaterThan(0)
      expect(SUMMARIES).toContain(c.summary)
    }
  })

  it('쉬운 말뿐이고(근거의 원래 용어 제외) 금지 표현·점수가 없다', () => {
    const bad = new Set<string>()
    for (const [a, b] of pairs) {
      const c = compat(a, b)
      const text = [c.summary, ...c.strengths.map((l) => l.text), ...c.adjustments.map((l) => l.text), ...c.basis.map((x) => x.plain), c.note].join(' ')
      for (const w of [...JARGON, ...FORBIDDEN]) if (text.includes(w)) bad.add(w)
      if (/\d+\s*점/.test(text)) bad.add('점수')
    }
    expect([...bad]).toEqual([])
  })

  it('같은 입력이면 항상 같은 결과', () => {
    for (const [a, b] of pairs.slice(0, 50)) expect(compat(a, b)).toEqual(compat(a, b))
  })
})
