import { useContext } from 'react'
import { RELATION_KIND_LABEL } from '../core/relations.ts'
import type { Relation, RelationMember, UnitId } from '../core/relations.ts'
import { BRANCHES, STEMS } from '../data/index.ts'
import { GLOSSARY, RELATION_TERM } from './glossary.ts'
import { elementText } from './labels.ts'
import { Term } from './Term.tsx'
import { TermContext } from './term-context.ts'

/** 위치를 쉬운 말로: 태어난 시·날·달·해, 10년 흐름, 그 해 */
const UNIT_PLAIN: Record<UnitId, string> = {
  hour: '시',
  day: '날',
  month: '달',
  year: '해',
  daeun: '10년 흐름',
  seun: '그 해',
}
const UNIT_TERM: Record<UnitId, string> = {
  hour: '시주',
  day: '일주',
  month: '월주',
  year: '연주',
  daeun: '대운',
  seun: '세운',
}

/** 명식표와 같은 순서(시·일·월·연, 그 뒤에 대운·세운)로 위치를 적는다 */
const DISPLAY_ORDER: UnitId[] = ['hour', 'day', 'month', 'year', 'daeun', 'seun']

function sortMembers(r: Relation): RelationMember[] {
  return [...r.members].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a.unit) - DISPLAY_ORDER.indexOf(b.unit) || (a.part === 'stem' ? -1 : 1),
  )
}

function placePlain(r: Relation): string {
  return sortMembers(r)
    .map((m) => `${UNIT_PLAIN[m.unit]}의 ${m.part === 'stem' ? '위' : '아래'} 글자`)
    .join(' · ')
}

function placeTerm(r: Relation): string {
  return sortMembers(r)
    .map((m) => `${UNIT_TERM[m.unit]} ${m.part === 'stem' ? '천간' : '지지'}`)
    .join(' · ')
}

/** 관계 이름을 쉬운 말로: 관련 글자를 나열하고 관계 종류를 붙인다 (예: 묘·유 부딪힘) */
function plainName(r: Relation, units: Map<UnitId, { stem: number; branch: number }>): string {
  const chars = sortMembers(r).map((m) => {
    const u = units.get(m.unit)!
    return m.part === 'stem' ? STEMS[u.stem].ko : BRANCHES[u.branch].ko
  })
  const kind = GLOSSARY[RELATION_TERM[RELATION_KIND_LABEL[r.kind]]].plain
  return `${chars.join('·')} ${kind}`
}

/** 관계 목록. 이웃 여부는 원국 기둥끼리일 때만 표시한다 */
export function RelationList({
  relations,
  units,
  empty,
}: {
  relations: Relation[]
  /** 관계에 등장하는 기둥들의 글자 (이름을 쉬운 말로 만들 때 쓴다) */
  units: { id: UnitId; stem: number; branch: number }[]
  empty: string
}) {
  const { showOriginal } = useContext(TermContext)
  if (relations.length === 0) return <p className="help">{empty}</p>
  const byId = new Map(units.map((u) => [u.id, u]))
  return (
    <div className="table-wrap">
      <table className="plain relations">
        <caption className="sr-only">글자 사이 관계 목록</caption>
        <thead>
          <tr>
            <th scope="col">관계</th>
            <th scope="col">종류</th>
            <th scope="col">위치</th>
            <th scope="col">이웃 여부</th>
          </tr>
        </thead>
        <tbody>
          {relations.map((r, i) => (
            <tr key={`${r.name}-${i}`}>
              <th scope="row">
                {plainName(r, byId)}
                {r.element && <small> ({elementText(r.element)} 기운)</small>}
                {showOriginal && (
                  <small className="term-orig">
                    {r.name}
                    {r.note ? ` · ${r.note}` : ''}
                  </small>
                )}
              </th>
              <td>
                <Term k={RELATION_TERM[RELATION_KIND_LABEL[r.kind]]} />
              </td>
              <td className="place">
                {placePlain(r)}
                {showOriginal && <small className="term-orig">{placeTerm(r)}</small>}
              </td>
              <td>{r.adjacent === null ? '—' : r.adjacent ? '이웃' : '떨어짐'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
