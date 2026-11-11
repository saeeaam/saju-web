import { useContext } from 'react'
import { TermContext } from './term-context.ts'

/** 누를 필요 없는 제목·머리글용: 쉬운 말 + (켜져 있으면) 원래 용어를 작게 */
export function Label({ plain, term }: { plain: string; term: string }) {
  const { showOriginal } = useContext(TermContext)
  return (
    <>
      {plain}
      {showOriginal && <small className="term-orig">{term}</small>}
    </>
  )
}
