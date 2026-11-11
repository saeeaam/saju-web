import { BRANCHES, STEMS } from '../data/index.ts'

/** 항상 0 이상을 돌려주는 모듈로 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** 60갑자의 한 기둥. index = 60갑자 순번(갑자=0 … 계해=59) */
export interface Ganji {
  stem: number
  branch: number
  index: number
}

export function ganjiFromIndex(index: number): Ganji {
  const n = mod(index, 60)
  return { stem: n % 10, branch: n % 12, index: n }
}

/** 천간·지지 → 60갑자. 음양이 맞지 않는 조합은 존재하지 않으므로 오류 */
export function ganjiFromParts(stem: number, branch: number): Ganji {
  if (stem % 2 !== branch % 2) {
    throw new RangeError(`존재하지 않는 간지 조합: 천간 ${stem}, 지지 ${branch}`)
  }
  for (let k = 0; k < 6; k++) {
    const n = stem + 10 * k
    if (n % 12 === branch) return { stem, branch, index: n }
  }
  throw new RangeError(`간지 조합을 찾지 못함: 천간 ${stem}, 지지 ${branch}`)
}

/** 한글 간지 이름 (예: 갑자) */
export function ganjiName(g: Pick<Ganji, 'stem' | 'branch'>): string {
  return STEMS[g.stem].ko + BRANCHES[g.branch].ko
}

/** 한자 간지 이름 (예: 甲子) */
export function ganjiHanja(g: Pick<Ganji, 'stem' | 'branch'>): string {
  return STEMS[g.stem].hanja + BRANCHES[g.branch].hanja
}
