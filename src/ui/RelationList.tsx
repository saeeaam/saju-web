import { RELATION_KIND_LABEL } from '../core/relations.ts'
import type { Relation, RelationMember, UnitId } from '../core/relations.ts'
import { ELEMENT_KO } from './labels.ts'

const UNIT_LABEL: Record<UnitId, string> = {
  hour: '시주',
  day: '일주',
  month: '월주',
  year: '연주',
  daeun: '대운',
  seun: '세운',
}

function memberText(m: RelationMember): string {
  return `${UNIT_LABEL[m.unit]} ${m.part === 'stem' ? '천간' : '지지'}`
}

/** 명식표와 같은 순서(시·일·월·연, 그 뒤에 대운·세운)로 위치를 적는다 */
const DISPLAY_ORDER: UnitId[] = ['hour', 'day', 'month', 'year', 'daeun', 'seun']

function relationPlace(r: Relation): string {
  return [...r.members]
    .sort((a, b) => DISPLAY_ORDER.indexOf(a.unit) - DISPLAY_ORDER.indexOf(b.unit) || (a.part === 'stem' ? -1 : 1))
    .map(memberText)
    .join(' · ')
}

/** 관계 목록. 인접 여부는 원국 기둥끼리일 때만 표시한다 */
export function RelationList({ relations, empty }: { relations: Relation[]; empty: string }) {
  if (relations.length === 0) return <p className="help">{empty}</p>
  return (
    <div className="table-wrap">
      <table className="plain relations">
        <caption className="sr-only">합충형파해 관계 목록</caption>
        <thead>
          <tr>
            <th scope="col">관계</th>
            <th scope="col">종류</th>
            <th scope="col">위치</th>
            <th scope="col">인접</th>
          </tr>
        </thead>
        <tbody>
          {relations.map((r, i) => (
            <tr key={`${r.name}-${i}`}>
              <th scope="row">
                {r.name}
                {r.element && <small> ({ELEMENT_KO[r.element]})</small>}
                {r.note && <span className="help">{r.note}</span>}
              </th>
              <td>{RELATION_KIND_LABEL[r.kind]}</td>
              <td className="place">{relationPlace(r)}</td>
              <td>{r.adjacent === null ? '—' : r.adjacent ? '인접' : '떨어짐'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
