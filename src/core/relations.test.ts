import { describe, expect, it } from 'vitest'
import { findRelations, natalRelations, relationsWithExtra } from './relations.ts'
import type { Unit } from './relations.ts'

// 천간: 갑0 을1 병2 정3 무4 기5 경6 신7 임8 계9 / 지지: 자0 축1 인2 묘3 진4 사5 오6 미7 신8 유9 술10 해11
const U = (id: Unit['id'], stem: number, branch: number): Unit => ({ id, stem, branch })

/** 1992-10-24 05:30 = 임신 경술 계유 을묘 (시·일·월·연 순) */
const NATAL_1992: Unit[] = [U('hour', 1, 3), U('day', 9, 9), U('month', 6, 10), U('year', 8, 8)]

const names = (rs: { name: string }[]) => rs.map((r) => r.name).sort()

describe('손으로 푼 사주: 임신 경술 계유 을묘', () => {
  // 손풀이:
  //  천간 을(시)·경(월): 을경합(금) — 시와 월은 일을 사이에 두므로 인접 아님
  //  지지 묘(시)·유(일): 묘유충 — 인접
  //  지지 묘(시)·술(월): 묘술합(화) — 비인접
  //  지지 유(일)·술(월): 유술해 — 인접
  //  지지 신(연)·유(일)·술(월): 신유술 방합(금) — 연·월·일이 이웃한 세 기둥이라 인접
  const rs = natalRelations(NATAL_1992)

  it('관계 이름 전체가 손풀이와 일치한다', () => {
    expect(names(rs)).toEqual(['묘술합', '묘유충', '신유술 방합', '유술해', '을경합'].sort())
  })

  it('인접 여부: 묘유충·유술해·방합은 인접, 을경합·묘술합은 비인접', () => {
    const adj = Object.fromEntries(rs.map((r) => [r.name, r.adjacent]))
    expect(adj['묘유충']).toBe(true)
    expect(adj['유술해']).toBe(true)
    expect(adj['신유술 방합']).toBe(true)
    expect(adj['을경합']).toBe(false)
    expect(adj['묘술합']).toBe(false)
  })

  it('합이 가리키는 오행: 을경합 금, 묘술합 화, 방합 금', () => {
    const el = Object.fromEntries(rs.map((r) => [r.name, r.element]))
    expect(el['을경합']).toBe('metal')
    expect(el['묘술합']).toBe('fire')
    expect(el['신유술 방합']).toBe('metal')
  })

  it('구성원은 기둥과 천간/지지를 가리킨다', () => {
    const r = rs.find((x) => x.name === '을경합')!
    expect(r.members).toEqual([
      { unit: 'hour', part: 'stem' },
      { unit: 'month', part: 'stem' },
    ])
  })
})

describe('천간 관계', () => {
  it('5합: 갑기 을경 병신 정임 무계', () => {
    const pairs: [number, number, string][] = [[0, 5, 'earth'], [1, 6, 'metal'], [2, 7, 'water'], [3, 8, 'wood'], [4, 9, 'fire']]
    for (const [a, b, el] of pairs) {
      const r = findRelations([U('year', a, 0), U('month', b, 0)]).filter((x) => x.kind === 'stemCombine')
      expect(r).toHaveLength(1)
      expect(r[0].element).toBe(el)
    }
  })

  it('4충: 갑경 을신 병임 정계, 무기는 충이 없다', () => {
    for (const [a, b] of [[0, 6], [1, 7], [2, 8], [3, 9]]) {
      expect(findRelations([U('year', a, 0), U('month', b, 0)]).some((x) => x.kind === 'stemClash')).toBe(true)
    }
    expect(findRelations([U('year', 4, 0), U('month', 5, 0)]).some((x) => x.kind === 'stemClash')).toBe(false)
  })

  it('같은 기둥의 천간과 지지끼리는 관계를 보지 않는다', () => {
    // 한 기둥만 있으면 아무 관계도 없다
    expect(findRelations([U('day', 0, 6)])).toEqual([])
  })
})

describe('지지 2자 관계', () => {
  const one = (a: number, b: number) => findRelations([U('year', 0, a), U('month', 1, b)])

  it('6충', () => {
    for (const [a, b] of [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]) {
      expect(one(a, b).some((r) => r.kind === 'clash')).toBe(true)
    }
  })

  it('6합: 자축 인해 묘술 진유 사신 오미', () => {
    for (const [a, b] of [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]) {
      expect(one(a, b).some((r) => r.kind === 'sixCombine')).toBe(true)
    }
  })

  it('오미합은 오행을 정하지 않는다 (화/토 양설)', () => {
    expect(one(6, 7).find((r) => r.kind === 'sixCombine')!.element).toBeNull()
  })

  it('파: 자유 축진 인해 묘오 사신 미술', () => {
    for (const [a, b] of [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10]]) {
      expect(one(a, b).some((r) => r.kind === 'break')).toBe(true)
    }
  })

  it('해: 자미 축오 인사 묘진 신해 유술', () => {
    for (const [a, b] of [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]]) {
      expect(one(a, b).some((r) => r.kind === 'harm')).toBe(true)
    }
  })

  it('한 쌍이 여러 관계를 겸할 수 있다: 인신은 충, 사신은 합이면서 파·형, 인해는 합이면서 파', () => {
    expect(names(one(2, 8)).filter((n) => ['인신충', '인신형'].includes(n))).toEqual(['인신충', '인신형'])
    expect(names(one(5, 8))).toEqual(expect.arrayContaining(['사신합', '사신파', '사신형']))
    expect(names(one(2, 11))).toEqual(expect.arrayContaining(['인해합', '인해파']))
  })

  it('자묘형은 무례지형, 자형은 진·오·유·해 두 글자일 때만', () => {
    expect(one(0, 3).find((r) => r.kind === 'punish')!.note).toBe('무례지형')
    for (const b of [4, 6, 9, 11]) expect(one(b, b).some((r) => r.kind === 'selfPunish')).toBe(true)
    for (const b of [0, 1, 2, 3, 5, 7, 8, 10]) expect(one(b, b).some((r) => r.kind === 'selfPunish')).toBe(false)
  })

  it('같은 지지 두 개는 충이 되지 않는다', () => {
    expect(one(6, 6).some((r) => r.kind === 'clash')).toBe(false)
  })
})

describe('3자 관계', () => {
  const three = (a: number, b: number, c: number) =>
    findRelations([U('year', 0, a), U('month', 1, b), U('day', 2, c)])

  it('삼합: 신자진(수) 해묘미(목) 인오술(화) 사유축(금)', () => {
    const cases: [number[], string][] = [[[8, 0, 4], 'water'], [[11, 3, 7], 'wood'], [[2, 6, 10], 'fire'], [[5, 9, 1], 'metal']]
    for (const [b, el] of cases) {
      const t = three(b[0], b[1], b[2]).filter((r) => r.kind === 'triad')
      expect(t).toHaveLength(1)
      expect(t[0].element).toBe(el)
    }
  })

  it('삼합이 완성되면 반합은 따로 내지 않는다', () => {
    expect(three(8, 0, 4).some((r) => r.kind === 'halfTriad')).toBe(false)
  })

  it('반합은 왕지(자·묘·오·유)를 포함한 두 글자일 때만: 신자·자진 O, 신진 X', () => {
    const two = (a: number, b: number) => findRelations([U('year', 0, a), U('month', 1, b)])
    expect(two(8, 0).some((r) => r.kind === 'halfTriad')).toBe(true)
    expect(two(0, 4).some((r) => r.kind === 'halfTriad')).toBe(true)
    expect(two(8, 4).some((r) => r.kind === 'halfTriad')).toBe(false)
  })

  it('방합은 세 글자가 모두 있을 때만: 인묘진 O, 인묘 X', () => {
    expect(three(2, 3, 4).some((r) => r.kind === 'direction')).toBe(true)
    expect(findRelations([U('year', 0, 2), U('month', 1, 3)]).some((r) => r.kind === 'direction')).toBe(false)
  })

  it('삼형: 인사신이 모두 있으면 하나의 삼형, 두 글자면 부분 형', () => {
    const full = three(2, 5, 8).filter((r) => r.kind === 'punish' && r.name.includes('삼형'))
    expect(full).toHaveLength(1)
    expect(full[0].note).toBe('무은지형')
    const partial = findRelations([U('year', 0, 2), U('month', 1, 5)]).filter((r) => r.kind === 'punish')
    expect(partial).toHaveLength(1)
    expect(partial[0].note).toMatch(/일부/)
  })

  it('축술미 삼형', () => {
    expect(three(1, 10, 7).some((r) => r.kind === 'punish' && r.name.includes('삼형'))).toBe(true)
  })
})

describe('인접 판정', () => {
  it('시·일·월·연 순서에서 이웃한 기둥만 인접', () => {
    const at = (a: Unit['id'], b: Unit['id']) =>
      findRelations([U(a, 0, 0), U(b, 1, 6)]).find((r) => r.kind === 'clash')!.adjacent
    expect(at('hour', 'day')).toBe(true)
    expect(at('day', 'month')).toBe(true)
    expect(at('month', 'year')).toBe(true)
    expect(at('hour', 'month')).toBe(false)
    expect(at('day', 'year')).toBe(false)
    expect(at('hour', 'year')).toBe(false)
  })

  it('대운·세운이 낀 관계는 인접 여부를 따지지 않는다 (null)', () => {
    const r = findRelations([U('seun', 0, 0), U('day', 1, 6)]).find((x) => x.kind === 'clash')!
    expect(r.adjacent).toBeNull()
  })
})

describe('원국 × 대운·세운', () => {
  it('세운 진(辰)이 원국 신·자와 만나면 삼합 완성, 세운이 구성원으로 들어간다', () => {
    const natal = [U('year', 8, 8), U('month', 0, 0)] // 신, 자
    const r = relationsWithExtra(natal, [U('seun', 4, 4)])
    const triad = r.find((x) => x.kind === 'triad')!
    expect(triad.name).toBe('신자진 삼합')
    expect(triad.members.some((m) => m.unit === 'seun')).toBe(true)
  })

  it('추가 글자가 관여하지 않는 원국 내부 관계는 걸러진다', () => {
    const r = relationsWithExtra(NATAL_1992, [U('seun', 0, 0)]) // 갑자
    expect(r.every((x) => x.members.some((m) => m.unit === 'seun'))).toBe(true)
    expect(names(r)).not.toContain('묘유충')
  })

  it('1992 원국 × 2026 병오: 오(午)가 묘와 파, 신 ·술과 삼합 불성립 등 손풀이', () => {
    // 병오: 천간 병(2)·지지 오(6). 원국 천간: 을 계 경 임. 병임충(월/연의 임), 병과 합 짝 신(7)은 원국에 없음.
    // 지지 오: 묘와 파(묘오파), 술과 반합 아님(왕지 오+술은 인오술의 일부 → 반합 오술), 신과 해 없음.
    const r = names(relationsWithExtra(NATAL_1992, [U('seun', 2, 6)]))
    expect(r).toEqual(expect.arrayContaining(['병임충', '묘오파', '오술 반합']))
    expect(r).not.toContain('오묘충')
  })
})
