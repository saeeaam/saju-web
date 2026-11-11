import type { PillarDetail, PillarKey, SajuChart } from '../core/index.ts'
import { BRANCHES, STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import { tenGodKey } from './glossary.ts'
import type { TermKey } from './glossary.ts'
import { Label } from './Label.tsx'
import { ELEMENT_PLAIN } from './labels.ts'
import { Term } from './Term.tsx'

/** 한국식 표기 순서: 시·일·월·연 (왼쪽부터) */
const ORDER: PillarKey[] = ['hour', 'day', 'month', 'year']
const HEADER: Record<PillarKey, { plain: string; term: string }> = {
  hour: { plain: '태어난 시', term: '시주' },
  day: { plain: '태어난 날', term: '일주' },
  month: { plain: '태어난 달', term: '월주' },
  year: { plain: '태어난 해', term: '연주' },
}

function ElementCell({ element, glyph, ko }: { element: Element; glyph: string; ko: string }) {
  return (
    <td className="el big" data-el={element}>
      <span className="glyph hanja" lang="zh">
        {glyph}
      </span>
      <span className="ko">
        {ko} · {ELEMENT_PLAIN[element]}
      </span>
    </td>
  )
}

function Missing() {
  return <td className="missing">—</td>
}

export function PillarTable({ chart }: { chart: SajuChart }) {
  const byKey = new Map<PillarKey, PillarDetail>(chart.pillars.map((p) => [p.key, p]))

  const row = (plain: string, term: string, render: (p: PillarDetail, key: PillarKey) => React.ReactNode) => (
    <tr>
      <th scope="row">
        <Label plain={plain} term={term} />
      </th>
      {ORDER.map((k) => {
        const p = byKey.get(k)
        return p ? render(p, k) : <Missing key={k} />
      })}
    </tr>
  )

  return (
    <div className="table-wrap">
      <table className="pillars">
        <caption className="sr-only">사주 명식표: 태어난 시, 날, 달, 해</caption>
        <thead>
          <tr>
            <td />
            {ORDER.map((k) => (
              <th scope="col" key={k}>
                <Label plain={HEADER[k].plain} term={HEADER[k].term} />
                {!byKey.has(k) && <span className="help">시간 모름</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row('위 글자의 의미', '천간 십성', (p, k) =>
            k === 'day' ? (
              <td key={k} className="day-master">
                나 <Label plain="" term="일간" />
              </td>
            ) : (
              <td key={k}>
                <Term k={tenGodKey(p.stemTenGod!.name)} />
              </td>
            ),
          )}
          {row('위 글자', '천간', (p, k) => {
            const s = STEMS[p.ganji.stem]
            return <ElementCell key={k} element={s.element} glyph={s.hanja} ko={s.ko} />
          })}
          {row('아래 글자', '지지', (p, k) => {
            const b = BRANCHES[p.ganji.branch]
            return <ElementCell key={k} element={b.element} glyph={b.hanja} ko={b.ko} />
          })}
          {row('아래 글자의 의미', '지지 십성', (p, k) => (
            <td key={k}>
              <Term k={tenGodKey(p.branchTenGod.name)} />
            </td>
          ))}
          {row('속에 숨은 글자', '지장간', (p, k) => (
            <td key={k}>
              <div className="hidden-list">
                {p.hiddenStems.map((h) => (
                  <span key={h.stem}>
                    <span className="hanja" lang="zh">
                      {STEMS[h.stem].hanja}
                    </span>
                    {STEMS[h.stem].ko} <Term k={tenGodKey(h.tenGod.name)} static />
                  </span>
                ))}
              </div>
            </td>
          ))}
          {row('기운의 단계', '12운성', (p, k) => (
            <td key={k}>
              <Term k={p.twelveStage.name as TermKey} />
            </td>
          ))}
          {row('소리로 본 오행', '납음', (p, k) => (
            <td key={k}>{p.napeum}</td>
          ))}
          {row('비어 있는 자리', '공망', (p, k) => (
            <td key={k}>{p.isVoid ? <span className="tag-void">비어 있음</span> : k === 'day' ? '—' : ''}</td>
          ))}
        </tbody>
      </table>
    </div>
  )
}
