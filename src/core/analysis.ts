/**
 * 명식 파생값: 십성, 지장간, 12운성, 납음, 공망, 오행 분포.
 * 규칙·학파 차이: docs/261110_명리학 해석 체계.md, 261110_사주팔자 기초.md
 */
import { BRANCHES, HIDDEN_STEMS, NAPEUM, STEMS, TEN_GODS, TWELVE_STAGES } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import type { EarthStageRule } from '../types/options.ts'
import { mod } from './ganji.ts'

const ELEMENT_ORDER: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']

type Relation = keyof typeof TEN_GODS

export interface TenGod {
  /** 십성 이름 (예: 정관) */
  name: string
  /** 묶음 (예: 관성) */
  group: string
  relation: Relation
}

/** 일간(dayStem) 기준 다른 천간(stem)의 십성 */
export function tenGodOfStem(dayStem: number, stem: number): TenGod {
  const me = STEMS[dayStem]
  const other = STEMS[stem]
  const diff = mod(ELEMENT_ORDER.indexOf(other.element) - ELEMENT_ORDER.indexOf(me.element), 5)
  // 0 같음, 1 내가 생함, 2 내가 극함, 3 나를 극함, 4 나를 생함
  const relation = (['peer', 'output', 'wealth', 'officer', 'resource'] as const)[diff]
  const same = me.yinYang === other.yinYang
  const entry = TEN_GODS[relation]
  return { name: same ? entry.same : entry.diff, group: entry.group, relation }
}

/** 지장간 천간 id 배열 [여기, 중기, 정기] */
export function hiddenStemsOf(branch: number): number[] {
  return HIDDEN_STEMS[branch]
}

/** 지지의 십성은 지장간의 정기(마지막) 기준 */
export function tenGodOfBranch(dayStem: number, branch: number): TenGod {
  const hidden = HIDDEN_STEMS[branch]
  return tenGodOfStem(dayStem, hidden[hidden.length - 1])
}

export interface TwelveStage {
  index: number
  name: string
}

/** 천간 stem이 지지 branch에서 갖는 12운성 */
export function twelveStage(stem: number, branch: number, earthRule: EarthStageRule = 'fire-earth'): TwelveStage {
  let longLife = TWELVE_STAGES.byStem[stem].longLifeBranch
  const direction = TWELVE_STAGES.byStem[stem].direction
  if (earthRule === 'water-earth') {
    // 수토동궁: 무는 임과, 기는 계와 같은 장생지
    if (stem === 4) longLife = TWELVE_STAGES.byStem[8].longLifeBranch
    if (stem === 5) longLife = TWELVE_STAGES.byStem[9].longLifeBranch
  }
  const index = direction === 1 ? mod(branch - longLife, 12) : mod(longLife - branch, 12)
  return { index, name: TWELVE_STAGES.stages[index] }
}

/** 납음오행 (60갑자 순번 기준) */
export function napeumOf(ganjiIndex: number) {
  return NAPEUM[Math.floor(mod(ganjiIndex, 60) / 2)]
}

/** 공망: 일주가 속한 순(旬)에서 빠진 지지 2개 */
export function voidBranches(dayGanjiIndex: number): [number, number] {
  const xunStart = dayGanjiIndex - (dayGanjiIndex % 10)
  const first = mod(xunStart + 10, 12)
  return [first, mod(first + 1, 12)]
}

export type ElementCounts = Record<Element, number>

function emptyCounts(): ElementCounts {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
}

export interface ElementDistribution {
  /** 천간 4(3)개의 오행 */
  stems: ElementCounts
  /** 지지 4(3)개의 본기(지지 자체의 오행) */
  branches: ElementCounts
  /** 지지 속 지장간 전체(여기·중기·정기 각 1) */
  hidden: ElementCounts
  /** stems + branches (지장간 제외한 8자 기준) */
  total: ElementCounts
}

/** 오행 분포. 지장간 가중치는 학파별이라 개수만 센다 */
export function elementDistribution(pillars: { stem: number; branch: number }[]): ElementDistribution {
  const stems = emptyCounts()
  const branches = emptyCounts()
  const hidden = emptyCounts()
  for (const p of pillars) {
    stems[STEMS[p.stem].element]++
    branches[BRANCHES[p.branch].element]++
    for (const h of HIDDEN_STEMS[p.branch]) hidden[STEMS[h].element]++
  }
  const total = emptyCounts()
  for (const e of ELEMENT_ORDER) total[e] = stems[e] + branches[e]
  return { stems, branches, hidden, total }
}
