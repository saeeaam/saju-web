/**
 * 규칙 기반 해석 문구. 계산된 사실(근거)과 전통 해석(의견)을 분리해서 보여준다.
 *
 * 문구 원칙 (docs/261110_명리학 해석 체계.md 10절):
 * - "~로 봅니다", "~한 경향" 같은 참고 어조. 단정·예언·길흉 판정을 하지 않는다.
 * - 건강·재정·법률·투자 조언을 하지 않는다.
 * - 같은 요소라도 조건(신강약, 오행 분포)에 따라 달라지므로 조건 결합형으로 만든다.
 * - LLM을 쓰지 않는다. 같은 입력이면 항상 같은 문장이 나온다.
 */
import { STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import { ELEMENT_NAME } from './names.ts'
import type { StrengthResult } from './strength.ts'

export interface InterpretationSection {
  id: string
  title: string
  text: string
  /** 이 문장이 어떤 계산 결과에 근거하는지 */
  basis: string
}

const DAY_MASTER_TEXT: string[] = [
  '곧게 뻗는 큰 나무에 비유됩니다. 추진력과 자존심, 성장을 향한 지향이 강조되는 경향으로 봅니다.',
  '유연한 풀이나 덩굴에 비유됩니다. 적응력과 조화를 중시하며 부드럽게 길을 찾는 경향으로 봅니다.',
  '태양에 비유됩니다. 밝고 외향적이며 드러내고 베푸는 면이 강조되는 경향으로 봅니다.',
  '촛불이나 등불에 비유됩니다. 섬세하고 따뜻하며 한곳에 집중하는 면이 강조되는 경향으로 봅니다.',
  '큰 산에 비유됩니다. 듬직하고 포용력이 있으나 변화에는 신중한 편이라고 봅니다.',
  '논밭의 흙에 비유됩니다. 현실적이고 꼼꼼하며 사람을 품어 기르는 면이 강조되는 경향으로 봅니다.',
  '바위나 쇠에 비유됩니다. 결단력과 의리, 원칙을 중시하는 면이 강조되는 경향으로 봅니다.',
  '보석이나 칼날에 비유됩니다. 예민하고 깔끔하며 완성도를 추구하는 면이 강조되는 경향으로 봅니다.',
  '큰 강이나 바다에 비유됩니다. 포용력과 융통성, 흐름을 읽는 면이 강조되는 경향으로 봅니다.',
  '비나 이슬에 비유됩니다. 감수성과 직관이 있고 스며들듯 적응하는 면이 강조되는 경향으로 봅니다.',
]

const STRENGTH_TEXT: Record<StrengthResult['label'], string> = {
  신강: '일간을 돕는 기운(비겁·인성)이 많은 편이라, 자기 주관이 뚜렷하고 에너지가 충분한 대신 고집이 강해지거나 힘을 쓸 곳이 필요한 경향으로 봅니다.',
  신약: '일간을 누르는 기운(식상·재성·관성)이 상대적으로 많은 편이라, 주변 환경의 영향을 많이 받고 기운을 보충하는 것(인성·비겁)이 도움이 된다고 봅니다.',
  중화: '일간을 돕는 기운과 누르는 기운이 비교적 균형에 가깝다고 봅니다. 다만 강약 판정은 기준에 따라 달라질 수 있습니다.',
}

const GROUP_TEXT: Record<string, string> = {
  비겁: '자기 자신, 동료, 경쟁이라는 주제가 두드러지는 구성입니다.',
  식상: '표현, 재능, 활동이라는 주제가 두드러지는 구성입니다.',
  재성: '재물, 현실, 실리라는 주제가 두드러지는 구성입니다.',
  관성: '직장, 규칙, 책임이라는 주제가 두드러지는 구성입니다.',
  인성: '학문, 보호, 사색이라는 주제가 두드러지는 구성입니다.',
}

const ELEMENT_LACK_TEXT: Record<Element, string> = {
  wood: '성장·시작·계획과 관련된 주제',
  fire: '표현·열정·관계의 온기와 관련된 주제',
  earth: '안정·중심·신뢰와 관련된 주제',
  metal: '결단·정리·원칙과 관련된 주제',
  water: '지혜·유연성·휴식과 관련된 주제',
}

export interface InterpretInput {
  dayStem: number
  strength: StrengthResult
  /** 오행별 개수 (천간·지지 기준) */
  elementTotals: Record<Element, number>
  /** 천간·지지 글자 수 (8 또는 6) */
  charCount: number
  /** 일간을 제외한 십성 묶음별 개수 */
  groupCounts: Record<string, number>
  /** 원국 안 관계 개수 */
  relationCounts: { combine: number; clash: number; other: number }
}

export function buildInterpretation(i: InterpretInput): InterpretationSection[] {
  const out: InterpretationSection[] = []
  const stem = STEMS[i.dayStem]

  out.push({
    id: 'day-master',
    title: `일간 ${stem.ko}${ELEMENT_NAME[stem.element].ko}`,
    text: `일간 ${stem.ko}(${stem.hanja})은 ${DAY_MASTER_TEXT[i.dayStem]}`,
    basis: `일주의 천간 = ${stem.ko}`,
  })

  out.push({
    id: 'strength',
    title: `일간의 강약: ${i.strength.label}`,
    text: STRENGTH_TEXT[i.strength.label],
    basis: `돕는 기운 ${i.strength.percent.toFixed(0)}% (득령 ${i.strength.deukryeong ? '○' : '×'}, 득지 ${i.strength.deukji ? '○' : '×'}, 득세 ${i.strength.deukse ? '○' : '×'})`,
  })

  const entries = Object.entries(i.groupCounts).sort((a, b) => b[1] - a[1])
  const top = entries[0]
  if (top && top[1] > 0) {
    const tied = entries.filter(([, n]) => n === top[1])
    const names = tied.map(([g]) => g).join('·')
    out.push({
      id: 'groups',
      title: `십성 구성: ${names}이 많음`,
      text: tied.length > 1 ? `${names}이 비슷하게 두드러집니다. ${GROUP_TEXT[tied[0][0]]}` : GROUP_TEXT[top[0]],
      basis: entries.map(([g, n]) => `${g} ${n}`).join(', '),
    })
  }

  const lacking = (Object.keys(i.elementTotals) as Element[]).filter((e) => i.elementTotals[e] === 0)
  if (lacking.length) {
    out.push({
      id: 'lacking',
      title: `원국에 없는 오행: ${lacking.map((e) => ELEMENT_NAME[e].ko).join('·')}`,
      text: `${lacking.map((e) => `${ELEMENT_NAME[e].ko}(${ELEMENT_NAME[e].hanja}): ${ELEMENT_LACK_TEXT[e]}`).join(' / ')}은(는) 원국의 글자에는 드러나지 않아, 운이나 환경을 통해 채워지는 부분으로 본다는 해석이 있습니다. 지장간에 숨어 있을 수 있어 "없다"를 절대적으로 보지는 않습니다.`,
      basis: `천간·지지 ${i.charCount}글자의 오행 개수`,
    })
  }

  const heavy = (Object.keys(i.elementTotals) as Element[]).filter((e) => i.elementTotals[e] >= Math.ceil(i.charCount / 2))
  if (heavy.length) {
    out.push({
      id: 'heavy',
      title: `한쪽으로 쏠린 오행: ${heavy.map((e) => ELEMENT_NAME[e].ko).join('·')}`,
      text: `${heavy.map((e) => ELEMENT_NAME[e].ko).join('·')} 기운이 원국의 절반 이상을 차지합니다. 전통 해석에서는 그 오행의 성향이 강하게 나타나는 한편 균형을 맞추는 일이 과제가 된다고 봅니다.`,
      basis: `${heavy.map((e) => `${ELEMENT_NAME[e].ko} ${i.elementTotals[e]}개`).join(', ')} / ${i.charCount}글자`,
    })
  }

  const { combine, clash, other } = i.relationCounts
  if (combine + clash + other > 0) {
    out.push({
      id: 'relations',
      title: '글자 사이의 관계',
      text: '합은 글자들이 묶이는 관계, 충은 부딪히는 관계로 봅니다. 원국에서 가까운(인접한) 기둥끼리의 관계를 더 크게 보는 견해가 있고, 합이 실제로 다른 오행으로 변하는지(합화)는 조건이 복잡해 판정하지 않았습니다.',
      basis: `합 ${combine}, 충 ${clash}, 그 밖의 형·파·해 ${other}`,
    })
  }

  return out
}
