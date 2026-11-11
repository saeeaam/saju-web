import { useCallback, useMemo, useState } from 'react'
import { calculateSaju, ganjiHanja, ganjiName } from './core/index.ts'
import type { SajuChart } from './core/index.ts'
import { BRANCHES, STEMS } from './data/index.ts'
import type { BirthInput } from './types/input.ts'
import { DEFAULT_OPTIONS } from './types/options.ts'
import type { SajuOptions } from './types/options.ts'
import { AnalysisPanel } from './ui/AnalysisPanel.tsx'
import { DaeunTimeline } from './ui/DaeunTimeline.tsx'
import { ElementChart } from './ui/ElementChart.tsx'
import { InputForm } from './ui/InputForm.tsx'
import { ELEMENT_HANJA, ELEMENT_KO, WARNING_TEXT } from './ui/labels.ts'
import { OptionsPanel } from './ui/OptionsPanel.tsx'
import { PillarTable } from './ui/PillarTable.tsx'
import { ZiweiPanel } from './ui/ZiweiPanel.tsx'
import { describeClock } from './ui/format.ts'
import type { TermKey } from './ui/glossary.ts'
import { Term } from './ui/Term.tsx'
import { TermContext } from './ui/term-context.ts'
import { TermDialog } from './ui/TermDialog.tsx'

type Computed = { chart: SajuChart } | { error: string }

function compute(input: BirthInput | null, options: SajuOptions): Computed | null {
  if (!input) return null
  try {
    return { chart: calculateSaju(input, options) }
  } catch (e) {
    return { error: e instanceof RangeError ? e.message : '계산 중 오류가 발생했습니다.' }
  }
}

export default function App({ now }: { now?: Date }) {
  const [input, setInput] = useState<BirthInput | null>(null)
  const [options, setOptions] = useState<SajuOptions>(DEFAULT_OPTIONS)
  const result = useMemo(() => compute(input, options), [input, options])
  const chart = result && 'chart' in result ? result.chart : null
  const error = result && 'error' in result ? result.error : null
  // 현재 시각은 화면이 처음 만들어질 때 한 번만 정한다 (렌더마다 바뀌지 않게)
  const [currentTime] = useState(() => now ?? new Date())
  // 전문 용어 함께 보기 (기본 켜짐), 용어 설명 창
  const [showOriginal, setShowOriginal] = useState(true)
  const [openTerm, setOpenTerm] = useState<TermKey | null>(null)
  const closeTerm = useCallback(() => setOpenTerm(null), [])
  const termContext = useMemo(() => ({ showOriginal, openTerm: setOpenTerm }), [showOriginal])

  return (
    <TermContext.Provider value={termContext}>
    <main>
      <h1>사주 명식</h1>
      <p className="lead">태어난 날과 시각으로 사주 여덟 글자와 10년 단위 흐름을 계산합니다. 참고용이며 예측이 아닙니다.</p>

      <InputForm onSubmit={setInput} needsPlace={options.solarTimeCorrection === 'longitude'} externalError={error}>
        <OptionsPanel options={options} onChange={setOptions} />
      </InputForm>

      {chart && (
        <>
          <div className="term-toggle">
            <label>
              <input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />
              전문 용어 함께 보기
            </label>
            <span className="help">밑줄 친 말을 누르면 뜻을 볼 수 있습니다.</span>
          </div>
          <div aria-live="polite">
            <Result chart={chart} now={currentTime} />
          </div>
        </>
      )}

      <footer className="disclaimer">
        <p>
          사주명리와 자미두수는 전통 해석 체계이며, 과학적으로 검증된 예측 방법이 아닙니다. 의료·법률·투자 등 중요한 결정의
          근거로 사용하지 마세요.
        </p>
        <p>
          이 결과는 위에서 선택한 계산 기준(기본: 해는 입춘에 바뀜, 날짜는 자정에 바뀜, 그 시절 시간 제도 반영)에 따른 것이며,
          다른 만세력과 결과가 다를 수 있습니다. 절기 데이터는 한국천문연구원 자료에 기반한 라이브러리를 사용합니다.
        </p>
        {/* 고지 파일은 빌드할 때 만들어지므로 배포본에서만 링크를 보인다 */}
        {import.meta.env.PROD && (
          <p>
            <a href={`${import.meta.env.BASE_URL}THIRD_PARTY_LICENSES.txt`}>오픈소스 라이선스 고지</a>
          </p>
        )}
      </footer>
      <TermDialog term={openTerm} onClose={closeTerm} />
    </main>
    </TermContext.Provider>
  )
}

function Result({ chart, now }: { chart: SajuChart; now: Date }) {
  const names = chart.pillars.map((p) => ({ key: p.key, text: ganjiName(p.ganji) }))
  const label = { year: '년', month: '월', day: '일', hour: '시' } as const
  const dm = STEMS[chart.dayMaster]
  const dayBranch = BRANCHES[chart.pillars.find((p) => p.key === 'day')!.ganji.branch]

  return (
    <>
      <h2>내 사주</h2>
      <p className="summary">
        {names.map((n) => `${n.text}${label[n.key]}`).join(' ')}
        <span className="hanja" lang="zh" style={{ marginLeft: 8, fontWeight: 400 }}>
          {chart.pillars.map((p) => ganjiHanja(p.ganji)).join(' ')}
        </span>
      </p>
      <p className="meta">
        <Term k="일간" />: {dm.ko}
        {ELEMENT_KO[dm.element]}(<span className="hanja" lang="zh">{dm.hanja}{ELEMENT_HANJA[dm.element]}</span>) · 태어난 날의 띠 동물:{' '}
        {dayBranch.animal} · <Term k="공망" />: {chart.voidBranches.map((b) => BRANCHES[b].ko).join('·')}
      </p>
      <p className="meta">{describeClock(chart)}</p>

      {chart.warnings.length > 0 && (
        <ul className="warnings" aria-label="확인이 필요한 사항">
          {chart.warnings.map((w) => (
            <li key={w}>
              <span aria-hidden="true">⚠</span>
              <span>{WARNING_TEXT[w]}</span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 16 }}>
        <PillarTable chart={chart} />
      </div>
      <ElementChart chart={chart} />
      <AnalysisPanel chart={chart} />
      <DaeunTimeline chart={chart} now={now} />
      <ZiweiPanel chart={chart} now={now} />
    </>
  )
}
