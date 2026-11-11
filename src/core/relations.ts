/**
 * 합충형파해(合沖刑破害) 관계 탐색. 규칙: docs/261110_명리학 해석 체계.md 3절.
 * - "관계가 있다"는 사실만 표시하고, 합화(오행이 실제로 변하는지)는 판정하지 않는다.
 * - 원국 4기둥 사이에서는 인접 여부(adjacent)를 함께 돌려준다. 인접해야 강하다는 견해가 있다.
 * - 대운·세운 등 추가 글자를 넣으면 "추가 글자가 관여하는 관계"만 골라낼 수 있다.
 */
import { BRANCHES, RELATIONS, STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'

export type UnitId = 'hour' | 'day' | 'month' | 'year' | 'daeun' | 'seun'

/** 관계를 찾을 천간·지지 한 쌍(한 기둥) */
export interface Unit {
  id: UnitId
  stem: number
  branch: number
}

export type RelationKind =
  | 'stemCombine' // 천간합
  | 'stemClash' // 천간충
  | 'sixCombine' // 육합
  | 'triad' // 삼합
  | 'halfTriad' // 반합
  | 'direction' // 방합
  | 'clash' // 충
  | 'punish' // 형
  | 'selfPunish' // 자형
  | 'break' // 파
  | 'harm' // 해

export const RELATION_KIND_LABEL: Record<RelationKind, string> = {
  stemCombine: '천간합',
  stemClash: '천간충',
  sixCombine: '육합',
  triad: '삼합',
  halfTriad: '반합',
  direction: '방합',
  clash: '충',
  punish: '형',
  selfPunish: '자형',
  break: '파',
  harm: '해',
}

export interface RelationMember {
  unit: UnitId
  part: 'stem' | 'branch'
}

export interface Relation {
  kind: RelationKind
  /** 예: 묘유충, 신자진 삼합 */
  name: string
  members: RelationMember[]
  /** 합이 이루는 오행. 합화가 일어났다는 뜻이 아니라 "합했을 때 가리키는 오행" */
  element: Element | null
  /** 원국 기둥끼리일 때 모든 구성원이 이웃한 기둥인가. 추가 글자가 끼면 null */
  adjacent: boolean | null
  /** 부분 성립(예: 인사신 중 두 글자) 등 보조 설명 */
  note?: string
}

/** 원국 기둥의 왼쪽→오른쪽 위치(시·일·월·연). 인접 판정에만 쓴다 */
const POSITION: Partial<Record<UnitId, number>> = { hour: 0, day: 1, month: 2, year: 3 }

function adjacentOf(units: UnitId[]): boolean | null {
  const pos = units.map((u) => POSITION[u])
  if (pos.some((p) => p === undefined)) return null
  const sorted = [...(pos as number[])].sort((a, b) => a - b)
  if (new Set(sorted).size !== sorted.length) return false // 같은 기둥 안의 천간·지지
  return sorted.every((p, i) => i === 0 || p - sorted[i - 1] === 1)
}

const stemName = (id: number) => STEMS[id].ko

/** 두 글자 이름은 id가 작은 쪽을 앞에 둔다 (갑기합, 묘오파처럼 관례 표기와 같다) */
function pairLabel(x: number, y: number, name: (id: number) => string): string {
  return x <= y ? `${name(x)}${name(y)}` : `${name(y)}${name(x)}`
}
const branchName = (id: number) => BRANCHES[id].ko

function samePair(a: [number, number], x: number, y: number): boolean {
  return (a[0] === x && a[1] === y) || (a[0] === y && a[1] === x)
}

/**
 * units 안에서 관계를 모두 찾는다. units 순서가 앞선 글자가 삼합 등에서 대표로 뽑힌다.
 * 같은 기둥의 천간과 지지끼리는 관계를 보지 않는다(간지 한 쌍 내부는 별개).
 */
export function findRelations(units: Unit[]): Relation[] {
  const out: Relation[] = []
  const push = (r: Omit<Relation, 'adjacent'>) =>
    out.push({ ...r, adjacent: adjacentOf(r.members.map((m) => m.unit)) })

  // ── 천간 ──
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const a = units[i]
      const b = units[j]
      const members: RelationMember[] = [
        { unit: a.id, part: 'stem' },
        { unit: b.id, part: 'stem' },
      ]
      for (const c of RELATIONS.stemCombine) {
        if (samePair(c.pair as [number, number], a.stem, b.stem)) {
          push({ kind: 'stemCombine', name: `${pairLabel(a.stem, b.stem, stemName)}합`, members, element: c.element as Element })
        }
      }
      for (const c of RELATIONS.stemClash) {
        if (samePair(c as [number, number], a.stem, b.stem)) {
          push({ kind: 'stemClash', name: `${pairLabel(a.stem, b.stem, stemName)}충`, members, element: null })
        }
      }
    }
  }

  // ── 지지 2자 관계 ──
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const a = units[i]
      const b = units[j]
      const members: RelationMember[] = [
        { unit: a.id, part: 'branch' },
        { unit: b.id, part: 'branch' },
      ]
      const label = pairLabel(a.branch, b.branch, branchName)
      for (const c of RELATIONS.branchSixCombine) {
        if (samePair(c.pair as [number, number], a.branch, b.branch)) {
          push({ kind: 'sixCombine', name: `${label}합`, members, element: c.element as Element | null })
        }
      }
      for (const c of RELATIONS.clash) {
        if (samePair(c as [number, number], a.branch, b.branch)) push({ kind: 'clash', name: `${label}충`, members, element: null })
      }
      for (const c of RELATIONS.break) {
        if (samePair(c as [number, number], a.branch, b.branch)) push({ kind: 'break', name: `${label}파`, members, element: null })
      }
      for (const c of RELATIONS.harm) {
        if (samePair(c as [number, number], a.branch, b.branch)) push({ kind: 'harm', name: `${label}해`, members, element: null })
      }
      for (const p of RELATIONS.punish.pairs) {
        if (samePair(p.branches as [number, number], a.branch, b.branch)) {
          push({ kind: 'punish', name: `${label}형`, members, element: null, note: p.name })
        }
      }
      if (a.branch === b.branch && RELATIONS.punish.self.includes(a.branch)) {
        push({ kind: 'selfPunish', name: `${label} 자형`, members, element: null })
      }
    }
  }

  // ── 지지 3자 형: 완전하면 삼형, 아니면 두 글자 부분 형 ──
  for (const t of RELATIONS.punish.triples) {
    const found = t.branches.map((b) => units.find((u) => u.branch === b))
    const members = (list: (Unit | undefined)[]): RelationMember[] =>
      list.filter((u): u is Unit => !!u).map((u) => ({ unit: u.id, part: 'branch' as const }))
    if (found.every(Boolean)) {
      push({ kind: 'punish', name: `${t.branches.map(branchName).join('')} 삼형`, members: members(found), element: null, note: t.name })
    } else {
      for (let x = 0; x < 3; x++) {
        for (let y = x + 1; y < 3; y++) {
          if (found[x] && found[y]) {
            const pair = [found[x], found[y]]
            push({
              kind: 'punish',
              name: `${branchName(t.branches[x])}${branchName(t.branches[y])}형`,
              members: members(pair),
              element: null,
              note: `${t.name}의 일부 (세 글자 중 두 글자)`,
            })
          }
        }
      }
    }
  }

  // ── 삼합 / 반합 ──
  for (const t of RELATIONS.triad) {
    const found = t.branches.map((b) => units.find((u) => u.branch === b))
    const label = t.branches.map(branchName).join('')
    if (found.every(Boolean)) {
      push({
        kind: 'triad',
        name: `${label} 삼합`,
        members: found.map((u) => ({ unit: u!.id, part: 'branch' as const })),
        element: t.element as Element,
      })
    } else {
      const centerUnit = units.find((u) => u.branch === t.center)
      if (centerUnit) {
        for (const b of t.branches) {
          if (b === t.center) continue
          const other = units.find((u) => u.branch === b)
          if (other) {
            push({
              kind: 'halfTriad',
              name: `${[t.center, b].sort((x, y) => t.branches.indexOf(x) - t.branches.indexOf(y)).map(branchName).join('')} 반합`,
              members: [
                { unit: centerUnit.id, part: 'branch' },
                { unit: other.id, part: 'branch' },
              ],
              element: t.element as Element,
              note: `${label} 삼합의 일부 (왕지 포함 두 글자)`,
            })
          }
        }
      }
    }
  }

  // ── 방합 (세 글자가 모두 있을 때만) ──
  for (const d of RELATIONS.direction) {
    const found = d.branches.map((b) => units.find((u) => u.branch === b))
    if (found.every(Boolean)) {
      push({
        kind: 'direction',
        name: `${d.branches.map(branchName).join('')} 방합`,
        members: found.map((u) => ({ unit: u!.id, part: 'branch' as const })),
        element: d.element as Element,
      })
    }
  }

  return out
}

/** 원국 4기둥 안의 관계 */
export function natalRelations(natal: Unit[]): Relation[] {
  return findRelations(natal)
}

/**
 * 원국에 추가 글자(대운 또는 세운)를 넣었을 때, 추가 글자가 관여하는 관계만.
 * 추가 글자를 앞에 두어 삼합 등에서 추가 글자가 대표로 뽑히게 한다.
 */
export function relationsWithExtra(natal: Unit[], extras: Unit[]): Relation[] {
  const ids = new Set(extras.map((e) => e.id))
  return findRelations([...extras, ...natal]).filter((r) => r.members.some((m) => ids.has(m.unit)))
}
