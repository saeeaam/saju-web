import { useContext } from 'react'
import { TermContext } from './term-context.ts'
import { GLOSSARY } from './glossary.ts'
import type { TermKey } from './glossary.ts'

/**
 * 용어 표시: 쉬운 말을 앞에, "전문 용어 함께 보기"가 켜져 있으면 원래 용어를 작게 붙인다.
 * 누르면 설명 창이 열린다. 버튼 안처럼 버튼을 겹칠 수 없는 곳에서는 static으로 글자만 표시한다.
 */
export function Term({ k, static: isStatic = false }: { k: TermKey; static?: boolean }) {
  const { showOriginal, openTerm } = useContext(TermContext)
  const info = GLOSSARY[k]
  const original = showOriginal && info.term !== info.plain ? <small className="term-orig">{info.term}</small> : null
  if (isStatic) {
    return (
      <span className="term" data-term={k}>
        {info.plain}
        {original}
      </span>
    )
  }
  return (
    <button type="button" className="term term-btn" data-term={k} onClick={() => openTerm(k)} aria-haspopup="dialog">
      {info.plain}
      {original}
    </button>
  )
}
