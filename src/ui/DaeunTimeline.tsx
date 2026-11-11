import { useState } from 'react'
import { tenGodOfStem, twelveStage } from '../core/analysis.ts'
import type { SajuChart } from '../core/index.ts'
import { ganjiHanja, ganjiName, seunPillar } from '../core/index.ts'
import { natalUnits } from '../core/insight.ts'
import { relationsWithExtra } from '../core/relations.ts'
import { BRANCHES } from '../data/index.ts'
import { YEAR_MS, currentDaeunIndex } from './daeun-utils.ts'
import { tenGodKey } from './glossary.ts'
import type { TermKey } from './glossary.ts'
import { Label } from './Label.tsx'
import { RelationList } from './RelationList.tsx'
import { Term } from './Term.tsx'

function startLabel(chart: SajuChart): string {
  const s = chart.daeun.start
  if (chart.options.daeunAgeFormat === 'integer') return `${s.age}세`
  const parts = [`${s.years}세`]
  if (s.months) parts.push(`${s.months}개월`)
  if (s.days) parts.push(`${s.days}일`)
  return parts.join(' ')
}

export function DaeunTimeline({ chart, now }: { chart: SajuChart; now: Date }) {
  const current = currentDaeunIndex(chart, now)
  const [selected, setSelected] = useState(Math.max(current, 0))
  const [pickedYear, setPickedYear] = useState<number | null>(null)
  const sel = chart.daeun.pillars[selected]

  // 선택한 대운이 시작하는 양력 연도부터 10년의 세운 (연도 경계는 근사)
  const startYear = new Date(chart.instantMs + sel.startAge * YEAR_MS + 9 * 3_600_000).getUTCFullYear()
  const thisYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear()
  const inRange = (y: number) => y >= startYear && y <= startYear + 9
  // 고른 해가 이 대운 안에 있으면 그 해, 아니면 올해(대운 안이면), 아니면 첫 해
  const seunYear = pickedYear !== null && inRange(pickedYear) ? pickedYear : inRange(thisYear) ? thisYear : startYear

  const natal = natalUnits(chart)
  const daeunUnit = { id: 'daeun' as const, stem: sel.ganji.stem, branch: sel.ganji.branch }
  const seunGanji = seunPillar(seunYear)
  const seunUnit = { id: 'seun' as const, stem: seunGanji.stem, branch: seunGanji.branch }
  const daeunRelations = relationsWithExtra(natal, [daeunUnit])
  // 세운은 원국뿐 아니라 선택한 대운과도 관계를 맺는다
  const seunRelations = relationsWithExtra([...natal, daeunUnit], [seunUnit])

  return (
    <section aria-labelledby="daeun-title">
      <h2 id="daeun-title">
        <Label plain="10년 흐름과 해마다의 흐름" term="대운·세운" />
      </h2>
      <p className="meta" style={{ marginTop: 0 }}>
        <Term k={chart.daeun.forward ? '순행' : '역행'} /> · 첫 10년 흐름 시작: {startLabel(chart)}
      </p>

      <div className="daeun-scroll">
        <ol className="daeun" aria-label="10년 흐름 목록">
          {chart.daeun.pillars.map((p, i) => {
            const stage = twelveStage(chart.dayMaster, p.ganji.branch, chart.options.earthStageRule)
            return (
              <li key={p.ganji.index + '-' + i}>
                <button type="button" className="daeun-card" aria-pressed={i === selected} onClick={() => setSelected(i)}>
                  <span className="age">
                    {Math.floor(p.startAge)}세~{' '}
                    <span className="sr-only">10년 흐름</span>
                  </span>
                  <span className="glyph hanja" lang="zh">
                    {ganjiHanja(p.ganji)}
                  </span>
                  <span className="sub">{ganjiName(p.ganji)}</span>
                  {/* 버튼 안이라 누를 수 없는 글자로 표시한다 */}
                  <span className="sub">
                    <Term k={tenGodKey(tenGodOfStem(chart.dayMaster, p.ganji.stem).name)} static />
                  </span>
                  <span className="sub">
                    <Term k={stage.name as TermKey} static />
                  </span>
                  {i === current && <span className="now-tag">현재</span>}
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <h3 style={{ fontSize: '1rem', margin: '16px 0 0' }}>
        {Math.floor(sel.startAge)}세부터의 10년 흐름({ganjiName(sel.ganji)}) 동안 해마다의 흐름
      </h3>
      <p className="help">양력 연도 기준 근사입니다. 사주의 해는 입춘(2월 4일 무렵)에 바뀌므로 1~2월은 경계에서 다를 수 있습니다.</p>
      <ul className="seun" aria-label="해마다의 흐름 목록">
        {Array.from({ length: 10 }, (_, k) => {
          const year = startYear + k
          const g = seunPillar(year)
          return (
            <li key={year} data-now={year === thisYear} data-selected={year === seunYear}>
              <button type="button" className="seun-card" aria-pressed={year === seunYear} onClick={() => setPickedYear(year)}>
                <span>
                  {year}년{' '}
                  <span className="sr-only">흐름</span>
                </span>
                <span className="glyph hanja" lang="zh">
                  {ganjiHanja(g)}
                </span>
                <span>
                  {ganjiName(g)} · <Term k={tenGodKey(tenGodOfStem(chart.dayMaster, g.stem).name)} static />
                </span>
                <span className="help">{BRANCHES[g.branch].animal}띠</span>
              </button>
            </li>
          )
        })}
      </ul>

      <h3 style={{ fontSize: '1rem', margin: '20px 0 4px' }}>
        {Math.floor(sel.startAge)}세부터의 10년 흐름({ganjiName(sel.ganji)})과 내 사주의 관계
      </h3>
      <RelationList relations={daeunRelations} units={[...natal, daeunUnit]} empty="내 사주와 눈에 띄는 어울림이나 부딪힘이 없습니다." />

      <h3 style={{ fontSize: '1rem', margin: '20px 0 4px' }}>
        {seunYear}년의 흐름({ganjiName(seunGanji)})과 내 사주·10년 흐름의 관계
      </h3>
      <RelationList
        relations={seunRelations}
        units={[...natal, daeunUnit, seunUnit]}
        empty="내 사주·10년 흐름과 눈에 띄는 어울림이나 부딪힘이 없습니다."
      />
      <p className="help">관계가 있다는 것만 보여줍니다. 그 영향의 크기나 좋고 나쁨은 판단하지 않습니다.</p>
    </section>
  )
}
