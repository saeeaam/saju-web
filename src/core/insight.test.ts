import { describe, expect, it } from 'vitest'
import type { BirthInput } from '../types/input.ts'
import { analyzeChart } from './insight.ts'
import { calculateSaju } from './index.ts'
import { calculateStrength, STRENGTH_CONFIG } from './strength.ts'
import { analyzeYongshin, elementOfGroup } from './yongshin.ts'
import { findShinsal } from './shinsal.ts'

// 천간: 갑0 을1 병2 정3 무4 기5 경6 신7 임8 계9 / 지지: 자0 축1 인2 묘3 진4 사5 오6 미7 신8 유9 술10 해11
type P = { key: 'hour' | 'day' | 'month' | 'year'; stem: number; branch: number }
const P = (key: P['key'], stem: number, branch: number): P => ({ key, stem, branch })

const INPUT_1992: BirthInput = {
  calendar: 'solar', year: 1992, month: 10, day: 24, time: { hour: 5, minute: 30 }, gender: 'male',
}

describe('신강·신약', () => {
  it('설정 가중치의 합은 100', () => {
    expect(Object.values(STRENGTH_CONFIG.weights).reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('1992-10-24 05:30 (임신 경술 계유 을묘): 손풀이 48% → 중화', () => {
    // 돕는 자리: 월간 경(인성) 12 + 일지 유(인성) 20 + 연지 신(인성) 8 + 연간 임(비겁) 8 = 48
    const pillars = [P('hour', 1, 3), P('day', 9, 9), P('month', 6, 10), P('year', 8, 8)]
    const s = calculateStrength(9, pillars)
    expect(s.helpWeight).toBe(48)
    expect(s.totalWeight).toBe(100)
    expect(s.percent).toBe(48)
    expect(s.label).toBe('중화')
    expect(s.deukryeong).toBe(false) // 월지 술(토)은 일간 계수를 극하는 관성
    expect(s.deukji).toBe(true)
    expect(s.deukse).toBe(true) // 나머지 50 중 28
  })

  it('전부 같은 오행이면 100% 신강, 전부 극하는 오행이면 0% 신약', () => {
    const wood = [P('hour', 0, 2), P('day', 0, 2), P('month', 0, 2), P('year', 0, 2)]
    expect(calculateStrength(0, wood)).toMatchObject({ percent: 100, label: '신강' })
    const metal = [P('hour', 6, 8), P('day', 0, 8), P('month', 6, 8), P('year', 6, 8)]
    expect(calculateStrength(0, metal)).toMatchObject({ percent: 0, label: '신약' })
  })

  it('경계값: 60 이상 신강, 40 이하 신약', () => {
    const cfg = { ...STRENGTH_CONFIG, strongAt: 48, weakAt: 48 }
    const pillars = [P('hour', 1, 3), P('day', 9, 9), P('month', 6, 10), P('year', 8, 8)]
    expect(calculateStrength(9, pillars, cfg).label).toBe('신강') // 48 >= 48 이 먼저 판정
    expect(calculateStrength(9, pillars, { ...cfg, strongAt: 49, weakAt: 48 }).label).toBe('신약') // 48 <= 48
  })

  it('시간 모름: 시주 가중치를 빼고 비율을 다시 계산한다', () => {
    const noHour = [P('day', 9, 9), P('month', 6, 10), P('year', 8, 8)]
    const s = calculateStrength(9, noHour)
    expect(s.totalWeight).toBe(78) // 100 - 시지 12 - 시간 10
    expect(s.helpWeight).toBe(48)
    expect(s.percent).toBeCloseTo((48 / 78) * 100, 5)
  })

  it('가중치를 바꾸면 결과가 따라 바뀐다 (조정 가능한 상수)', () => {
    const pillars = [P('hour', 1, 3), P('day', 9, 9), P('month', 6, 10), P('year', 8, 8)]
    const heavyMonth = { ...STRENGTH_CONFIG, weights: { ...STRENGTH_CONFIG.weights, monthBranch: 60 } }
    expect(calculateStrength(9, pillars, heavyMonth).percent).toBeLessThan(48)
  })
})

describe('용신 후보', () => {
  const zero = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }

  it('일간 오행 기준 십성 묶음 → 오행 (갑목: 식상 화, 재성 토, 관성 금, 인성 수)', () => {
    expect(elementOfGroup('wood', '식상')).toBe('fire')
    expect(elementOfGroup('wood', '재성')).toBe('earth')
    expect(elementOfGroup('wood', '관성')).toBe('metal')
    expect(elementOfGroup('wood', '인성')).toBe('water')
    expect(elementOfGroup('wood', '비겁')).toBe('wood')
  })

  it('신강: 식상·재성·관성 후보를 원국에 적은 것부터 정렬', () => {
    const r = analyzeYongshin(0, '신강', 2, { ...zero, wood: 5, fire: 2, earth: 0, metal: 1 })
    expect(r.eokbu.candidates.map((c) => c.group)).toEqual(['재성', '관성', '식상']) // 토0 < 금1 < 화2
  })

  it('신강에서 개수가 같으면 식상·재성·관성 순', () => {
    const r = analyzeYongshin(0, '신강', 2, zero)
    expect(r.eokbu.candidates.map((c) => c.group)).toEqual(['식상', '재성', '관성'])
  })

  it('신약: 인성·비겁 후보', () => {
    const r = analyzeYongshin(0, '신약', 2, { ...zero, wood: 1, water: 0 })
    expect(r.eokbu.candidates.map((c) => c.group)).toEqual(['인성', '비겁'])
    expect(r.eokbu.candidates[0].element).toBe('water')
  })

  it('중화: 억부 후보 없음', () => {
    expect(analyzeYongshin(0, '중화', 2, zero).eokbu.candidates).toEqual([])
  })

  it('조후(간략): 해자축월은 화, 사오미월은 수, 그 밖은 치우침 없음', () => {
    for (const b of [11, 0, 1]) expect(analyzeYongshin(0, '중화', b, zero).johu).toMatchObject({ season: '한(寒)', needed: 'fire' })
    for (const b of [5, 6, 7]) expect(analyzeYongshin(0, '중화', b, zero).johu).toMatchObject({ season: '열(熱)', needed: 'water' })
    for (const b of [2, 3, 4, 8, 9, 10]) expect(analyzeYongshin(0, '중화', b, zero).johu.needed).toBeNull()
  })

  it('조후 필요 오행이 원국에 몇 개 있는지 센다', () => {
    expect(analyzeYongshin(0, '중화', 0, { ...zero, fire: 2 }).johu.count).toBe(2)
  })

  it('억부와 조후가 같은 오행을 가리키면 overlap에 표시', () => {
    // 갑목 신강 + 자월(겨울 → 화 필요), 식상=화
    expect(analyzeYongshin(0, '신강', 0, zero).overlap).toEqual(['fire'])
    expect(analyzeYongshin(0, '신약', 0, zero).overlap).toEqual([])
  })

  it('항상 "후보이며 단정이 아니다"와 간략 조후라는 한계를 알린다', () => {
    const r = analyzeYongshin(0, '신강', 0, zero)
    expect(r.notes.join(' ')).toMatch(/정답이 하나로 정해지지 않/)
    expect(r.notes.join(' ')).toMatch(/간략 판정/)
  })
})

describe('신살', () => {
  it('1992 사주: 천을귀인(일간 계 → 사·묘) 시지 묘, 도화(연지 신 → 유) 일지 유', () => {
    const pillars = [P('hour', 1, 3), P('day', 9, 9), P('month', 6, 10), P('year', 8, 8)]
    const hits = findShinsal(9, pillars)
    expect(hits).toEqual([
      { name: '천을귀인', base: '일간', target: 3, found: ['hour'] },
      { name: '도화', base: '연지', target: 9, found: ['day'] },
    ])
  })

  it('천을귀인 표: 갑·무·경 축미 / 을·기 자신 / 병·정 해유 / 신 인오 / 임·계 사묘', () => {
    const exp: [number, number[]][] = [
      [0, [1, 7]], [4, [1, 7]], [6, [1, 7]], [1, [0, 8]], [5, [0, 8]],
      [2, [11, 9]], [3, [11, 9]], [7, [2, 6]], [8, [5, 3]], [9, [5, 3]],
    ]
    for (const [stem, targets] of exp) {
      // 두 지지를 모두 가진 원국을 만들어 둘 다 발견되는지 본다
      const pillars = [P('hour', 0, targets[0]), P('day', stem, 0), P('month', 0, targets[1]), P('year', 0, 0)]
      const found = findShinsal(stem, pillars).filter((h) => h.name === '천을귀인').map((h) => h.target).sort()
      expect(found, `일간 ${stem}`).toEqual([...targets].sort())
    }
  })

  it('도화·역마·화개: 신자진→유·인·진, 인오술→묘·신·술, 사유축→오·해·축, 해묘미→자·사·미 (일지 기준)', () => {
    const cases: [number, number, number, number][] = [
      [0, 9, 2, 4], // 일지 자: 도화 유, 역마 인, 화개 진
      [6, 3, 8, 10],
      [9, 6, 11, 1],
      [3, 0, 5, 7],
    ]
    for (const [dayBranch, dohwa, yeokma, hwagae] of cases) {
      const pillars = [P('hour', 0, dohwa), P('day', 0, dayBranch), P('month', 0, yeokma), P('year', 0, hwagae)]
      const byName = Object.fromEntries(
        findShinsal(0, pillars).filter((h) => h.base === '일지').map((h) => [h.name, h.target]),
      )
      expect(byName, `일지 ${dayBranch}`).toEqual({ 도화: dohwa, 역마: yeokma, 화개: hwagae })
    }
  })

  it('기준 기둥 자신은 제외한다: 일지가 화개 자리와 같아도 자기 자신은 세지 않는다', () => {
    // 일지 진(신자진 그룹): 화개 = 진 본인. 다른 기둥에 진이 없으면 화개는 없다.
    const pillars = [P('hour', 0, 0), P('day', 0, 4), P('month', 0, 0), P('year', 0, 0)]
    expect(findShinsal(0, pillars).some((h) => h.name === '화개' && h.base === '일지')).toBe(false)
  })
})

describe('analyzeChart 종합', () => {
  const chart = calculateSaju(INPUT_1992)
  const insight = analyzeChart(chart)

  it('1992 사주의 관계·강약·용신·신살이 손풀이와 일치한다', () => {
    expect(insight.relations.map((r) => r.name).sort()).toEqual(['묘술합', '묘유충', '신유술 방합', '유술해', '을경합'].sort())
    expect(insight.strength.label).toBe('중화')
    expect(insight.yongshin.eokbu.candidates).toEqual([])
    expect(insight.yongshin.johu.needed).toBeNull() // 술월
    expect(insight.shinsal.map((s) => s.name)).toEqual(['천을귀인', '도화'])
  })

  it('해석 문구: 일간·강약·십성 구성 섹션이 있고 모두 근거(basis)를 가진다', () => {
    const ids = insight.interpretation.map((s) => s.id)
    expect(ids).toEqual(expect.arrayContaining(['day-master', 'strength', 'groups', 'relations']))
    for (const s of insight.interpretation) {
      expect(s.text.length).toBeGreaterThan(10)
      expect(s.basis.length).toBeGreaterThan(0)
    }
  })

  it('원국에 없는 오행(화)을 알려준다', () => {
    const lacking = insight.interpretation.find((s) => s.id === 'lacking')!
    expect(lacking.title).toContain('화')
    expect(lacking.text).toMatch(/지장간에 숨어 있을 수 있어/)
  })

  it('같은 입력이면 항상 같은 결과 (LLM·난수 없음)', () => {
    expect(analyzeChart(calculateSaju(INPUT_1992))).toEqual(insight)
  })

  it('시간 모름(3주)도 오류 없이 분석된다', () => {
    const r = analyzeChart(calculateSaju({ ...INPUT_1992, time: null }))
    expect(r.strength.totalWeight).toBe(78)
    expect(r.interpretation.length).toBeGreaterThan(0)
  })
})

describe('해석 문구 가드 (임의 사주 600건)', () => {
  // 단정·예언·공포 조장 표현이 들어가면 안 된다
  const FORBIDDEN = ['반드시', '틀림없', '무조건', '운명이 정해', '불행', '재앙', '망한', '대박', '죽', '이혼', '파산', '병에 걸', '평생 가난']

  function rng(seed: number) {
    let a = seed
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('모든 문구가 참고 어조이며 금지 표현이 없고, 분석이 예외 없이 끝난다', () => {
    const r = rng(1111)
    const seen = new Set<string>()
    for (let i = 0; i < 600; i++) {
      const input: BirthInput = {
        calendar: 'solar',
        year: 1930 + Math.floor(r() * 90),
        month: 1 + Math.floor(r() * 12),
        day: 1 + Math.floor(r() * 28),
        time: r() < 0.15 ? null : { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) },
        gender: r() < 0.5 ? 'male' : 'female',
      }
      const insight = analyzeChart(calculateSaju(input))
      for (const s of insight.interpretation) {
        seen.add(s.id)
        for (const word of FORBIDDEN) {
          expect(s.text + s.title, `${JSON.stringify(input)} → ${s.id}`).not.toContain(word)
        }
      }
      expect(insight.strength.percent).toBeGreaterThanOrEqual(0)
      expect(insight.strength.percent).toBeLessThanOrEqual(100)
    }
    // 모든 종류의 섹션이 실제로 만들어지는 사주가 표본에 있었다
    for (const id of ['day-master', 'strength', 'groups', 'lacking', 'heavy', 'relations']) expect(seen.has(id), id).toBe(true)
  })

  it('강약 라벨 3종이 모두 실제로 나온다 (기준값이 한쪽으로 쏠리지 않았는지)', () => {
    const r = rng(2222)
    const counts: Record<string, number> = { 신강: 0, 중화: 0, 신약: 0 }
    for (let i = 0; i < 1500; i++) {
      const c = calculateSaju({
        calendar: 'solar', year: 1930 + Math.floor(r() * 90), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28),
        time: { hour: Math.floor(r() * 24), minute: 0 }, gender: 'male',
      })
      counts[analyzeChart(c).strength.label]++
    }
    for (const label of ['신강', '중화', '신약']) expect(counts[label], label).toBeGreaterThan(100)
  })
})
