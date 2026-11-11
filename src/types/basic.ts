export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export type YinYang = 'yin' | 'yang'

export interface StemInfo {
  id: number
  ko: string
  hanja: string
  yinYang: YinYang
  element: Element
}

export interface BranchInfo {
  id: number
  ko: string
  hanja: string
  yinYang: YinYang
  element: Element
  animal: string
  /** 시(時) 시작 시각. 자시는 23 */
  hourStart: number
  /** 해당 월지가 시작되는 절(節) 이름 */
  monthTerm: string
}

export interface NapeumInfo {
  index: number
  ko: string
  hanja: string
  element: Element
}
