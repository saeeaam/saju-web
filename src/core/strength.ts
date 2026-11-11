/**
 * 신강·신약(일간의 강약) 점수화. 규칙: docs/261110_명리학 해석 체계.md 4절.
 *
 * 표준 가중치는 없다. 이 값들은 "월령(월지)을 가장 무겁게, 일지·시지·연지와 천간 순으로"라는
 * 일반 원칙을 따른 하나의 선택이며, 조정 가능한 상수로 분리했다. 결과는 단정이 아니라 참고다.
 * 지장간은 정기만 반영한다 (여기·중기·사령은 반영하지 않는 간략화).
 */
import { tenGodOfBranch, tenGodOfStem } from './analysis.ts'
import type { PillarKey } from './index.ts'

export interface StrengthConfig {
  /** 자리별 가중치. 합계 100 */
  weights: Record<StrengthPosition, number>
  /** 돕는 기운 비율(%)이 이 값 이상이면 신강 */
  strongAt: number
  /** 이 값 이하이면 신약. 사이는 중화 */
  weakAt: number
}

export type StrengthPosition =
  | 'monthBranch'
  | 'dayBranch'
  | 'hourBranch'
  | 'yearBranch'
  | 'monthStem'
  | 'hourStem'
  | 'yearStem'

export const STRENGTH_CONFIG: StrengthConfig = {
  weights: {
    monthBranch: 30,
    dayBranch: 20,
    hourBranch: 12,
    yearBranch: 8,
    monthStem: 12,
    hourStem: 10,
    yearStem: 8,
  },
  strongAt: 60,
  weakAt: 40,
}

export type StrengthLabel = '신강' | '중화' | '신약'

export interface StrengthDetail {
  position: StrengthPosition
  weight: number
  /** 일간 기준 십성 묶음 (비겁·식상·재성·관성·인성) */
  group: string
  /** 일간을 돕는가 (비겁·인성) */
  helps: boolean
}

export interface StrengthResult {
  label: StrengthLabel
  /** 돕는 기운이 차지하는 비율(%). 시간 모름이면 시주 가중치를 빼고 다시 계산 */
  percent: number
  helpWeight: number
  totalWeight: number
  /** 득령: 월지(정기)가 일간을 돕는가 */
  deukryeong: boolean
  /** 득지: 일지(정기)가 일간을 돕는가 */
  deukji: boolean
  /** 득세: 월지·일지를 뺀 나머지 중 돕는 비중이 절반 이상인가 */
  deukse: boolean
  details: StrengthDetail[]
  config: StrengthConfig
}

interface PillarInput {
  key: PillarKey
  stem: number
  branch: number
}

const HELPING_GROUPS = new Set(['비겁', '인성'])

export function calculateStrength(
  dayStem: number,
  pillars: PillarInput[],
  config: StrengthConfig = STRENGTH_CONFIG,
): StrengthResult {
  const by = new Map(pillars.map((p) => [p.key, p]))
  const details: StrengthDetail[] = []

  const add = (position: StrengthPosition, group: string) =>
    details.push({ position, weight: config.weights[position], group, helps: HELPING_GROUPS.has(group) })

  const month = by.get('month')
  const day = by.get('day')
  const year = by.get('year')
  const hour = by.get('hour')
  if (month) {
    add('monthBranch', tenGodOfBranch(dayStem, month.branch).group)
    add('monthStem', tenGodOfStem(dayStem, month.stem).group)
  }
  if (day) add('dayBranch', tenGodOfBranch(dayStem, day.branch).group)
  if (year) {
    add('yearBranch', tenGodOfBranch(dayStem, year.branch).group)
    add('yearStem', tenGodOfStem(dayStem, year.stem).group)
  }
  if (hour) {
    add('hourBranch', tenGodOfBranch(dayStem, hour.branch).group)
    add('hourStem', tenGodOfStem(dayStem, hour.stem).group)
  }

  const totalWeight = details.reduce((s, d) => s + d.weight, 0)
  const helpWeight = details.filter((d) => d.helps).reduce((s, d) => s + d.weight, 0)
  const percent = totalWeight === 0 ? 0 : (helpWeight / totalWeight) * 100

  const label: StrengthLabel = percent >= config.strongAt ? '신강' : percent <= config.weakAt ? '신약' : '중화'

  const rest = details.filter((d) => d.position !== 'monthBranch' && d.position !== 'dayBranch')
  const restTotal = rest.reduce((s, d) => s + d.weight, 0)
  const restHelp = rest.filter((d) => d.helps).reduce((s, d) => s + d.weight, 0)

  return {
    label,
    percent,
    helpWeight,
    totalWeight,
    deukryeong: details.find((d) => d.position === 'monthBranch')?.helps ?? false,
    deukji: details.find((d) => d.position === 'dayBranch')?.helps ?? false,
    deukse: restTotal > 0 && restHelp * 2 >= restTotal,
    details,
    config,
  }
}
