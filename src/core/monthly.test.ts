import { describe, expect, it } from 'vitest'
import type { BirthInput } from '../types/input.ts'
import { lichunMs } from './calendar.ts'
import { extractFeatures } from './features.ts'
import { calculateSaju, ganjiName } from './index.ts'
import { analyzeChart } from './insight.ts'
import { buildMonthly } from './monthly.ts'
import { buildOverview } from './overview.ts'
import { buildCategoryReadings } from './reading.ts'
import { ziweiFromChart } from './ziwei-from-chart.ts'

const NOW = new Date('2026-11-10T03:00:00Z')
const INPUT_1992: BirthInput = { calendar: 'solar', year: 1992, month: 10, day: 24, time: { hour: 5, minute: 30 }, gender: 'male' }

function build(input: BirthInput, now = NOW) {
  const chart = calculateSaju(input)
  const features = extractFeatures(chart, analyzeChart(chart), now, ziweiFromChart(chart))
  const readings = buildCategoryReadings(features)
  const monthly = buildMonthly(chart, features, now)
  return { features, readings, monthly, overview: buildOverview(features, readings, monthly) }
}

describe('월별 흐름: 1992-10-24 05:30 남 (계수 일간, 일지 유) × 2026 병오년 손풀이', () => {
  const { monthly } = build(INPUT_1992)

  it('입춘 기준 2026년 12개월: 경인부터 신축까지, 첫 달은 입춘에 시작', () => {
    expect(monthly.sajuYear).toBe(2026)
    expect(monthly.months.map((m) => ganjiName(m.ganji)).join(' ')).toBe('경인 신묘 임진 계사 갑오 을미 병신 정유 무술 기해 경자 신축')
    expect(monthly.months[0].startMs).toBe(lichunMs(2026))
    expect(monthly.months[11].endMs).toBe(lichunMs(2027))
  })

  it('달마다 주제(위 글자의 십성 묶음)', () => {
    expect(monthly.months.map((m) => m.stemGroup)).toEqual(['인성', '인성', '비겁', '비겁', '식상', '식상', '재성', '재성', '관성', '관성', '인성', '인성'])
  })

  it('일지(유)와의 관계 표시: 묘 변화, 진·사·신·축 화합, 유·자 오해 주의, 술은 화합+오해', () => {
    const tags = Object.fromEntries(monthly.months.map((m) => [ganjiName(m.ganji), m.tags]))
    expect(tags['신묘']).toEqual(['change'])
    expect(tags['임진']).toEqual(['harmony'])
    expect(tags['계사']).toEqual(['harmony'])
    expect(tags['병신']).toEqual(['harmony'])
    expect(tags['정유']).toEqual(['friction'])
    expect(tags['무술']).toEqual(['harmony', 'friction'])
    expect(tags['경자']).toEqual(['friction'])
    expect(tags['신축']).toEqual(['harmony'])
    for (const g of ['경인', '갑오', '을미', '기해']) expect(tags[g], g).toEqual([])
  })

  it('도움이 되는 기운 표시는 없다 (균형이라 균형 기준 후보 없음, 술월생이라 계절 기준 없음)', () => {
    expect(monthly.months.some((m) => m.tags.includes('helpful'))).toBe(false)
  })

  it('이번 달(2026-11-10)은 입동(11/7) 이후라 기해월', () => {
    const current = monthly.months.filter((m) => m.isCurrent)
    expect(current).toHaveLength(1)
    expect(ganjiName(current[0].ganji)).toBe('기해')
  })
})

describe('월별 흐름: 기준 날짜에 따른 해 선택', () => {
  it('입춘 전(2027-01-20)이면 아직 2026년의 마지막 달(신축)이 이번 달', () => {
    const { monthly } = build(INPUT_1992, new Date('2027-01-20T03:00:00Z'))
    expect(monthly.sajuYear).toBe(2026)
    expect(ganjiName(monthly.months.find((m) => m.isCurrent)!.ganji)).toBe('신축')
  })

  it('입춘 후(2027-02-10)면 2027년 정미년의 첫 달(임인)이 이번 달', () => {
    const { monthly } = build(INPUT_1992, new Date('2027-02-10T03:00:00Z'))
    expect(monthly.sajuYear).toBe(2027)
    expect(ganjiName(monthly.months[0].ganji)).toBe('임인')
    expect(monthly.months[0].isCurrent).toBe(true)
  })
})

describe('한눈에 보기', () => {
  it('1992 표본: 성향·강점·올해와 이번 달 세 줄', () => {
    const { overview } = build(INPUT_1992)
    expect(overview).toEqual([
      { label: '나의 성향', text: '계(물) · 기운은 균형. 비와 이슬처럼 조용히 스며드는 기질로 봅니다.' },
      { label: '강점', text: '배우기를 좋아하고 생각이 깊은 편입니다.' },
      {
        label: '올해·이번 달',
        text: "2026년(병오)은 '돈·현실 문제·성과'가 중심 주제가 되기 쉽습니다. 이번 달은 책임과 일정이 늘기 쉬운 달로 봅니다.",
      },
    ])
  })
})

describe('전수 검사: 임의 사주 1000건 × 여러 기준 날짜', () => {
  function rng(seed: number) {
    let a = seed
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const JARGON = ['비견', '겁재', '식신', '상관', '편재', '정재', '칠살', '편관', '정관', '편인', '정인', '대운', '세운', '월운', '일지', '일간', '신강', '신약', '비겁', '식상', '재성', '관성', '인성']
  const FORBIDDEN = ['반드시', '틀림없', '무조건', '불행', '재앙', '이혼', '파산', '사고', '질병']

  it('항상 12개월, 이번 달은 정확히 하나, 한눈에 보기는 세 줄이고 쉬운 말뿐', () => {
    const r = rng(31)
    const nows = ['2026-01-15', '2026-02-10', '2026-06-30', '2026-11-10', '2027-01-31'].map((d) => new Date(`${d}T03:00:00Z`))
    for (let i = 0; i < 1000; i++) {
      const input: BirthInput = {
        calendar: 'solar', year: 1930 + Math.floor(r() * 90), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28),
        time: r() < 0.15 ? null : { hour: Math.floor(r() * 24), minute: 0 }, gender: r() < 0.5 ? 'male' : 'female',
      }
      const now = nows[i % nows.length]
      const { monthly, overview } = build(input, now)
      expect(monthly.months).toHaveLength(12)
      expect(monthly.months.filter((m) => m.isCurrent)).toHaveLength(1)
      // 달은 이어져 있다 (빈틈·겹침 없음)
      for (let k = 1; k < 12; k++) expect(monthly.months[k].startMs).toBe(monthly.months[k - 1].endMs)
      expect(overview.map((l) => l.label)).toEqual(['나의 성향', '강점', '올해·이번 달'])
      const text = [...overview.map((l) => l.text), ...monthly.months.flatMap((m) => [m.theme, ...m.notes])].join(' ')
      for (const w of [...JARGON, ...FORBIDDEN]) expect(text.includes(w), `${w} ← ${JSON.stringify(input)}`).toBe(false)
    }
  })
})
