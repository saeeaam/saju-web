import type { PillarDetail, PillarKey, SajuChart } from '../core/index.ts'
import { BRANCHES, STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import { ELEMENT_HANJA, ELEMENT_KO } from './labels.ts'

/** 한국식 표기 순서: 시·일·월·연 (왼쪽부터) */
const ORDER: PillarKey[] = ['hour', 'day', 'month', 'year']
const HEADER: Record<PillarKey, string> = { hour: '시주', day: '일주', month: '월주', year: '연주' }

function ElementCell({ element, glyph, ko, className = '' }: { element: Element; glyph: string; ko: string; className?: string }) {
  return (
    <td className={`el big ${className}`} data-el={element}>
      <span className="glyph hanja" lang="zh">
        {glyph}
      </span>
      <span className="ko">
        {ko} · {ELEMENT_HANJA[element]}
        {ELEMENT_KO[element]}
      </span>
    </td>
  )
}

function Missing({ children = '—' }: { children?: string }) {
  return <td className="missing">{children}</td>
}

export function PillarTable({ chart }: { chart: SajuChart }) {
  const byKey = new Map<PillarKey, PillarDetail>(chart.pillars.map((p) => [p.key, p]))

  const row = (label: string, render: (p: PillarDetail, key: PillarKey) => React.ReactNode) => (
    <tr>
      <th scope="row">{label}</th>
      {ORDER.map((k) => {
        const p = byKey.get(k)
        return p ? render(p, k) : <Missing key={k} />
      })}
    </tr>
  )

  return (
    <div className="table-wrap">
      <table className="pillars">
        <caption className="sr-only">사주 명식표: 시주, 일주, 월주, 연주</caption>
        <thead>
          <tr>
            <td />
            {ORDER.map((k) => (
              <th scope="col" key={k}>
                {HEADER[k]}
                {!byKey.has(k) && <span className="help">시간 모름</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row('천간 십성', (p, k) =>
            k === 'day' ? (
              <td key={k} className="day-master">
                일간(나)
              </td>
            ) : (
              <td key={k}>{p.stemTenGod!.name}</td>
            ),
          )}
          {row('천간', (p, k) => {
            const s = STEMS[p.ganji.stem]
            return <ElementCell key={k} element={s.element} glyph={s.hanja} ko={s.ko} />
          })}
          {row('지지', (p, k) => {
            const b = BRANCHES[p.ganji.branch]
            return <ElementCell key={k} element={b.element} glyph={b.hanja} ko={b.ko} />
          })}
          {row('지지 십성', (p, k) => (
            <td key={k}>{p.branchTenGod.name}</td>
          ))}
          {row('지장간', (p, k) => (
            <td key={k}>
              <div className="hidden-list">
                {p.hiddenStems.map((h) => (
                  <span key={h.stem}>
                    <span className="hanja" lang="zh">
                      {STEMS[h.stem].hanja}
                    </span>
                    {STEMS[h.stem].ko} <small>{h.tenGod.name}</small>
                  </span>
                ))}
              </div>
            </td>
          ))}
          {row('12운성', (p, k) => (
            <td key={k}>{p.twelveStage.name}</td>
          ))}
          {row('납음', (p, k) => (
            <td key={k}>{p.napeum}</td>
          ))}
          {row('공망', (p, k) => (
            <td key={k}>{p.isVoid ? <span className="tag-void">공망</span> : k === 'day' ? '—' : ''}</td>
          ))}
        </tbody>
      </table>
    </div>
  )
}
