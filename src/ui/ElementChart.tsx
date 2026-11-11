import { useState } from 'react'
import type { SajuChart } from '../core/index.ts'
import { ELEMENTS, ELEMENT_HANJA, ELEMENT_KO } from './labels.ts'

/**
 * 오행 분포: 8자(시간 모름이면 6자)의 천간·지지 오행 개수.
 * 막대는 항목(오행)당 한 개이고 이름이 직접 표기되어 있다. 색은 오행에 고정(순번 아님).
 * 같은 데이터를 표로도 볼 수 있다.
 */
export function ElementChart({ chart }: { chart: SajuChart }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const { stems, branches, hidden, total } = chart.elements
  const chars = chart.pillars.length * 2
  const max = Math.max(4, ...ELEMENTS.map((e) => total[e]))

  return (
    <section aria-labelledby="element-title">
      <div className="chart-head">
        <h2 id="element-title">오행 분포</h2>
        <div className="toggle" role="group" aria-label="보기 방식">
          <button type="button" className="ghost" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
            차트
          </button>
          <button type="button" className="ghost" aria-pressed={view === 'table'} onClick={() => setView('table')}>
            표
          </button>
        </div>
      </div>
      <p className="meta" style={{ marginTop: 0 }}>
        천간·지지 {chars}글자 기준입니다. 지장간까지 센 개수는 괄호에 함께 표시합니다.
      </p>

      {view === 'chart' ? (
        <div className="bars" role="list">
          {ELEMENTS.map((e) => {
            const withHidden = total[e] + hidden[e]
            const detail = `${ELEMENT_KO[e]}(${ELEMENT_HANJA[e]}) ${total[e]}개 — 천간 ${stems[e]}, 지지 ${branches[e]}, 지장간 ${hidden[e]}`
            return (
              <div className="bar-row" role="listitem" tabIndex={0} data-el={e} key={e} aria-label={detail}>
                <span className="bar-label">
                  <span className="hanja" lang="zh">
                    {ELEMENT_HANJA[e]}
                  </span>{' '}
                  {ELEMENT_KO[e]}
                </span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(total[e] / max) * 100}%` }} />
                </div>
                <span className="bar-value">
                  {total[e]}개 <small>({withHidden})</small>
                </span>
                <span className="tip" aria-hidden="true">
                  {detail}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="plain">
            <caption className="sr-only">오행별 개수</caption>
            <thead>
              <tr>
                <th scope="col">오행</th>
                <th scope="col">천간</th>
                <th scope="col">지지</th>
                <th scope="col">합계</th>
                <th scope="col">지장간</th>
                <th scope="col">지장간 포함</th>
              </tr>
            </thead>
            <tbody>
              {ELEMENTS.map((e) => (
                <tr key={e}>
                  <th scope="row">
                    {ELEMENT_HANJA[e]} {ELEMENT_KO[e]}
                  </th>
                  <td>{stems[e]}</td>
                  <td>{branches[e]}</td>
                  <td>{total[e]}</td>
                  <td>{hidden[e]}</td>
                  <td>{total[e] + hidden[e]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
