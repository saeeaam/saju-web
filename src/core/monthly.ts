/**
 * 월별 흐름: 올해(입춘 기준 사주 연도)의 12개월 각각이 나에게 어떤 주제인지.
 * 달은 절기(입춘·경칩 …)로 바뀌므로 양력 달과 일치하지 않는다. 화면에는 시작 날짜를 함께 보여준다.
 * 판단 근거: 그 달 위 글자의 십성 묶음(주제), 나와 가장 가까운 자리(일지)와의 관계, 도움이 되는 기운과의 겹침.
 */
import { HIDDEN_STEMS, STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import { tenGodOfStem } from './analysis.ts'
import type { Group, ReadingFeatures } from './features.ts'
import type { SajuChart } from './index.ts'
import { natalUnits } from './insight.ts'
import { ipchunYear } from './pillars.ts'
import { wolunPillars } from './luck.ts'
import { relationsWithExtra } from './relations.ts'
import type { Ganji } from './ganji.ts'

export type MonthTag = 'change' | 'harmony' | 'friction' | 'helpful'

export const MONTH_TAG_LABEL: Record<MonthTag, string> = {
  change: '변화',
  harmony: '화합',
  friction: '작은 오해 주의',
  helpful: '도움 되는 기운',
}

export interface MonthReading {
  /** 그 달의 시작 순간(절입, UTC ms) */
  startMs: number
  /** 다음 달 시작 순간 */
  endMs: number
  ganji: Ganji
  stemGroup: Group
  branchGroup: Group
  /** 그 달의 주제 문장 */
  theme: string
  /** 덧붙는 한 줄 (변화·화합 등). 없으면 빈 배열 */
  notes: string[]
  tags: MonthTag[]
  isCurrent: boolean
}

export interface MonthlyReading {
  /** 입춘 기준 사주 연도 */
  sajuYear: number
  months: MonthReading[]
}

const THEME: Record<Group, string> = {
  비겁: '사람을 만나고 함께 움직이는 일이 많은 달입니다.',
  식상: '표현하고 새로 시도하는 일이 늘기 쉬운 달입니다.',
  재성: '돈과 일의 성과에 관심이 쏠리기 쉬운 달입니다.',
  관성: '책임과 일정이 늘기 쉬운 달입니다.',
  인성: '배우고 정리하며 준비하기 좋은 달입니다.',
}

const COMBINE = new Set(['stemCombine', 'sixCombine', 'triad', 'halfTriad', 'direction'])
const CLASH = new Set(['stemClash', 'clash'])
const TENSION = new Set(['punish', 'selfPunish', 'break', 'harm'])

export function buildMonthly(chart: SajuChart, features: ReadingFeatures, now: Date): MonthlyReading {
  const nowMs = now.getTime()
  const sajuYear = ipchunYear(nowMs)
  const wolun = wolunPillars(sajuYear)
  const next = wolunPillars(sajuYear + 1)[0]
  const natal = natalUnits(chart)
  const helpful = new Set([features.helpful.eokbu, features.helpful.johu].filter(Boolean) as Element[])

  const months: MonthReading[] = wolun.map((m, i) => {
    const endMs = i + 1 < wolun.length ? wolun[i + 1].jie.ms : next.jie.ms
    const g = m.ganji
    const stemGroup = tenGodOfStem(chart.dayMaster, g.stem).group as Group
    const hidden = HIDDEN_STEMS[g.branch]
    const branchGroup = tenGodOfStem(chart.dayMaster, hidden[hidden.length - 1]).group as Group

    // 그 달 글자가 나와 가장 가까운 자리(일지)와 맺는 관계
    const rels = relationsWithExtra(natal, [{ id: 'seun', stem: g.stem, branch: g.branch }]).filter((r) =>
      r.members.some((x) => x.unit === 'day' && x.part === 'branch'),
    )
    const tags: MonthTag[] = []
    const notes: string[] = []
    if (rels.some((r) => CLASH.has(r.kind))) {
      tags.push('change')
      notes.push('나와 가장 가까운 자리와 부딪히는 달이라 생활·관계에 변화가 생기기 쉽습니다.')
    } else if (rels.some((r) => COMBINE.has(r.kind))) {
      tags.push('harmony')
      notes.push('나와 가장 가까운 자리와 어울리는 달이라 협력과 화합이 쉽습니다.')
    }
    if (rels.some((r) => TENSION.has(r.kind))) {
      tags.push('friction')
      notes.push('사소한 말이나 일정이 어긋나기 쉬우니 한 번 더 확인하면 좋습니다.')
    }
    if (helpful.has(STEMS[g.stem].element)) {
      tags.push('helpful')
      notes.push('나에게 도움이 되는 기운이 들어오는 달로 봅니다.')
    }

    return {
      startMs: m.jie.ms,
      endMs,
      ganji: g,
      stemGroup,
      branchGroup,
      theme: THEME[stemGroup],
      notes,
      tags,
      isCurrent: nowMs >= m.jie.ms && nowMs < endMs,
    }
  })

  return { sajuYear, months }
}
