/**
 * 흐름 풀이: 10년 흐름(대운)·해마다의 흐름(세운)이 "내 사주에 어떻게 작용하는지"를 쉬운 말로 풀어 준다.
 * 계획: docs/261116_흐름 풀이 개편 계획.md
 *
 * 근거 네 가지
 * 1. 들어오는 기운의 생활 의미: 위 글자(겉으로 드러나는 주제)와 아래 글자(바탕)의 십성 묶음
 * 2. 내 사주와의 작용: 기운 세기(나를 돕는 기운인지, 힘을 쓰게 하는 기운인지), 도움 되는 기운·이미 많은 기운·없던 기운
 * 3. 내 사주 자리별 영향: 가까운 자리(일지) = 연애·생활, 태어난 달(월지) = 일·사회, 태어난 해(연지) = 가족, 태어난 시(시지) = 미래 계획
 * 4. 배우자 기운 (전통 해석: 남성은 재물의 기운, 여성은 다스리는 기운)
 *
 * 시기를 단정하지 않는다 ("결혼한다"가 아니라 "~한 일이 생기기 쉬운").
 */
import { HIDDEN_STEMS, STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import { tenGodOfStem } from './analysis.ts'
import type { Group, ReadingFeatures } from './features.ts'
import { ganjiName } from './ganji.ts'
import type { Ganji } from './ganji.ts'
import type { SajuChart } from './index.ts'
import { natalUnits } from './insight.ts'
import { 이가 } from './josa.ts'
import type { BasisItem } from './reading.ts'
import { relationsWithExtra } from './relations.ts'
import type { Relation, UnitId } from './relations.ts'

export type FlowKind = 'decade' | 'year'

export interface FlowReading {
  kind: FlowKind
  ganji: Ganji
  /** 카드에 쓰는 짧은 제목 (예: 내 힘으로 서려는 10년) */
  title: string
  /** 바탕 흐름 (겉과 같으면 null). 카드에서 같은 제목끼리 구분하는 데 쓴다 */
  base: string | null
  /** 풀이 문장들 */
  body: string[]
  /** 이렇게 보내면 좋아요 */
  advice: string
  basis: BasisItem[]
  /** 내 사주 자리별로 맺는 관계 (근거 자세히용) */
  relations: Relation[]
  stemGroup: Group
  branchGroup: Group
}

const ELEMENT_PLAIN: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' }

/** 위 글자 기운이 생활에서 뜻하는 것 (구체적인 예시) */
const LIFE: Record<Group, string> = {
  비겁: '내 힘으로 해내려는 마음, 동료·친구·형제와 함께하거나 경쟁하는 일',
  식상: '하고 싶은 말과 일을 밖으로 펼치는 일, 새로운 시도와 표현',
  재성: '돈을 벌고 관리하는 일, 일의 성과와 현실적인 문제',
  관성: '직장·조직 안에서의 책임, 평가와 승진, 지켜야 할 규칙',
  인성: '공부와 자격 준비, 윗사람이나 가족의 도움, 생각을 정리하는 일',
}

/** 아래 글자(바탕)를 짧게 */
const BASE: Record<Group, string> = {
  비겁: '사람 관계와 독립',
  식상: '표현과 활동',
  재성: '돈과 현실',
  관성: '직장과 책임',
  인성: '배움과 도움',
}

const TITLE: Record<Group, { decade: string; year: string }> = {
  비겁: { decade: '내 힘으로 서려는 10년', year: '사람과 독립의 해' },
  식상: { decade: '펼치고 시도하는 10년', year: '표현과 새로운 시도의 해' },
  재성: { decade: '돈과 성과의 10년', year: '돈과 성과의 해' },
  관성: { decade: '책임과 자리의 10년', year: '책임과 평가의 해' },
  인성: { decade: '배우고 준비하는 10년', year: '배움과 준비의 해' },
}

const ADVICE: Record<Group, string> = {
  비겁: '혼자 다 하려 하기보다 믿을 만한 사람과 역할을 나누세요.',
  식상: '하고 싶은 일을 작게라도 시작해 보되, 마무리까지 챙기세요.',
  재성: '수입·지출 계획을 미리 세우고, 큰돈이 드는 결정은 천천히 하세요.',
  관성: '맡은 일의 우선순위를 정하고, 무리한 약속은 줄이세요.',
  인성: '미뤄 둔 공부나 자격에 도전하기 좋은 때입니다. 준비 기간이 너무 길어지는 것만 조심하세요.',
}

/** 내 사주 자리 → 생활 영역 */
const PLACE: Partial<Record<UnitId, { name: string; combine: string; clash: string }>> = {
  day: {
    name: '나와 가장 가까운 자리',
    combine: '나와 가장 가까운 자리와 어울리는 글자가 들어와, 연인·배우자 등 가까운 사람과의 관계가 안정되기 쉽습니다.',
    clash: '나와 가장 가까운 자리와 부딪히는 글자가 들어와, 이사·생활 습관·가까운 관계에 변화가 생기기 쉽습니다.',
  },
  month: {
    name: '일·사회 자리',
    combine: '일·사회 자리와 어울리는 글자가 들어와, 직장이나 사회생활이 무난하게 흘러가기 쉽습니다.',
    clash: '일·사회 자리와 부딪히는 글자가 들어와, 직장이나 업무 환경에 변화가 생기기 쉽습니다.',
  },
  year: {
    name: '가족·집안 자리',
    combine: '가족·집안 자리와 어울리는 글자가 들어와, 집안일이 순조롭게 풀리기 쉽습니다.',
    clash: '가족·집안 자리와 부딪히는 글자가 들어와, 가족과 관련해 신경 쓸 일이 생기기 쉽습니다.',
  },
  hour: {
    name: '미래 계획 자리',
    combine: '미래 계획 자리와 어울리는 글자가 들어와, 계획한 일이 자리를 잡기 쉽습니다.',
    clash: '미래 계획 자리와 부딪히는 글자가 들어와, 계획을 고치게 되는 일이 생기기 쉽습니다.',
  },
}

const COMBINE = new Set(['sixCombine', 'triad', 'halfTriad', 'direction'])
const CLASH = new Set(['clash'])
const TENSION = new Set(['punish', 'selfPunish', 'break', 'harm'])

const HELPING = new Set<Group>(['비겁', '인성'])

function groupOf(dayStem: number, stem: number): Group {
  return tenGodOfStem(dayStem, stem).group as Group
}

function branchGroupOf(dayStem: number, branch: number): Group {
  const hidden = HIDDEN_STEMS[branch]
  return tenGodOfStem(dayStem, hidden[hidden.length - 1]).group as Group
}

export function buildFlowReading(chart: SajuChart, f: Omit<ReadingFeatures, 'flow'>, ganji: Ganji, kind: FlowKind): FlowReading {
  const unitId: UnitId = kind === 'decade' ? 'daeun' : 'seun'
  const word = kind === 'decade' ? '10년' : '해'
  const stemGroup = groupOf(f.dayStem, ganji.stem)
  const branchGroup = branchGroupOf(f.dayStem, ganji.branch)
  const body: string[] = []

  // 1. 겉으로 드러나는 주제와 바탕
  body.push(`${이가(LIFE[stemGroup])} 중심이 되기 쉬운 ${word}입니다.`)
  body.push(
    stemGroup === branchGroup
      ? '겉과 바탕이 같은 흐름이라 그 성격이 뚜렷하게 나타나기 쉽습니다.'
      : `바탕에는 '${BASE[branchGroup]}'의 흐름이 깔려 있습니다.`,
  )

  // 2. 내 사주와의 작용: 기운 세기
  const helps = HELPING.has(stemGroup)
  if (helps) {
    body.push(
      {
        신약: '기운이 약한 내 사주에 힘이 실려, 자신감이 붙고 하고 싶던 일을 밀어붙이기 좋은 때로 봅니다.',
        신강: '이미 기운이 강한 내 사주에 힘이 더해져, 고집이 세지거나 혼자 떠안기 쉬우니 속도 조절이 필요합니다.',
        중화: '균형인 내 사주에 힘이 더해져 자신감이 붙기 쉬운 때로 봅니다.',
      }[f.strength],
    )
  } else {
    body.push(
      {
        신강: '기운이 강한 내 사주가 힘을 쓸 곳을 만나, 노력이 결과로 이어지기 쉬운 때로 봅니다.',
        신약: '할 일과 요구가 늘어 지치기 쉬운 때라, 혼자 감당하기보다 도움을 받는 것이 좋습니다.',
        중화: '할 일이 느는 만큼 결과로 이어지기 쉬운 때로 봅니다.',
      }[f.strength],
    )
  }

  // 2-2. 들어오는 오행: 도움 되는 기운 / 이미 많은 기운 / 없던 기운 (하나만)
  const el = STEMS[ganji.stem].element
  const helpful = [f.helpful.eokbu, f.helpful.johu].includes(el)
  if (helpful) body.push(`나에게 도움이 되는 ${ELEMENT_PLAIN[el]} 기운이 들어와 전반적으로 순조롭게 느껴지기 쉽습니다.`)
  else if (f.heavy.includes(el)) body.push(`내 사주에 이미 많은 ${ELEMENT_PLAIN[el]} 기운이 더해져, 그 성향이 지나치지 않게 조심하면 좋습니다.`)
  else if (f.lacking.includes(el)) body.push(`내 사주에 없던 ${ELEMENT_PLAIN[el]} 기운이 들어와 평소와 다른 면을 경험하기 쉽습니다.`)

  // 3. 내 사주 자리별 영향 (가까운 자리 → 일·사회 → 가족 → 미래 계획 순, 최대 2개)
  const natal = natalUnits(chart)
  const relations = relationsWithExtra(natal, [{ id: unitId, stem: ganji.stem, branch: ganji.branch }])
  const placeLines: string[] = []
  for (const place of ['day', 'month', 'year', 'hour'] as UnitId[]) {
    const info = PLACE[place]
    if (!info || !natal.some((u) => u.id === place)) continue
    const here = relations.filter((r) => r.members.some((m) => m.unit === place && m.part === 'branch') && r.members.some((m) => m.unit === unitId && m.part === 'branch'))
    if (here.some((r) => CLASH.has(r.kind))) placeLines.push(info.clash)
    else if (here.some((r) => COMBINE.has(r.kind))) placeLines.push(info.combine)
    else if (place === 'day' && here.some((r) => TENSION.has(r.kind))) placeLines.push('가까운 사람과 사소한 오해가 생기기 쉬우니 대화를 자주 하면 좋습니다.')
  }
  body.push(...placeLines.slice(0, 2))

  // 3-2. 나를 뜻하는 글자와의 관계
  const dayStemRel = relations.filter((r) => r.members.some((m) => m.unit === 'day' && m.part === 'stem') && r.members.some((m) => m.unit === unitId && m.part === 'stem'))
  if (dayStemRel.some((r) => r.kind === 'stemCombine')) body.push('마음이 끌리는 일이나 사람이 생기기 쉽습니다.')
  if (dayStemRel.some((r) => r.kind === 'stemClash')) body.push('내 생각과 다른 요구가 들어오기 쉬워, 고집보다 조율이 도움이 됩니다.')

  // 4. 배우자 기운
  if (stemGroup === f.spouse.group || branchGroup === f.spouse.group) {
    body.push(
      f.gender === 'male'
        ? `전통 해석에서 남성에게 재물의 기운은 배우자를 뜻해, 연애·결혼과 관련된 일이 생기기 쉬운 ${word}이기도 합니다.`
        : `전통 해석에서 여성에게 다스리는 기운은 배우자를 뜻해, 연애·결혼과 관련된 일이 생기기 쉬운 ${word}이기도 합니다.`,
    )
  }

  const basis: BasisItem[] = [
    { plain: `들어오는 글자: ${ganjiName(ganji)}`, term: kind === 'decade' ? '대운' : '세운' },
    { plain: `겉으로 드러나는 기운: ${LIFE_SHORT[stemGroup]} / 바탕의 기운: ${LIFE_SHORT[branchGroup]}`, term: `${stemGroup} / ${branchGroup}` },
    { plain: `내 기운의 세기: ${{ 신강: '강한 편', 신약: '약한 편', 중화: '균형' }[f.strength]}`, term: f.strength },
  ]

  return {
    kind,
    ganji,
    title: TITLE[stemGroup][kind],
    base: stemGroup === branchGroup ? null : BASE[branchGroup],
    body,
    advice: ADVICE[stemGroup],
    basis,
    relations: relations.filter((r) => r.members.some((m) => m.unit === unitId)),
    stemGroup,
    branchGroup,
  }
}

const LIFE_SHORT: Record<Group, string> = {
  비겁: '나와 같은 기운',
  식상: '표현하는 기운',
  재성: '재물의 기운',
  관성: '다스리는 기운',
  인성: '돕는 기운',
}
