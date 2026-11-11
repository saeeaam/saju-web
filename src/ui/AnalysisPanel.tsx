import { useMemo } from 'react'
import { analyzeChart, natalUnits } from '../core/insight.ts'
import type { SajuChart } from '../core/index.ts'
import type { StrengthPosition } from '../core/strength.ts'
import { BRANCHES } from '../data/index.ts'
import type { TermKey } from './glossary.ts'
import { Label } from './Label.tsx'
import { ELEMENT_HANJA, elementText } from './labels.ts'
import { RelationList } from './RelationList.tsx'
import { Term } from './Term.tsx'

const POSITION_LABEL: Record<StrengthPosition, { plain: string; term: string }> = {
  monthBranch: { plain: '태어난 달의 아래 글자', term: '월지' },
  dayBranch: { plain: '태어난 날의 아래 글자', term: '일지' },
  hourBranch: { plain: '태어난 시의 아래 글자', term: '시지' },
  yearBranch: { plain: '태어난 해의 아래 글자', term: '연지' },
  monthStem: { plain: '태어난 달의 위 글자', term: '월간' },
  hourStem: { plain: '태어난 시의 위 글자', term: '시간' },
  yearStem: { plain: '태어난 해의 위 글자', term: '연간' },
}

const PILLAR_PLAIN = { hour: '태어난 시', day: '태어난 날', month: '태어난 달', year: '태어난 해' } as const

function Mark({ on, k }: { on: boolean; k: TermKey }) {
  // 색이 아니라 기호와 글자로 구분한다
  return (
    <span className="badge" data-on={on}>
      <Term k={k} static /> {on ? '○ 있음' : '× 없음'}
    </span>
  )
}

export function AnalysisPanel({ chart }: { chart: SajuChart }) {
  const insight = useMemo(() => analyzeChart(chart), [chart])
  const units = useMemo(() => natalUnits(chart), [chart])
  const { strength, yongshin, shinsal } = insight
  const { strongAt, weakAt } = strength.config

  return (
    <>
      <section aria-labelledby="strength-title">
        <h2 id="strength-title">
          <Label plain="내 기운의 세기" term="신강·신약" /> (참고)
        </h2>
        <div
          className="meter"
          role="meter"
          aria-label="나를 돕는 기운의 비율"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(strength.percent)}
          aria-valuetext={`${Math.round(strength.percent)}퍼센트, ${strength.label}`}
        >
          <div className="meter-fill" style={{ width: `${strength.percent}%` }} />
          <span className="meter-tick" style={{ left: `${weakAt}%` }} aria-hidden="true" />
          <span className="meter-tick" style={{ left: `${strongAt}%` }} aria-hidden="true" />
        </div>
        <div className="meter-scale" aria-hidden="true">
          <span style={{ left: `${weakAt}%` }}>{weakAt}</span>
          <span style={{ left: `${strongAt}%` }}>{strongAt}</span>
        </div>
        <p className="summary" style={{ marginTop: 8 }}>
          <Term k={strength.label} /> <span style={{ fontWeight: 400 }}>· 나를 돕는 기운 {strength.percent.toFixed(0)}%</span>
        </p>
        <div className="row" style={{ marginTop: 4 }}>
          <Mark on={strength.deukryeong} k="득령" />
          <Mark on={strength.deukji} k="득지" />
          <Mark on={strength.deukse} k="득세" />
        </div>
        <p className="help">
          나를 돕는 기운이 {weakAt}% 이하면 약한 편, {strongAt}% 이상이면 강한 편, 그 사이는 균형으로 나눈 하나의 기준입니다. 정해진 표준은
          없습니다. 강하고 약한 것은 좋고 나쁨이 아니라 성향의 차이입니다.
        </p>
        <details className="options">
          <summary>계산 근거 (자리별 비중)</summary>
          <div className="table-wrap">
            <table className="plain">
              <caption className="sr-only">자리별 비중과 나를 돕는지 여부</caption>
              <thead>
                <tr>
                  <th scope="col">자리</th>
                  <th scope="col">나와의 관계</th>
                  <th scope="col">비중</th>
                  <th scope="col">나를 돕나</th>
                </tr>
              </thead>
              <tbody>
                {strength.details.map((d) => (
                  <tr key={d.position}>
                    <th scope="row">
                      <Label plain={POSITION_LABEL[d.position].plain} term={POSITION_LABEL[d.position].term} />
                    </th>
                    <td>
                      <Term k={d.group as TermKey} />
                    </td>
                    <td>{d.weight}</td>
                    <td>{d.helps ? '돕는다 ○' : '아니다 ×'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">합계</th>
                  <td />
                  <td>{strength.totalWeight}</td>
                  <td>{strength.helpWeight}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </details>
      </section>

      <section aria-labelledby="relation-title">
        <h2 id="relation-title">
          <Label plain="글자 사이의 어울림과 부딪힘" term="합·충·형·파·해" />
        </h2>
        <p className="help" style={{ marginTop: 0 }}>
          내 사주 여덟 글자 사이에 어떤 관계가 있는지 보여줍니다. 어울리면 서로 묶이고, 부딪히면 변화와 움직임이 생긴다고 봅니다. 묶인
          글자가 실제로 다른 기운으로 바뀌는지는 조건이 복잡해 판단하지 않았습니다.
        </p>
        <RelationList relations={insight.relations} units={units} empty="내 사주 안에서 눈에 띄는 어울림이나 부딪힘이 없습니다." />
      </section>

      <section aria-labelledby="yongshin-title">
        <h2 id="yongshin-title">
          <Label plain="나에게 도움이 되는 기운" term="용신 후보" /> (참고)
        </h2>
        <div className="cards">
          <div className="card">
            <h3>
              <Term k="억부" />
            </h3>
            <p className="meta" style={{ marginTop: 0 }}>
              {strength.label === '중화'
                ? '나를 돕는 기운과 누르는 기운이 균형에 가까워, 이 기준으로는 특별히 채울 기운이 뚜렷하지 않습니다.'
                : strength.label === '신강'
                  ? '내 기운이 강한 편이라, 그 힘을 밖으로 쓰게 해 주는 기운을 도움이 되는 쪽으로 봅니다. 내 사주에 적은 것부터 적었습니다.'
                  : '내 기운이 약한 편이라, 나를 도와주는 기운을 도움이 되는 쪽으로 봅니다. 내 사주에 적은 것부터 적었습니다.'}
            </p>
            {yongshin.eokbu.candidates.length > 0 && (
              <ol className="candidates">
                {yongshin.eokbu.candidates.map((c) => (
                  <li key={c.group}>
                    <strong>
                      <span className="hanja" lang="zh">
                        {ELEMENT_HANJA[c.element]}
                      </span>
                      {elementText(c.element)} 기운
                    </strong>{' '}
                    · <Term k={c.group as TermKey} /> <small>내 사주에 {c.count}개</small>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="card">
            <h3>
              <Term k="조후" /> <small>(간략)</small>
            </h3>
            {yongshin.johu.needed ? (
              <p className="meta" style={{ marginTop: 0 }}>
                {yongshin.johu.season === '한(寒)' ? '추운 계절(겨울)' : '더운 계절(여름)'}에 태어나{' '}
                <strong>
                  <span className="hanja" lang="zh">
                    {ELEMENT_HANJA[yongshin.johu.needed]}
                  </span>
                  {elementText(yongshin.johu.needed)} 기운
                </strong>
                ({yongshin.johu.needed === 'fire' ? '따뜻함' : '시원함'})이 도움이 된다고 봅니다. 내 사주에는 {yongshin.johu.count}개 있습니다.
              </p>
            ) : (
              <p className="meta" style={{ marginTop: 0 }}>
                봄·가을처럼 춥거나 덥지 않은 계절에 태어나, 계절만으로는 특별히 필요한 기운을 정하지 않았습니다.
              </p>
            )}
          </div>
        </div>
        {yongshin.overlap.length > 0 && (
          <p className="meta">
            두 기준이 함께 가리키는 기운: {yongshin.overlap.map((e) => elementText(e)).join(', ')}
          </p>
        )}
        <ul className="help notes">
          <li>도움이 되는 기운은 보는 사람(학파)마다 다르게 잡으며, 정답이 하나로 정해져 있지 않습니다. 아래 두 기준의 후보를 함께 보여드립니다.</li>
          <li>계절 기준은 겨울·여름만 따진 간단한 판정입니다.</li>
        </ul>
      </section>

      <section aria-labelledby="shinsal-title">
        <h2 id="shinsal-title">
          <Label plain="옛 이름표" term="신살" /> (참고)
        </h2>
        <p className="help" style={{ marginTop: 0 }}>
          특정 글자 조합에 붙이는 옛 이름표입니다. 보는 사람마다 기준이 다르고 근거 논란도 있어 참고로만 보여드립니다.
        </p>
        {shinsal.length === 0 ? (
          <p className="meta">해당하는 이름표가 없습니다.</p>
        ) : (
          <ul className="chips">
            {shinsal.map((s) => (
              <li key={`${s.name}-${s.base}-${s.target}`}>
                <Term k={s.name as TermKey} />{' '}
                <small>
                  {s.found.map((k) => PILLAR_PLAIN[k]).join(', ')}의 {BRANCHES[s.target].ko}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>

    </>
  )
}
