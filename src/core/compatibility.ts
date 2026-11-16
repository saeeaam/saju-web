/**
 * 궁합 (두 사람). 점수나 "궁합이 나쁘다" 같은 판정을 하지 않고, 잘 맞는 점과 맞춰 갈 점, 근거만 보여준다.
 * 이미 검증한 계산(일간 오행·관계 탐색·오행 분포·강약)을 조합하며, 새로 계산하는 값은 없다.
 *
 * 보는 것:
 * 1. 두 사람을 뜻하는 글자(일간)의 관계: 천간합·천간충, 오행의 생극(누가 돕고 누가 이끄는지)
 * 2. 배우자 자리(일지)끼리의 관계: 어울림·부딪힘·긴장, 같은 글자
 * 3. 부족한 기운 채워 주기: 한쪽에 없는 오행이 다른 쪽에 있는지
 * 4. 배우자 기운: 전통 해석은 남녀 기준(남성은 내가 다스리는 오행, 여성은 나를 다스리는 오행)이라 성별이 다를 때만 본다
 * 5. 띠(입춘 기준 연지)의 어울림·부딪힘: 비중이 작다고 함께 밝힌다
 * 6. 기운 세기의 조합
 */
import { BRANCHES, STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import { mod } from './ganji.ts'
import type { SajuChart } from './index.ts'
import { analyzeChart } from './insight.ts'
import { 과와 } from './josa.ts'
import type { BasisItem, Line } from './reading.ts'
import { findRelations } from './relations.ts'
import type { Relation } from './relations.ts'
import type { StrengthLabel } from './strength.ts'

const ORDER: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
const ELEMENT_PLAIN: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' }
const ELEMENT_TRAIT: Record<Element, string> = {
  wood: '성장과 시작',
  fire: '표현과 열정',
  earth: '안정과 신뢰',
  metal: '결단과 원칙',
  water: '지혜와 유연함',
}
const STRENGTH_PLAIN: Record<StrengthLabel, string> = { 신강: '강한 편', 신약: '약한 편', 중화: '균형' }

const COMBINE = new Set(['sixCombine', 'triad', 'halfTriad', 'direction'])
const TENSION = new Set(['punish', 'selfPunish', 'break', 'harm'])

export interface CompatibilityReading {
  summary: string
  strengths: Line[]
  adjustments: Line[]
  basis: BasisItem[]
  note: string
}

interface Person {
  chart: SajuChart
  dayStem: number
  dayBranch: number
  yearBranch: number
  element: Element
  strength: StrengthLabel
  totals: Record<Element, number>
}

function person(chart: SajuChart): Person {
  const day = chart.pillars.find((p) => p.key === 'day')!.ganji
  const year = chart.pillars.find((p) => p.key === 'year')!.ganji
  return {
    chart,
    dayStem: day.stem,
    dayBranch: day.branch,
    yearBranch: year.branch,
    element: STEMS[day.stem].element,
    strength: analyzeChart(chart).strength.label,
    totals: chart.elements.total,
  }
}

/** 두 글자(위 글자 또는 아래 글자) 사이의 관계. 관계 탐색 모듈을 그대로 쓴다 */
function between(a: { stem: number; branch: number }, b: { stem: number; branch: number }): Relation[] {
  // 위치 이름은 관계 탐색에만 쓰는 자리표시이며 인접 판정은 하지 않는다
  return findRelations([
    { id: 'daeun', stem: a.stem, branch: a.branch },
    { id: 'seun', stem: b.stem, branch: b.branch },
  ])
}

/** 일간 오행 관계: 0 같음, 1 내가 상대를 생함, 2 내가 상대를 극함, 3 상대가 나를 극함, 4 상대가 나를 생함 */
function elementRelation(me: Element, other: Element): number {
  return mod(ORDER.indexOf(other) - ORDER.indexOf(me), 5)
}

/** 전통 해석의 배우자 기운: 남성은 내가 다스리는 오행, 여성은 나를 다스리는 오행 */
function spouseElement(p: Person): Element {
  const e = ORDER.indexOf(p.element)
  return ORDER[mod(e + (p.chart.input.gender === 'male' ? 2 : 3), 5)]
}

export function buildCompatibility(meChart: SajuChart, partnerChart: SajuChart): CompatibilityReading {
  const me = person(meChart)
  const them = person(partnerChart)
  const strengths: Line[] = []
  const adjustments: Line[] = []

  // 1. 두 사람을 뜻하는 글자
  const stemRels = between({ stem: me.dayStem, branch: me.dayBranch }, { stem: them.dayStem, branch: them.dayBranch })
  const stemCombine = stemRels.some((r) => r.kind === 'stemCombine')
  const stemClash = stemRels.some((r) => r.kind === 'stemClash')
  if (stemCombine) strengths.push({ id: 'cp-stem-combine', text: '두 사람을 뜻하는 글자가 서로 끌려 묶이는 사이로, 전통적으로 인연이 깊다고 보는 조합입니다.' })
  if (stemClash) adjustments.push({ id: 'cp-stem-clash', text: '두 사람을 뜻하는 글자가 서로 부딪혀 생각의 방향이 달라지기 쉬우니, 중요한 일은 함께 정하는 규칙을 두면 좋습니다.' })

  const rel = elementRelation(me.element, them.element)
  const REL: Record<number, { s: Line; a?: Line }> = {
    0: { s: { id: 'cp-same', text: `두 사람 모두 ${ELEMENT_PLAIN[me.element]} 기운이 중심이라 생각과 성향이 비슷한 친구 같은 관계로 봅니다.` } },
    1: {
      s: { id: 'cp-i-give', text: '내가 상대를 챙기고 북돋아 주는 관계로 봅니다.' },
      a: { id: 'cp-i-tired', text: '내가 주는 쪽으로 치우치면 지칠 수 있어, 바라는 것을 말로 표현하는 것이 좋습니다.' },
    },
    2: {
      s: { id: 'cp-i-lead', text: '내가 이끌고 상대가 따라오는 흐름이 생기기 쉽습니다.' },
      a: { id: 'cp-i-press', text: '내 방식이 상대에게 부담이 되지 않게 속도를 맞추면 좋습니다.' },
    },
    3: {
      s: { id: 'cp-they-lead', text: '상대가 이끌어 주고 내가 기대는 흐름이 생기기 쉽습니다.' },
      a: { id: 'cp-they-press', text: '상대의 방식이 부담으로 느껴질 때는 솔직하게 말하는 것이 좋습니다.' },
    },
    4: {
      s: { id: 'cp-they-give', text: '상대가 나를 도와주고 받쳐 주는 관계로 봅니다.' },
      a: { id: 'cp-they-tired', text: '받는 쪽으로만 기울지 않도록 고마움을 자주 표현하면 좋습니다.' },
    },
  }
  strengths.push(REL[rel].s)
  if (REL[rel].a) adjustments.push(REL[rel].a!)

  // 2. 배우자 자리(일지)끼리
  const homeRels = between({ stem: me.dayStem, branch: me.dayBranch }, { stem: them.dayStem, branch: them.dayBranch }).filter(
    (r) => r.members.every((m) => m.part === 'branch'),
  )
  if (homeRels.some((r) => COMBINE.has(r.kind))) {
    strengths.push({ id: 'cp-home-combine', text: '두 사람의 배우자 자리가 서로 어울려 생활 리듬이 잘 맞는 편입니다.' })
  } else if (me.dayBranch === them.dayBranch && !homeRels.some((r) => r.kind === 'selfPunish')) {
    strengths.push({ id: 'cp-home-same', text: '두 사람의 배우자 자리가 같은 글자라 생활 습관이 닮은 편입니다.' })
  }
  if (homeRels.some((r) => r.kind === 'clash')) {
    adjustments.push({ id: 'cp-home-clash', text: '두 사람의 배우자 자리가 서로 부딪혀 생활 방식이 다르기 쉬우니, 서로의 리듬을 존중하는 약속을 정하면 좋습니다.' })
  }
  if (homeRels.some((r) => TENSION.has(r.kind))) {
    adjustments.push({ id: 'cp-home-tension', text: '두 사람의 배우자 자리 사이에 작은 긴장이 있어, 사소한 오해는 그때그때 푸는 것이 좋습니다.' })
  }

  // 3. 부족한 기운 채워 주기
  for (const e of ORDER) {
    const meLack = me.totals[e] === 0
    const themLack = them.totals[e] === 0
    if (meLack && !themLack) strengths.push({ id: `cp-fill-me-${e}`, text: `내게 없는 ${ELEMENT_PLAIN[e]} 기운이 상대에게 있어, 상대가 그 부분을 채워 준다고 봅니다.` })
    if (themLack && !meLack) strengths.push({ id: `cp-fill-them-${e}`, text: `상대에게 없는 ${ELEMENT_PLAIN[e]} 기운이 내게 있어, 내가 그 부분을 채워 줄 수 있다고 봅니다.` })
    if (meLack && themLack) adjustments.push({ id: `cp-both-lack-${e}`, text: `두 사람 모두 ${ELEMENT_PLAIN[e]} 기운이 없어, ${과와(ELEMENT_TRAIT[e])} 관련된 부분은 함께 의식해서 채워 가면 좋습니다.` })
  }

  // 4. 배우자 기운 (성별이 다를 때만)
  const sameGender = me.chart.input.gender === them.chart.input.gender
  if (!sameGender) {
    if (them.element === spouseElement(me)) strengths.push({ id: 'cp-spouse-me', text: '상대를 뜻하는 글자가 전통 해석에서 내 배우자를 뜻하는 기운과 같습니다.' })
    if (me.element === spouseElement(them)) strengths.push({ id: 'cp-spouse-them', text: '나를 뜻하는 글자가 전통 해석에서 상대의 배우자를 뜻하는 기운과 같습니다.' })
  }

  // 5. 띠
  const yearRels = between({ stem: 0, branch: me.yearBranch }, { stem: 1, branch: them.yearBranch }).filter((r) =>
    r.members.every((m) => m.part === 'branch'),
  )
  const tti = `${BRANCHES[me.yearBranch].animal}띠·${BRANCHES[them.yearBranch].animal}띠`
  if (yearRels.some((r) => COMBINE.has(r.kind))) strengths.push({ id: 'cp-tti-good', text: `띠(${tti})가 서로 어울리는 사이입니다.` })
  if (yearRels.some((r) => r.kind === 'clash')) {
    adjustments.push({ id: 'cp-tti-clash', text: `띠(${tti})가 서로 마주 보는 사이라 성향 차이가 드러나기 쉽다고 봅니다. 띠는 사주의 작은 일부라 크게 걱정할 필요는 없습니다.` })
  }

  // 6. 기운 세기의 조합
  const pair = [me.strength, them.strength].sort().join('+')
  if (pair === '신강+신약') strengths.push({ id: 'cp-balance', text: '한 사람은 밀고 나가는 힘이, 다른 사람은 맞추는 힘이 있어 역할이 자연스럽게 나뉘기 쉽습니다.' })
  if (pair === '신강+신강') adjustments.push({ id: 'cp-both-strong', text: '두 사람 모두 주관이 뚜렷해, 양보하는 순서를 미리 정해 두면 좋습니다.' })
  if (pair === '신약+신약') adjustments.push({ id: 'cp-both-weak', text: '두 사람 모두 상대에게 맞추려다 결정을 미루기 쉬우니, 그때그때 정할 사람을 정하면 좋습니다.' })

  if (adjustments.length === 0) adjustments.push({ id: 'cp-default', text: '눈에 띄게 부딪히는 부분은 적은 편입니다. 다만 관계는 사주보다 서로의 대화와 노력에 더 크게 좌우됩니다.' })

  const real = adjustments.filter((a) => a.id !== 'cp-default').length
  const summary =
    strengths.length > real
      ? '서로 잘 맞는 부분이 많은 편입니다.'
      : strengths.length === real
        ? '잘 맞는 부분과 맞춰 갈 부분이 함께 있습니다.'
        : '맞춰 갈 부분이 있는 만큼, 서로의 차이를 이해하면 좋은 관계로 이어질 수 있습니다.'

  const meStem = STEMS[me.dayStem]
  const themStem = STEMS[them.dayStem]
  const basis: BasisItem[] = [
    { plain: `두 사람을 뜻하는 글자: 나 ${meStem.ko}(${ELEMENT_PLAIN[me.element]}) · 상대 ${themStem.ko}(${ELEMENT_PLAIN[them.element]})`, term: '일간' },
    { plain: `배우자 자리: 나 ${BRANCHES[me.dayBranch].ko} · 상대 ${BRANCHES[them.dayBranch].ko}`, term: '일지' },
    { plain: `띠: ${tti}`, term: '연지' },
    { plain: `기운의 세기: 나 ${STRENGTH_PLAIN[me.strength]} · 상대 ${STRENGTH_PLAIN[them.strength]}`, term: '신강·신약' },
  ]

  const note = sameGender
    ? '궁합은 관계를 이해하는 참고일 뿐, 관계의 좋고 나쁨을 정하지 않으며 점수는 매기지 않습니다. 배우자 기운 항목은 전통 해석이 남녀를 기준으로 해 이번에는 보지 않았습니다.'
    : '궁합은 관계를 이해하는 참고일 뿐, 관계의 좋고 나쁨을 정하지 않으며 점수는 매기지 않습니다.'

  return { summary, strengths: strengths.slice(0, 5), adjustments: adjustments.slice(0, 4), basis, note }
}
