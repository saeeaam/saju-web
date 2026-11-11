/**
 * 용신 "후보". 용신은 학파마다 다르게 잡으므로 하나를 단정하지 않고 방식별로 따로 보여준다.
 * 규칙: docs/261110_명리학 해석 체계.md 6절.
 *
 * - 억부: 신강이면 덜어내는 쪽(식상·재성·관성), 신약이면 돕는 쪽(인성·비겁). 원국에 부족한 것을 앞에 둔다.
 * - 조후(간략): 궁통보감의 일간×월지 표가 아니라 "계절(월지)의 한난"만 반영한다.
 *   겨울(해·자·축)은 화, 여름(사·오·미)은 수가 필요하다고 본다. 봄·가을은 치우침 없음.
 *   궁통보감 표 자체는 검증된 자료를 확보하지 못해 구현하지 않았다.
 * - 통관·병약·격국용신은 구현하지 않았다.
 */
import type { Element } from '../types/basic.ts'
import { STEMS } from '../data/index.ts'
import { mod } from './ganji.ts'
import type { StrengthLabel } from './strength.ts'

const ORDER: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']

/** 일간 오행 기준 십성 묶음 → 해당 오행 */
export function elementOfGroup(dayElement: Element, group: '비겁' | '식상' | '재성' | '관성' | '인성'): Element {
  const e = ORDER.indexOf(dayElement)
  const offset = { 비겁: 0, 식상: 1, 재성: 2, 관성: 3, 인성: 4 }[group]
  return ORDER[mod(e + offset, 5)]
}

export interface EokbuCandidate {
  group: '비겁' | '식상' | '재성' | '관성' | '인성'
  element: Element
  /** 원국 천간·지지(8자 기준)에서 그 오행의 개수 */
  count: number
}

export interface JohuResult {
  season: '한(寒)' | '열(熱)' | '치우침 없음'
  /** 필요하다고 보는 오행. 치우침 없음이면 null */
  needed: Element | null
  /** 그 오행이 원국에 몇 개 있는가 */
  count: number
}

export interface YongshinResult {
  eokbu: {
    label: StrengthLabel
    candidates: EokbuCandidate[]
    note: string
  }
  johu: JohuResult
  /** 억부와 조후 후보에 모두 오르는 오행 */
  overlap: Element[]
  notes: string[]
}

const STRONG_GROUPS = ['식상', '재성', '관성'] as const
const WEAK_GROUPS = ['인성', '비겁'] as const

export function analyzeYongshin(
  dayStem: number,
  label: StrengthLabel,
  monthBranch: number,
  elementTotals: Record<Element, number>,
): YongshinResult {
  const dayElement = STEMS[dayStem].element

  let candidates: EokbuCandidate[] = []
  let note = ''
  if (label === '중화') {
    note = '돕는 기운과 누르는 기운이 균형에 가까워 억부로 특별히 보강할 방향이 뚜렷하지 않습니다.'
  } else {
    const groups = label === '신강' ? STRONG_GROUPS : WEAK_GROUPS
    candidates = groups
      .map((group, order) => {
        const element = elementOfGroup(dayElement, group)
        return { group, element, count: elementTotals[element], order }
      })
      .sort((a, b) => a.count - b.count || a.order - b.order)
      .map(({ group, element, count }) => ({ group, element, count }))
    note =
      label === '신강'
        ? '일간을 돕는 기운이 많은 편이라 덜어내는 쪽(식상·재성·관성)을 후보로 보고, 원국에 적은 것을 앞에 둡니다.'
        : '일간을 누르는 기운이 많은 편이라 돕는 쪽(인성·비겁)을 후보로 보고, 원국에 적은 것을 앞에 둡니다.'
  }

  let johu: JohuResult
  if ([11, 0, 1].includes(monthBranch)) {
    johu = { season: '한(寒)', needed: 'fire', count: elementTotals.fire }
  } else if ([5, 6, 7].includes(monthBranch)) {
    johu = { season: '열(熱)', needed: 'water', count: elementTotals.water }
  } else {
    johu = { season: '치우침 없음', needed: null, count: 0 }
  }

  const eokbuElements = candidates.map((c) => c.element)
  const overlap = johu.needed && eokbuElements.includes(johu.needed) ? [johu.needed] : []

  return {
    eokbu: { label, candidates, note },
    johu,
    overlap,
    notes: [
      '용신은 학파마다 다르게 잡으며 정답이 하나로 정해지지 않습니다. 아래는 방식별 후보입니다.',
      '조후는 계절만 반영한 간략 판정이며, 궁통보감의 일간×월지 표를 쓴 것이 아닙니다.',
      '통관용신·병약용신·격국용신은 계산하지 않았습니다.',
    ],
  }
}
