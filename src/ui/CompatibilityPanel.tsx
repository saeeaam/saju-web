import { useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { buildCompatibility } from '../core/compatibility.ts'
import type { CompatibilityReading } from '../core/compatibility.ts'
import { calculateSaju, ganjiName } from '../core/index.ts'
import type { SajuChart } from '../core/index.ts'
import type { BirthInput } from '../types/input.ts'
import type { SajuOptions } from '../types/options.ts'
import { EMPTY_FORM, toBirthInput } from './form-utils.ts'
import type { FormValues } from './form-utils.ts'
import { Label } from './Label.tsx'

type CompatResult = { partnerChart: SajuChart; reading: CompatibilityReading } | { error: string }

/**
 * 궁합 보기: 상대의 생년월일시를 받아 두 사람의 관계를 풀어 준다.
 * 상대 정보도 브라우저 안에서만 계산하고 저장하지 않는다.
 */
export function CompatibilityPanel({ chart, options }: { chart: SajuChart; options: SajuOptions }) {
  const id = useId()
  const [v, setV] = useState<FormValues>({ ...EMPTY_FORM, gender: chart.input.gender === 'male' ? 'female' : 'male' })
  const [partner, setPartner] = useState<BirthInput | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setV((prev) => ({ ...prev, [key]: value }))

  // 상대의 출생지는 받지 않으므로, 경도 보정을 켰더라도 상대는 보정 없이 계산한다
  const longitudeSkipped = options.solarTimeCorrection === 'longitude'
  const partnerOptions = useMemo<SajuOptions>(
    () => ({ ...options, solarTimeCorrection: longitudeSkipped ? 'none' : options.solarTimeCorrection }),
    [options, longitudeSkipped],
  )

  const result = useMemo<CompatResult | null>(() => {
    if (!partner) return null
    try {
      const partnerChart = calculateSaju(partner, partnerOptions)
      return { partnerChart, reading: buildCompatibility(chart, partnerChart) }
    } catch (e) {
      return { error: e instanceof RangeError ? e.message : '계산 중 오류가 발생했습니다.' }
    }
  }, [partner, partnerOptions, chart])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const r = toBirthInput({ ...v, placeId: 'custom', customLongitude: '' })
    if ('error' in r) {
      setFormError(r.error)
      return
    }
    setFormError(null)
    setPartner(r.input)
  }

  const error = formError ?? (result && 'error' in result ? result.error : null)

  return (
    <section aria-labelledby="compat-title">
      <h2 id="compat-title">궁합 보기</h2>
      <p className="help" style={{ marginTop: 0 }}>
        상대의 생년월일시를 넣으면 두 사람이 잘 맞는 점과 맞춰 갈 점을 보여줍니다. 점수는 매기지 않습니다. 상대의 정보도 이 브라우저 안에서만
        계산하고 저장하지 않습니다.
      </p>
      <form className="card" onSubmit={handleSubmit} noValidate aria-label="상대 출생 정보 입력">
        <div className="form-grid">
          <fieldset>
            <legend>상대의 달력</legend>
            <div className="row">
              <label>
                <input type="radio" name={`${id}-cal`} aria-label="상대 양력" checked={v.calendar === 'solar'} onChange={() => set('calendar', 'solar')} />
                양력
              </label>
              <label>
                <input type="radio" name={`${id}-cal`} aria-label="상대 음력" checked={v.calendar === 'lunar'} onChange={() => set('calendar', 'lunar')} />
                음력
              </label>
              {v.calendar === 'lunar' && (
                <label>
                  <input type="checkbox" aria-label="상대 윤달" checked={v.isLeap} onChange={(e) => set('isLeap', e.target.checked)} />
                  윤달
                </label>
              )}
            </div>
          </fieldset>
          <fieldset>
            <legend>상대의 성별</legend>
            <div className="row">
              <label>
                <input type="radio" name={`${id}-gender`} aria-label="상대 남" checked={v.gender === 'male'} onChange={() => set('gender', 'male')} />
                남
              </label>
              <label>
                <input type="radio" name={`${id}-gender`} aria-label="상대 여" checked={v.gender === 'female'} onChange={() => set('gender', 'female')} />
                여
              </label>
            </div>
          </fieldset>
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <fieldset>
            <legend>상대의 생년월일</legend>
            <div className="ymd">
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" placeholder="연" aria-label="상대 연도" value={v.year} onChange={(e) => set('year', e.target.value)} />
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="월" aria-label="상대 월" value={v.month} onChange={(e) => set('month', e.target.value)} />
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="일" aria-label="상대 일" value={v.day} onChange={(e) => set('day', e.target.value)} />
            </div>
          </fieldset>
          <fieldset>
            <legend>상대의 태어난 시각</legend>
            <div className="ymd" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="시 (0~23)" aria-label="상대 시" disabled={!v.timeKnown} value={v.hour} onChange={(e) => set('hour', e.target.value)} />
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="분" aria-label="상대 분" disabled={!v.timeKnown} value={v.minute} onChange={(e) => set('minute', e.target.value)} />
            </div>
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', minHeight: 44 }}>
              <input type="checkbox" aria-label="상대 시간 모름" checked={!v.timeKnown} onChange={(e) => set('timeKnown', !e.target.checked)} />
              시간 모름
            </label>
          </fieldset>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="primary">
            궁합 보기
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {longitudeSkipped && <p className="help">상대는 태어난 곳을 받지 않아, 경도 보정 없이 계산합니다.</p>}
      </form>

      {result && 'reading' in result && (
        <div className="compat-result" aria-live="polite">
          <p className="meta">
            상대: {result.partnerChart.pillars.map((p) => `${ganjiName(p.ganji)}${{ year: '년', month: '월', day: '일', hour: '시' }[p.key]}`).join(' ')}
          </p>
          <p className="summary">{result.reading.summary}</p>
          <div className="cat-body" style={{ padding: 0 }}>
            <div className="cat-block good">
              <h3>
                <span aria-hidden="true">✓</span> 잘 맞는 점
              </h3>
              <ul>
                {result.reading.strengths.map((l) => (
                  <li key={l.id} data-line={l.id}>
                    {l.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="cat-block care">
              <h3>
                <span aria-hidden="true">!</span> 맞춰 갈 점
              </h3>
              <ul>
                {result.reading.adjustments.map((l) => (
                  <li key={l.id} data-line={l.id}>
                    {l.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="cat-block basis">
              <h3>근거</h3>
              <ul>
                {result.reading.basis.map((b, i) => (
                  <li key={i}>{b.term ? <Label plain={b.plain} term={b.term} /> : b.plain}</li>
                ))}
              </ul>
            </div>
            <p className="help">{result.reading.note}</p>
          </div>
        </div>
      )}
    </section>
  )
}
