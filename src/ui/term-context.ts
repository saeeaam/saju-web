import { createContext } from 'react'
import type { TermKey } from './glossary.ts'

export interface TermContextValue {
  /** 전문 용어를 쉬운 말 옆에 함께 보여줄지 */
  showOriginal: boolean
  /** 용어 설명 창 열기 */
  openTerm: (k: TermKey) => void
}

export const TermContext = createContext<TermContextValue>({ showOriginal: true, openTerm: () => {} })
