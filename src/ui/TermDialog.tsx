import { useEffect, useRef } from 'react'
import { GLOSSARY } from './glossary.ts'
import type { TermKey } from './glossary.ts'

/** 용어 설명 창. 브라우저 기본 dialog를 써서 포커스 이동·Esc 닫기를 그대로 활용한다 */
export function TermDialog({ term, onClose }: { term: TermKey | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (term && !d.open) {
      // 일부 환경(jsdom 등)은 showModal이 없어 open 속성으로 대신한다
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    } else if (!term && d.open) {
      if (typeof d.close === 'function') d.close()
      else d.removeAttribute('open')
    }
  }, [term])

  const info = term ? GLOSSARY[term] : null
  return (
    <dialog ref={ref} className="term-dialog" aria-labelledby="term-dialog-title" onClose={onClose} onCancel={onClose}>
      {info && (
        <>
          <h2 id="term-dialog-title">
            {info.plain} {info.term !== info.plain && <small className="term-orig">{info.term}</small>}
          </h2>
          <p>{info.hint}</p>
          <button type="button" className="ghost" onClick={onClose} autoFocus>
            닫기
          </button>
        </>
      )}
    </dialog>
  )
}
