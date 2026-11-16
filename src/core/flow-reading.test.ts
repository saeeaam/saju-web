import { describe, expect, it } from 'vitest'
import type { BirthInput } from '../types/input.ts'
import { extractFeatures } from './features.ts'
import { buildFlowReading } from './flow-reading.ts'
import { calculateSaju, seunPillar } from './index.ts'
import { analyzeChart } from './insight.ts'
import { ziweiFromChart } from './ziwei-from-chart.ts'

const NOW = new Date('2026-11-16T03:00:00Z')
const ME: BirthInput = { calendar: 'solar', year: 1992, month: 10, day: 24, time: { hour: 5, minute: 30 }, gender: 'male' }

function setup(input: BirthInput) {
  const chart = calculateSaju(input)
  return { chart, f: extractFeatures(chart, analyzeChart(chart), NOW, ziweiFromChart(chart)) }
}

describe('흐름 풀이 손풀이: 1992 계유일(남, 균형, 불 없음)', () => {
  const { chart, f } = setup(ME)

  it('2026년 병오: 여섯 문장이 손풀이와 같다', () => {
    const r = buildFlowReading(chart, f, seunPillar(2026), 'year')
    expect(r.title).toBe('돈과 성과의 해')
    expect(r.base).toBeNull() // 병(정재)·오(편재) 모두 재물 → 겉과 바탕이 같다
    expect(r.body).toEqual([
      '돈을 벌고 관리하는 일, 일의 성과와 현실적인 문제가 중심이 되기 쉬운 해입니다.',
      '겉과 바탕이 같은 흐름이라 그 성격이 뚜렷하게 나타나기 쉽습니다.',
      '할 일이 느는 만큼 결과로 이어지기 쉬운 때로 봅니다.', // 균형 + 힘을 쓰게 하는 기운
      '내 사주에 없던 불 기운이 들어와 평소와 다른 면을 경험하기 쉽습니다.', // 병 = 불, 원국에 불 없음
      '일·사회 자리와 어울리는 글자가 들어와, 직장이나 사회생활이 무난하게 흘러가기 쉽습니다.', // 오·술 반합(월지)
      '전통 해석에서 남성에게 재물의 기운은 배우자를 뜻해, 연애·결혼과 관련된 일이 생기기 쉬운 해이기도 합니다.',
    ])
    expect(r.advice).toContain('수입·지출 계획')
  })

  it('24~33세 계축 10년: 같은 기운(계=비견)이 겉, 다스리는 기운(축=칠살)이 바탕, 가까운 자리(유)와 어울림(유축 반합)', () => {
    const d = chart.daeun.pillars[2]
    const r = buildFlowReading(chart, f, d.ganji, 'decade')
    expect(r.title).toBe('내 힘으로 서려는 10년')
    expect(r.base).toBe('직장과 책임')
    expect(r.body).toContain('균형인 내 사주에 힘이 더해져 자신감이 붙기 쉬운 때로 봅니다.')
    expect(r.body).toContain('나와 가장 가까운 자리와 어울리는 글자가 들어와, 연인·배우자 등 가까운 사람과의 관계가 안정되기 쉽습니다.')
  })

  it('features.flow는 지금의 10년·올해·내년 풀이를 담는다', () => {
    expect(f.flow.daeun!.title).toBe('내 힘으로 서려는 10년')
    expect(f.flow.thisYear.title).toBe('돈과 성과의 해')
    expect(f.flow.nextYear.ganji.index).toBe(seunPillar(2027).index)
  })
})

describe('흐름 풀이 규칙: 기운 세기에 따라 문장이 달라진다', () => {
  it('기운이 약한 사람에게 돕는 기운이 오면 "힘이 실려", 힘을 쓰게 하는 기운이 오면 "지치기 쉬운"', () => {
    // 2001-03-03(을축일, 약한 편)
    const { chart, f } = setup({ calendar: 'solar', year: 2001, month: 3, day: 3, time: { hour: 12, minute: 0 }, gender: 'female' })
    expect(f.strength).toBe('신약')
    const all = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029].map((y) => buildFlowReading(chart, f, seunPillar(y), 'year'))
    const helpYears = all.filter((r) => r.stemGroup === '비겁' || r.stemGroup === '인성')
    const drainYears = all.filter((r) => !(r.stemGroup === '비겁' || r.stemGroup === '인성'))
    for (const r of helpYears) expect(r.body.join(' ')).toContain('힘이 실려')
    for (const r of drainYears) expect(r.body.join(' ')).toContain('지치기 쉬운')
    expect(helpYears.length).toBeGreaterThan(0)
    expect(drainYears.length).toBeGreaterThan(0)
  })
})

describe('흐름 풀이 전수 검사: 임의 사주 500건 × 10년 흐름 전체 + 10개 해', () => {
  function rng(seed: number) {
    let a = seed
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const JARGON = ['비견', '겁재', '식신', '상관', '편재', '정재', '칠살', '편관', '정관', '편인', '정인', '대운', '세운', '일지', '일간', '월지', '연지', '시지', '신강', '신약', '비겁', '식상', '재성', '관성', '인성', '천간', '지지', '용신']
  const FORBIDDEN = ['반드시', '틀림없', '무조건', '불행', '재앙', '이혼', '파산', '사고', '질병', '결혼합니다', '이직합니다', '죽']
  const TITLES = new Set(['내 힘으로 서려는 10년', '펼치고 시도하는 10년', '돈과 성과의 10년', '책임과 자리의 10년', '배우고 준비하는 10년', '사람과 독립의 해', '표현과 새로운 시도의 해', '돈과 성과의 해', '책임과 평가의 해', '배움과 준비의 해'])

  it('제목은 정해진 10개 중 하나, 문단은 3~8문장, 쉬운 말뿐이고 금지 표현·단정이 없다, 같은 입력이면 같은 결과', () => {
    const r = rng(77)
    const bad = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const input: BirthInput = {
        calendar: 'solar', year: 1940 + Math.floor(r() * 80), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28),
        time: r() < 0.15 ? null : { hour: Math.floor(r() * 24), minute: 0 }, gender: r() < 0.5 ? 'male' : 'female',
      }
      const { chart, f } = setup(input)
      const readings = [
        ...chart.daeun.pillars.map((p) => buildFlowReading(chart, f, p.ganji, 'decade')),
        ...Array.from({ length: 10 }, (_, k) => buildFlowReading(chart, f, seunPillar(2020 + k), 'year')),
      ]
      for (const fr of readings) {
        if (!TITLES.has(fr.title)) bad.add(`제목: ${fr.title}`)
        if (fr.body.length < 3 || fr.body.length > 8) bad.add(`문장 수 ${fr.body.length}`)
        if (!fr.advice) bad.add('조언 없음')
        const text = [fr.title, fr.base ?? '', ...fr.body, fr.advice, ...fr.basis.map((b) => b.plain)].join(' ')
        for (const w of [...JARGON, ...FORBIDDEN]) if (text.includes(w)) bad.add(`${w}: ${text.slice(0, 40)}`)
        // 같은 문장이 한 문단에 두 번 나오지 않는다
        if (new Set(fr.body).size !== fr.body.length) bad.add('문장 반복')
      }
      if (i < 20) expect(buildFlowReading(chart, f, seunPillar(2026), 'year')).toEqual(buildFlowReading(chart, f, seunPillar(2026), 'year'))
    }
    expect([...bad]).toEqual([])
  })
})
