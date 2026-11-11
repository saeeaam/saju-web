import { describe, expect, it } from 'vitest'
import {
  BRANCHES,
  HIDDEN_STEMS,
  NAPEUM,
  SHINSAL,
  STEMS,
  TWELVE_STAGES,
  ZIWEI,
} from './index.ts'

describe('천간·지지 기본 데이터', () => {
  it('천간 10개, 지지 12개이고 id가 순서와 일치한다', () => {
    expect(STEMS).toHaveLength(10)
    expect(BRANCHES).toHaveLength(12)
    STEMS.forEach((s, i) => expect(s.id).toBe(i))
    BRANCHES.forEach((b, i) => expect(b.id).toBe(i))
  })

  it('음양이 교대로 배치된다 (짝수 id = 양)', () => {
    STEMS.forEach((s) => expect(s.yinYang).toBe(s.id % 2 === 0 ? 'yang' : 'yin'))
    BRANCHES.forEach((b) => expect(b.yinYang).toBe(b.id % 2 === 0 ? 'yang' : 'yin'))
  })

  it('천간 오행은 2개씩 목화토금수 순서이다', () => {
    const order = ['wood', 'fire', 'earth', 'metal', 'water']
    STEMS.forEach((s) => expect(s.element).toBe(order[Math.floor(s.id / 2)]))
  })

  it('지지 시(時) 시작 시각은 2시간 간격이고 자시는 23시이다', () => {
    expect(BRANCHES[0].hourStart).toBe(23)
    for (let i = 1; i < 12; i++) expect(BRANCHES[i].hourStart).toBe(2 * i - 1)
  })

  it('월지별 절(節) 이름 12개가 중복 없이 존재한다', () => {
    const terms = BRANCHES.map((b) => b.monthTerm)
    expect(new Set(terms).size).toBe(12)
    expect(BRANCHES[2].monthTerm).toBe('입춘')
  })
})

describe('지장간', () => {
  it('12지지 모두 정의되고 천간 id가 유효하다', () => {
    expect(HIDDEN_STEMS).toHaveLength(12)
    for (const stems of HIDDEN_STEMS) {
      expect(stems.length).toBeGreaterThanOrEqual(2)
      expect(stems.length).toBeLessThanOrEqual(3)
      stems.forEach((id) => {
        expect(id).toBeGreaterThanOrEqual(0)
        expect(id).toBeLessThan(10)
      })
    }
  })

  it('정기(마지막)는 지지 자체의 본기와 일치한다', () => {
    // 자 계, 축 기, 인 갑, 묘 을, 진 무, 사 병, 오 정, 미 기, 신 경, 유 신, 술 무, 해 임
    const mainQi = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8]
    HIDDEN_STEMS.forEach((stems, i) => expect(stems[stems.length - 1]).toBe(mainQi[i]))
  })
})

describe('12운성', () => {
  it('천간 10개 모두 장생지와 방향이 정의된다', () => {
    expect(TWELVE_STAGES.stages).toHaveLength(12)
    expect(TWELVE_STAGES.byStem).toHaveLength(10)
    TWELVE_STAGES.byStem.forEach((e, i) => {
      expect(e.stem).toBe(i)
      // 양간 순행, 음간 역행
      expect(e.direction).toBe(STEMS[i].yinYang === 'yang' ? 1 : -1)
    })
  })

  it('갑의 장생은 해, 제왕은 묘이다', () => {
    const { longLifeBranch, direction } = TWELVE_STAGES.byStem[0]
    const branchOf = (stage: number) => (longLifeBranch + direction * stage + 12) % 12
    expect(branchOf(0)).toBe(11) // 장생 해
    expect(branchOf(3)).toBe(2) // 건록 인
    expect(branchOf(4)).toBe(3) // 제왕 묘
  })
})

describe('납음오행', () => {
  it('30개이고 index가 순서와 일치한다', () => {
    expect(NAPEUM).toHaveLength(30)
    NAPEUM.forEach((n, i) => expect(n.index).toBe(i))
  })

  it('이름이 중복되지 않는다', () => {
    expect(new Set(NAPEUM.map((n) => n.ko)).size).toBe(30)
  })

  it('이름 끝 글자가 오행과 일치한다', () => {
    const suffix: Record<string, string> = {
      금: 'metal',
      목: 'wood',
      수: 'water',
      화: 'fire',
      토: 'earth',
    }
    NAPEUM.forEach((n) => expect(suffix[n.ko[n.ko.length - 1]]).toBe(n.element))
  })

  it('알려진 값: 갑자 해중금, 경자 벽상토, 임술 대해수', () => {
    const jiaZi = 0
    const gengZi = 36 // 경자
    const renXu = 58 // 임술
    expect(NAPEUM[Math.floor(jiaZi / 2)].ko).toBe('해중금')
    expect(NAPEUM[Math.floor(gengZi / 2)].ko).toBe('벽상토')
    expect(NAPEUM[Math.floor(renXu / 2)].ko).toBe('대해수')
  })
})

describe('신살', () => {
  it('천을귀인이 천간 10개에 대해 정의된다', () => {
    expect(SHINSAL.cheonEul.byStem).toHaveLength(10)
  })

  it('삼합 그룹 4개가 12지지를 한 번씩 덮는다', () => {
    const all = SHINSAL.triadGroups.flatMap((g) => g.branches).sort((a, b) => a - b)
    expect(all).toEqual([...Array(12).keys()])
  })
})

describe('자미두수 데이터', () => {
  it('12궁, 오행국 5개, 별 27개가 정의된다', () => {
    expect(ZIWEI.palaces).toHaveLength(12)
    expect(Object.keys(ZIWEI.bureauByElement)).toHaveLength(5)
    expect(ZIWEI.stars).toHaveLength(27)
    expect(ZIWEI.stars.filter((s) => s.kind === 'main')).toHaveLength(14)
  })

  it('14주성 오프셋이 6개 + 8개이다', () => {
    const z = Object.keys(ZIWEI.ziweiGroupOffsets).filter((k) => !k.startsWith('_'))
    const t = Object.keys(ZIWEI.tianfuGroupOffsets).filter((k) => !k.startsWith('_'))
    expect(z).toHaveLength(6)
    expect(t).toHaveLength(8)
  })

  it('사화표의 별 id가 모두 별 목록에 존재한다', () => {
    const ids = new Set(ZIWEI.stars.map((s) => s.id))
    expect(ZIWEI.sihuaByStem.table).toHaveLength(10)
    for (const row of ZIWEI.sihuaByStem.table) {
      expect(row).toHaveLength(4)
      row.forEach((id) => expect(ids.has(id)).toBe(true))
    }
  })

  it('록존 위치가 10개이고 경양·타라가 앞뒤 궁이 된다', () => {
    expect(ZIWEI.luCunByStem).toHaveLength(10)
    // 갑 록존 인(2) → 경양 묘(3), 타라 축(1)
    const lu = ZIWEI.luCunByStem[0]
    expect((lu + 1) % 12).toBe(3)
    expect((lu + 11) % 12).toBe(1)
  })

  it('화성·영성 시작 궁: 해년생 사시 → 화성 인, 영성 묘 (문서 검산 예시)', () => {
    const group = ZIWEI.fireBellStart.groups.find((g) => g.branches.includes(11))!
    const hourIdx = 5 // 사시
    expect((group.huoxing + hourIdx) % 12).toBe(2) // 인
    expect((group.lingxing + hourIdx) % 12).toBe(3) // 묘
  })
})
