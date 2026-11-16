import { useMemo, useState } from 'react'
import type { ReadingFeatures } from '../core/features.ts'
import { buildFlowReading } from '../core/flow-reading.ts'
import type { FlowReading } from '../core/flow-reading.ts'
import type { SajuChart } from '../core/index.ts'
import { ganjiHanja, ganjiName, seunPillar } from '../core/index.ts'
import { natalUnits } from '../core/insight.ts'
import { YEAR_MS, currentDaeunIndex } from './daeun-utils.ts'
import { Label } from './Label.tsx'
import { RelationList } from './RelationList.tsx'

/** 고른 시기의 풀이: 제목, 문단, 조언, 접힌 근거 */
function FlowDetail({ heading, reading, units }: { heading: string; reading: FlowReading; units: Parameters<typeof RelationList>[0]['units'] }) {
  return (
    <article className="flow-detail" aria-label={heading}>
      <h3>{heading}</h3>
      {reading.body.map((sentence, i) => (
        <p key={i}>{sentence}</p>
      ))}
      <p className="flow-advice">
        <span aria-hidden="true">👉</span> <strong>이렇게 보내면 좋아요:</strong> {reading.advice}
      </p>
      <details className="flow-basis">
        <summary>근거 자세히</summary>
        <ul>
          {reading.basis.map((b, i) => (
            <li key={i}>{b.term ? <Label plain={b.plain} term={b.term} /> : b.plain}</li>
          ))}
        </ul>
        <RelationList relations={reading.relations} units={units} empty="내 사주와 눈에 띄는 어울림이나 부딪힘이 없습니다." />
      </details>
    </article>
  )
}

export function DaeunTimeline({ chart, now, features }: { chart: SajuChart; now: Date; features: ReadingFeatures }) {
  const current = currentDaeunIndex(chart, now)
  const [selected, setSelected] = useState(Math.max(current, 0))
  const [pickedYear, setPickedYear] = useState<number | null>(null)
  const natal = natalUnits(chart)

  // 10년마다의 풀이 (카드 제목과 고른 시기의 문단)
  const decades = useMemo(
    () =>
      chart.daeun.pillars.map((p) => ({
        start: Math.floor(p.startAge),
        ganji: p.ganji,
        reading: buildFlowReading(chart, features, p.ganji, 'decade'),
      })),
    [chart, features],
  )
  const sel = chart.daeun.pillars[selected]
  const selDecade = decades[selected]

  // 선택한 10년이 시작하는 양력 연도부터 10년 (연도 경계는 근사)
  const startYear = new Date(chart.instantMs + sel.startAge * YEAR_MS + 9 * 3_600_000).getUTCFullYear()
  const thisYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear()
  const inRange = (y: number) => y >= startYear && y <= startYear + 9
  const year = pickedYear !== null && inRange(pickedYear) ? pickedYear : inRange(thisYear) ? thisYear : startYear

  const years = useMemo(
    () =>
      Array.from({ length: 10 }, (_, k) => {
        const y = startYear + k
        const g = seunPillar(y)
        return { year: y, ganji: g, reading: buildFlowReading(chart, features, g, 'year') }
      }),
    [chart, features, startYear],
  )
  const selYear = years.find((y) => y.year === year)!

  const range = (start: number) => `${start}~${start + 9}세`

  return (
    <section aria-labelledby="daeun-title">
      <h2 id="daeun-title">
        <Label plain="10년 흐름과 해마다의 흐름" term="대운·세운" />
      </h2>
      <p className="help" style={{ marginTop: 0 }}>
        삶은 10년마다 큰 흐름이 바뀌고, 그 안에서 해마다 작은 흐름이 바뀐다고 봅니다. 카드를 누르면 그 시기가 내 사주에 어떻게 작용하는지 풀어
        드립니다. 단정이 아니라 "이런 일이 생기기 쉽다"는 참고입니다.
      </p>

      <h3 className="flow-sub">10년 흐름</h3>
      <div className="daeun-scroll">
        <ol className="daeun" aria-label="10년 흐름 목록">
          {decades.map((d, i) => (
            <li key={d.ganji.index + '-' + i}>
              <button type="button" className="daeun-card flow-card" aria-pressed={i === selected} onClick={() => setSelected(i)}>
                <span className="age">{range(d.start)}</span>
                <span className="flow-title">{d.reading.title}</span>
                {d.reading.base && <span className="sub">바탕: {d.reading.base}</span>}
                {i === current && <span className="now-tag">지금</span>}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <FlowDetail
        heading={`${range(selDecade.start)}${selected === current ? ' (지금)' : ''} · ${selDecade.reading.title}`}
        reading={selDecade.reading}
        units={[...natal, { id: 'daeun', stem: sel.ganji.stem, branch: sel.ganji.branch }]}
      />

      <h3 className="flow-sub">
        {range(selDecade.start)} 동안 해마다의 흐름
      </h3>
      <p className="help">양력 연도 기준입니다. 사주의 해는 입춘(2월 4일 무렵)에 바뀌므로 1월은 앞 해의 흐름에 가깝습니다.</p>
      <ul className="seun" aria-label="해마다의 흐름 목록">
        {years.map((y) => (
          <li key={y.year} data-now={y.year === thisYear} data-selected={y.year === year}>
            <button type="button" className="seun-card flow-card" aria-pressed={y.year === year} onClick={() => setPickedYear(y.year)}>
              <span className="age">
                {y.year}년{' '}
                <span className="sr-only">흐름</span>
              </span>
              <span className="flow-title">{y.reading.title}</span>
              {y.year === thisYear && <span className="now-tag">올해</span>}
            </button>
          </li>
        ))}
      </ul>

      <FlowDetail
        heading={`${year}년${year === thisYear ? ' (올해)' : ''} · ${selYear.reading.title}`}
        reading={selYear.reading}
        units={[...natal, { id: 'seun', stem: selYear.ganji.stem, branch: selYear.ganji.branch }]}
      />
      <p className="help">
        들어오는 글자: {ganjiName(selDecade.ganji)}(10년) · {ganjiName(selYear.ganji)}({year}년) <span className="hanja" lang="zh">{ganjiHanja(selDecade.ganji)} {ganjiHanja(selYear.ganji)}</span>
      </p>
    </section>
  )
}
