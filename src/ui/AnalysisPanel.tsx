import { useMemo } from 'react'
import { analyzeChart } from '../core/insight.ts'
import type { SajuChart } from '../core/index.ts'
import type { StrengthPosition } from '../core/strength.ts'
import { ELEMENT_HANJA, ELEMENT_KO } from './labels.ts'
import { RelationList } from './RelationList.tsx'

const POSITION_LABEL: Record<StrengthPosition, string> = {
  monthBranch: '월지',
  dayBranch: '일지',
  hourBranch: '시지',
  yearBranch: '연지',
  monthStem: '월간',
  hourStem: '시간',
  yearStem: '연간',
}

const PILLAR_KO = { hour: '시', day: '일', month: '월', year: '연' } as const

function Mark({ on, label }: { on: boolean; label: string }) {
  // 색이 아니라 기호와 글자로 구분한다
  return (
    <span className="badge" data-on={on}>
      {label} {on ? '○' : '×'}
    </span>
  )
}

export function AnalysisPanel({ chart }: { chart: SajuChart }) {
  const insight = useMemo(() => analyzeChart(chart), [chart])
  const { strength, yongshin, shinsal, interpretation } = insight
  const { strongAt, weakAt } = strength.config

  return (
    <>
      <section aria-labelledby="strength-title">
        <h2 id="strength-title">일간의 강약 (참고)</h2>
        <div
          className="meter"
          role="meter"
          aria-label="일간을 돕는 기운의 비율"
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
          {strength.label} <span style={{ fontWeight: 400 }}>· 돕는 기운 {strength.percent.toFixed(0)}%</span>
        </p>
        <div className="row" style={{ marginTop: 4 }}>
          <Mark on={strength.deukryeong} label="득령(월지)" />
          <Mark on={strength.deukji} label="득지(일지)" />
          <Mark on={strength.deukse} label="득세(나머지)" />
        </div>
        <p className="help">
          {weakAt}% 이하 신약, {strongAt}% 이상 신강, 그 사이는 중화로 나눈 하나의 기준입니다. 표준 기준은 없으며 지장간은 정기만 반영했습니다.
        </p>
        <details className="options">
          <summary>계산 근거 (자리별 가중치)</summary>
          <div className="table-wrap">
            <table className="plain">
              <caption className="sr-only">자리별 가중치와 일간을 돕는지 여부</caption>
              <thead>
                <tr>
                  <th scope="col">자리</th>
                  <th scope="col">십성 묶음</th>
                  <th scope="col">가중치</th>
                  <th scope="col">일간을 돕나</th>
                </tr>
              </thead>
              <tbody>
                {strength.details.map((d) => (
                  <tr key={d.position}>
                    <th scope="row">{POSITION_LABEL[d.position]}</th>
                    <td>{d.group}</td>
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
        <h2 id="relation-title">합·충·형·파·해</h2>
        <p className="help" style={{ marginTop: 0 }}>
          원국 네 기둥의 천간·지지 사이 관계입니다. 합이 실제로 다른 오행으로 변하는지(합화)는 조건이 복잡해 판정하지 않고, 합했을 때 가리키는 오행만 괄호로 표시합니다.
        </p>
        <RelationList relations={insight.relations} empty="원국 안에서 합·충·형·파·해 관계가 없습니다." />
      </section>

      <section aria-labelledby="yongshin-title">
        <h2 id="yongshin-title">용신 후보 (참고)</h2>
        <div className="cards">
          <div className="card">
            <h3>억부</h3>
            <p className="meta" style={{ marginTop: 0 }}>
              {yongshin.eokbu.note}
            </p>
            {yongshin.eokbu.candidates.length > 0 && (
              <ol className="candidates">
                {yongshin.eokbu.candidates.map((c) => (
                  <li key={c.group}>
                    <strong>
                      {c.group} · <span className="hanja" lang="zh">{ELEMENT_HANJA[c.element]}</span>
                      {ELEMENT_KO[c.element]}
                    </strong>{' '}
                    <small>원국 {c.count}개</small>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="card">
            <h3>조후 (간략)</h3>
            {yongshin.johu.needed ? (
              <p className="meta" style={{ marginTop: 0 }}>
                월지가 {yongshin.johu.season}한 계절이라{' '}
                <strong>
                  <span className="hanja" lang="zh">{ELEMENT_HANJA[yongshin.johu.needed]}</span>
                  {ELEMENT_KO[yongshin.johu.needed]}
                </strong>
                을(를) 필요한 기운으로 봅니다. 원국에는 {yongshin.johu.count}개 있습니다.
              </p>
            ) : (
              <p className="meta" style={{ marginTop: 0 }}>
                월지가 한열이 한쪽으로 치우친 계절이 아니어서 계절만으로는 필요한 기운을 정하지 않았습니다.
              </p>
            )}
          </div>
        </div>
        {yongshin.overlap.length > 0 && (
          <p className="meta">
            억부와 조후가 모두 가리키는 오행: {yongshin.overlap.map((e) => `${ELEMENT_HANJA[e]}${ELEMENT_KO[e]}`).join(', ')}
          </p>
        )}
        <ul className="help notes">
          {yongshin.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="shinsal-title">
        <h2 id="shinsal-title">신살 (참고 표지)</h2>
        <p className="help" style={{ marginTop: 0 }}>
          신살은 학파마다 정의가 다르고 신뢰도에 대한 논란도 있어 참고 표지로만 표시합니다. 천을귀인은 일간, 도화·역마·화개는 일지·연지를 기준으로 했습니다.
        </p>
        {shinsal.length === 0 ? (
          <p className="meta">해당하는 신살이 없습니다.</p>
        ) : (
          <ul className="chips">
            {shinsal.map((s) => (
              <li key={`${s.name}-${s.base}-${s.target}`}>
                <strong>{s.name}</strong> <small>({s.base} 기준) · {s.found.map((k) => PILLAR_KO[k] + '주').join(', ')}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reading-title">
        <h2 id="reading-title">해석 요약</h2>
        <p className="help" style={{ marginTop: 0 }}>
          계산 결과를 규칙에 따라 문장으로 옮긴 전통 해석의 한 갈래입니다. 같은 입력이면 항상 같은 문장이 나오며, 예측이 아니라 참고용입니다.
        </p>
        <div className="cards">
          {interpretation.map((s) => (
            <article className="card reading" key={s.id}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <p className="basis">근거: {s.basis}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
