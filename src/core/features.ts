/**
 * 해석 근거 특징 추출. 명식·분석 결과에서 카테고리 해석에 쓰는 사실만 뽑는다.
 * 여기서는 판단(좋다·나쁘다)을 하지 않고 개수·위치·관계 같은 사실만 계산한다.
 */
import { HIDDEN_STEMS, STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import { tenGodOfStem } from './analysis.ts'
import type { PillarKey, SajuChart } from './index.ts'
import type { Insight } from './insight.ts'
import { natalUnits } from './insight.ts'
import { seunPillar } from './luck.ts'
import { relationsWithExtra } from './relations.ts'
import type { Relation } from './relations.ts'
import type { ShinsalName } from './shinsal.ts'
import type { StrengthLabel } from './strength.ts'
import type { ZiweiResult } from './ziwei-from-chart.ts'
import type { Ganji } from './ganji.ts'

export type Group = '비겁' | '식상' | '재성' | '관성' | '인성'
export const GROUPS: Group[] = ['비겁', '식상', '재성', '관성', '인성']

const YEAR_MS = 365.2425 * 86_400_000

const COMBINE_KINDS = new Set(['stemCombine', 'sixCombine', 'triad', 'halfTriad', 'direction'])
const CLASH_KINDS = new Set(['stemClash', 'clash'])
const TENSION_KINDS = new Set(['punish', 'selfPunish', 'break', 'harm'])

export interface RelationTouch {
  /** 일지(배우자 자리)가 끼어 있는 관계 */
  combine: number
  clash: number
  tension: number
}

export interface LuckFeature {
  ganji: Ganji
  /** 위 글자의 십성 묶음 */
  stemGroup: Group
  /** 아래 글자(정기)의 십성 묶음 */
  branchGroup: Group
  /** 이 운이 내 사주의 일지와 맺는 관계 */
  dayBranch: RelationTouch
}

export interface ReadingFeatures {
  gender: 'male' | 'female'
  dayStem: number
  dayElement: Element
  strength: StrengthLabel
  strengthPercent: number
  /** 일간을 뺀 천간 + 모든 지지(정기)의 십성 묶음 개수 */
  groups: Record<Group, number>
  /** 지장간 전체의 십성 묶음 개수 (속에 숨은 글자) */
  hiddenGroups: Record<Group, number>
  /** 십성 이름별 개수 (겉으로 드러난 글자) */
  tenGods: Record<string, number>
  /** 월주(사회 자리) 천간·지지의 묶음 */
  monthGroups: Group[]
  /** 일지(배우자 자리)의 십성 이름과 묶음 */
  dayBranchTenGod: string
  dayBranchGroup: Group
  /** 원국 안에서 일지가 낀 관계 */
  dayBranchNatal: RelationTouch
  elementTotals: Record<Element, number>
  lacking: Element[]
  heavy: Element[]
  charCount: number
  hasHour: boolean
  /** 배우자를 뜻하는 기운 (전통: 남성은 재성, 여성은 관성) */
  spouse: { group: Group; count: number; hidden: number; inDayBranch: boolean }
  shinsal: Set<ShinsalName>
  /** 도움이 되는 기운 (균형 기준 첫 후보, 계절 기준) */
  helpful: { eokbu: Element | null; johu: Element | null }
  /** 지금의 10년 흐름 (첫 대운 전이면 null) */
  daeun: (LuckFeature & { startAge: number; index: number }) | null
  /** 올해와 내년의 흐름 */
  thisYear: LuckFeature & { year: number }
  nextYear: LuckFeature & { year: number }
  /** 자미두수 칸별 큰 별·사화, 현재 대한의 칸 이름 */
  ziwei: {
    palaces: Record<string, { main: string[]; others: string[]; sihua: { star: string; type: string }[] }>
    currentDecadePalace: string | null
  } | null
}

function emptyGroups(): Record<Group, number> {
  return { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
}

function touch(relations: Relation[], unit: 'day', extra?: string): RelationTouch {
  const r: RelationTouch = { combine: 0, clash: 0, tension: 0 }
  for (const rel of relations) {
    const onDayBranch = rel.members.some((m) => m.unit === unit && m.part === 'branch')
    const withExtra = extra ? rel.members.some((m) => m.unit === extra) : true
    if (!onDayBranch || !withExtra) continue
    if (COMBINE_KINDS.has(rel.kind)) r.combine++
    else if (CLASH_KINDS.has(rel.kind)) r.clash++
    else if (TENSION_KINDS.has(rel.kind)) r.tension++
  }
  return r
}

function branchGroup(dayStem: number, branch: number): Group {
  const hidden = HIDDEN_STEMS[branch]
  return tenGodOfStem(dayStem, hidden[hidden.length - 1]).group as Group
}

function luckFeature(chart: SajuChart, g: Ganji, id: 'daeun' | 'seun'): LuckFeature {
  const natal = natalUnits(chart)
  const rels = relationsWithExtra(natal, [{ id, stem: g.stem, branch: g.branch }])
  return {
    ganji: g,
    stemGroup: tenGodOfStem(chart.dayMaster, g.stem).group as Group,
    branchGroup: branchGroup(chart.dayMaster, g.branch),
    dayBranch: touch(rels, 'day', id),
  }
}

export function extractFeatures(chart: SajuChart, insight: Insight, now: Date, ziwei: ZiweiResult | null): ReadingFeatures {
  const dayStem = chart.dayMaster
  const groups = emptyGroups()
  const hiddenGroups = emptyGroups()
  const tenGods: Record<string, number> = {}
  for (const p of chart.pillars) {
    if (p.stemTenGod) {
      groups[p.stemTenGod.group as Group]++
      tenGods[p.stemTenGod.name] = (tenGods[p.stemTenGod.name] ?? 0) + 1
    }
    groups[p.branchTenGod.group as Group]++
    tenGods[p.branchTenGod.name] = (tenGods[p.branchTenGod.name] ?? 0) + 1
    for (const h of p.hiddenStems) hiddenGroups[h.tenGod.group as Group]++
  }

  const month = chart.pillars.find((p) => p.key === 'month')!
  const day = chart.pillars.find((p) => p.key === 'day')!
  const charCount = chart.pillars.length * 2
  const totals = chart.elements.total
  const elements = Object.keys(totals) as Element[]

  const gender = chart.input.gender
  const spouseGroup: Group = gender === 'male' ? '재성' : '관성'

  // 지금의 10년 흐름
  const age = (now.getTime() - chart.instantMs) / YEAR_MS
  let daeunIndex = -1
  chart.daeun.pillars.forEach((p, i) => {
    if (p.startAge <= age) daeunIndex = i
  })
  const daeunPillar = daeunIndex >= 0 ? chart.daeun.pillars[daeunIndex] : null

  const thisYearNum = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear()

  let ziweiFeature: ReadingFeatures['ziwei'] = null
  if (ziwei) {
    const palaces: NonNullable<ReadingFeatures['ziwei']>['palaces'] = {}
    const nominal = thisYearNum - ziwei.lunar.year + 1
    let currentDecadePalace: string | null = null
    for (const p of ziwei.chart.palaces) {
      palaces[p.name] = {
        main: p.stars.filter((s) => isMain(s.id)).map((s) => s.id),
        others: p.stars.filter((s) => !isMain(s.id)).map((s) => s.id),
        sihua: p.stars.filter((s) => s.sihua).map((s) => ({ star: s.id, type: s.sihua! })),
      }
      if (nominal >= p.decade[0] && nominal <= p.decade[1]) currentDecadePalace = p.name
    }
    ziweiFeature = { palaces, currentDecadePalace }
  }

  return {
    gender,
    dayStem,
    dayElement: STEMS[dayStem].element,
    strength: insight.strength.label,
    strengthPercent: insight.strength.percent,
    groups,
    hiddenGroups,
    tenGods,
    monthGroups: [month.stemTenGod!.group as Group, month.branchTenGod.group as Group],
    dayBranchTenGod: day.branchTenGod.name,
    dayBranchGroup: day.branchTenGod.group as Group,
    dayBranchNatal: touch(insight.relations, 'day'),
    elementTotals: totals,
    lacking: elements.filter((e) => totals[e] === 0),
    heavy: elements.filter((e) => totals[e] >= Math.ceil(charCount / 2)),
    charCount,
    hasHour: chart.pillars.some((p) => p.key === 'hour'),
    spouse: {
      group: spouseGroup,
      count: groups[spouseGroup],
      hidden: hiddenGroups[spouseGroup],
      inDayBranch: day.branchTenGod.group === spouseGroup,
    },
    shinsal: new Set(insight.shinsal.map((s) => s.name)),
    helpful: {
      eokbu: insight.yongshin.eokbu.candidates[0]?.element ?? null,
      johu: insight.yongshin.johu.needed,
    },
    daeun: daeunPillar ? { ...luckFeature(chart, daeunPillar.ganji, 'daeun'), startAge: daeunPillar.startAge, index: daeunIndex } : null,
    thisYear: { ...luckFeature(chart, seunPillar(thisYearNum), 'seun'), year: thisYearNum },
    nextYear: { ...luckFeature(chart, seunPillar(thisYearNum + 1), 'seun'), year: thisYearNum + 1 },
    ziwei: ziweiFeature,
  }
}

const MAIN_STARS = new Set(['ziwei', 'tianji', 'taiyang', 'wuqu', 'tiantong', 'lianzhen', 'tianfu', 'taiyin', 'tanlang', 'jumen', 'tianxiang', 'tianliang', 'qisha', 'pojun'])
function isMain(id: string): boolean {
  return MAIN_STARS.has(id)
}

/** 테스트·문서용: 기둥 키 → 쉬운 말 */
export const PILLAR_PLAIN: Record<PillarKey, string> = { hour: '태어난 시', day: '태어난 날', month: '태어난 달', year: '태어난 해' }
