/**
 * 신살(神煞). 학파 간 정의 차이가 크고 신뢰도 논란이 있어 "참고 표지"로만 다룬다.
 * 규칙·출처 한계: docs/261110_명리학 해석 체계.md 8절. 데이터: src/data/shinsal.json
 * 구현: 천을귀인(일간 기준), 도화·역마·화개(일지·연지 기준). 공망은 `voidBranches` 참고.
 * 12신살, 괴강, 백호 등은 구현하지 않았다.
 */
import { BRANCHES, SHINSAL } from '../data/index.ts'
import type { PillarKey } from './index.ts'

export type ShinsalName = '천을귀인' | '도화' | '역마' | '화개'

export interface ShinsalHit {
  name: ShinsalName
  /** 무엇을 기준으로 찾았는가 */
  base: '일간' | '일지' | '연지'
  /** 해당하는 지지 */
  target: number
  /** 원국에서 그 지지가 있는 기둥 */
  found: PillarKey[]
}

interface PillarInput {
  key: PillarKey
  stem: number
  branch: number
}

export function findShinsal(dayStem: number, pillars: PillarInput[]): ShinsalHit[] {
  const hits: ShinsalHit[] = []
  const where = (branch: number, except?: PillarKey) =>
    pillars.filter((p) => p.branch === branch && p.key !== except).map((p) => p.key)

  // 천을귀인: 일간 기준 두 지지
  for (const target of SHINSAL.cheonEul.byStem[dayStem]) {
    const found = where(target)
    if (found.length) hits.push({ name: '천을귀인', base: '일간', target, found })
  }

  // 도화·역마·화개: 일지와 연지를 각각 기준으로
  const day = pillars.find((p) => p.key === 'day')
  const year = pillars.find((p) => p.key === 'year')
  const bases: { base: '일지' | '연지'; pillar: PillarInput | undefined }[] = [
    { base: '일지', pillar: day },
    { base: '연지', pillar: year },
  ]
  for (const { base, pillar } of bases) {
    if (!pillar) continue
    const group = SHINSAL.triadGroups.find((g) => g.branches.includes(pillar.branch))!
    const targets: [ShinsalName, number][] = [
      ['도화', group.dohwa],
      ['역마', group.yeokma],
      ['화개', group.hwagae],
    ]
    for (const [name, target] of targets) {
      // 기준이 된 기둥 자신은 제외하고 다른 기둥에서 찾는다 (화개는 기준 지지와 같은 글자일 수 있음)
      const found = where(target, pillar.key)
      if (found.length) hits.push({ name, base, target, found })
    }
  }
  return hits
}

export const shinsalTargetName = (branch: number) => BRANCHES[branch].ko
