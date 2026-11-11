/**
 * 명식(SajuChart) → 명리 분석 종합. 관계, 신강·신약, 용신 후보, 신살, 해석 문구.
 * 모든 결과는 "참고"이며 학파·기준에 따라 달라질 수 있다.
 */
import type { PillarKey, SajuChart } from './index.ts'
import { buildInterpretation } from './interpret.ts'
import type { InterpretationSection } from './interpret.ts'
import { natalRelations } from './relations.ts'
import type { Relation, Unit } from './relations.ts'
import { findShinsal } from './shinsal.ts'
import type { ShinsalHit } from './shinsal.ts'
import { calculateStrength } from './strength.ts'
import type { StrengthConfig, StrengthResult } from './strength.ts'
import { STRENGTH_CONFIG } from './strength.ts'
import { analyzeYongshin } from './yongshin.ts'
import type { YongshinResult } from './yongshin.ts'

export interface Insight {
  relations: Relation[]
  strength: StrengthResult
  yongshin: YongshinResult
  shinsal: ShinsalHit[]
  interpretation: InterpretationSection[]
}

/** 명식의 원국 기둥을 관계 탐색용 글자로 */
export function natalUnits(chart: SajuChart): Unit[] {
  return chart.pillars.map((p) => ({ id: p.key as PillarKey, stem: p.ganji.stem, branch: p.ganji.branch }))
}

export function analyzeChart(chart: SajuChart, strengthConfig: StrengthConfig = STRENGTH_CONFIG): Insight {
  const units = natalUnits(chart)
  const pillars = units.map((u) => ({ key: u.id as PillarKey, stem: u.stem, branch: u.branch }))

  const relations = natalRelations(units)
  const strength = calculateStrength(chart.dayMaster, pillars, strengthConfig)
  const monthBranch = chart.pillars.find((p) => p.key === 'month')!.ganji.branch
  const yongshin = analyzeYongshin(chart.dayMaster, strength.label, monthBranch, chart.elements.total)
  const shinsal = findShinsal(chart.dayMaster, pillars)

  // 십성 묶음별 개수: 일간을 뺀 천간 + 모든 지지(정기 기준)
  const groupCounts: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const p of chart.pillars) {
    if (p.stemTenGod) groupCounts[p.stemTenGod.group]++
    groupCounts[p.branchTenGod.group]++
  }

  const combine = relations.filter((r) => ['stemCombine', 'sixCombine', 'triad', 'halfTriad', 'direction'].includes(r.kind)).length
  const clash = relations.filter((r) => ['stemClash', 'clash'].includes(r.kind)).length

  const interpretation = buildInterpretation({
    dayStem: chart.dayMaster,
    strength,
    elementTotals: chart.elements.total,
    charCount: chart.pillars.length * 2,
    groupCounts,
    relationCounts: { combine, clash, other: relations.length - combine - clash },
  })

  return { relations, strength, yongshin, shinsal, interpretation }
}
