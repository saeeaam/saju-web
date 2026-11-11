import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { BirthInput } from '../types/input.ts'
import { CUSTOM_PLACE, EMPTY_FORM, toBirthInput } from './form-utils.ts'
import type { FormValues } from './form-utils.ts'
import { PLACES } from './labels.ts'

interface Props {
  onSubmit: (input: BirthInput) => void
  /** 경도 보정이 켜져 있을 때만 출생지를 묻는다 */
  needsPlace: boolean
  /** 계산 기준 패널 등 폼 아래에 들어갈 내용 */
  children?: React.ReactNode
  /** 상위에서 내려오는 오류 (계산 오류) */
  externalError?: string | null
}

export function InputForm({ onSubmit, needsPlace, children, externalError }: Props) {
  const [v, setV] = useState<FormValues>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setV((prev) => ({ ...prev, [key]: value }))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const r = toBirthInput(v)
    if ('error' in r) {
      setError(r.error)
      return
    }
    setError(null)
    onSubmit(r.input)
  }

  const shownError = error ?? externalError ?? null

  return (
    <form className="card" onSubmit={handleSubmit} noValidate aria-label="출생 정보 입력">
      <div className="form-grid">
        <fieldset>
          <legend>달력</legend>
          <div className="row">
            <label>
              <input type="radio" name={`${id}-cal`} checked={v.calendar === 'solar'} onChange={() => set('calendar', 'solar')} />
              양력
            </label>
            <label>
              <input type="radio" name={`${id}-cal`} checked={v.calendar === 'lunar'} onChange={() => set('calendar', 'lunar')} />
              음력
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>성별 (대운 방향 계산에 필요)</legend>
          <div className="row">
            <label>
              <input type="radio" name={`${id}-gender`} checked={v.gender === 'male'} onChange={() => set('gender', 'male')} />
              남
            </label>
            <label>
              <input type="radio" name={`${id}-gender`} checked={v.gender === 'female'} onChange={() => set('gender', 'female')} />
              여
            </label>
          </div>
        </fieldset>
      </div>

      <div className="form-grid" style={{ marginTop: 12 }}>
        <fieldset>
          <legend>생년월일</legend>
          <div className="ymd">
            <label className="field">
              <span className="sr-only">연도</span>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" placeholder="연 (예: 1990)" value={v.year} onChange={(e) => set('year', e.target.value)} aria-label="연도" />
            </label>
            <label className="field">
              <span className="sr-only">월</span>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="월" value={v.month} onChange={(e) => set('month', e.target.value)} aria-label="월" />
            </label>
            <label className="field">
              <span className="sr-only">일</span>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="일" value={v.day} onChange={(e) => set('day', e.target.value)} aria-label="일" />
            </label>
          </div>
          {v.calendar === 'lunar' && (
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', minHeight: 44 }}>
              <input type="checkbox" checked={v.isLeap} onChange={(e) => set('isLeap', e.target.checked)} />
              윤달
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend>출생 시각 (24시간제)</legend>
          <div className="ymd" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="시 (0~23)" value={v.hour} disabled={!v.timeKnown} onChange={(e) => set('hour', e.target.value)} aria-label="시" />
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" placeholder="분" value={v.minute} disabled={!v.timeKnown} onChange={(e) => set('minute', e.target.value)} aria-label="분" />
          </div>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', minHeight: 44 }}>
            <input type="checkbox" checked={!v.timeKnown} onChange={(e) => set('timeKnown', !e.target.checked)} />
            시간 모름 (시주 없이 3주로 계산)
          </label>
        </fieldset>

        {needsPlace && (
          <fieldset>
            <legend>출생지 (경도 보정에 사용)</legend>
            <select value={v.placeId} onChange={(e) => set('placeId', e.target.value)} aria-label="출생지">
              {PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value={CUSTOM_PLACE}>직접 입력 (경도)</option>
            </select>
            {v.placeId === CUSTOM_PLACE && (
              <input type="text" inputMode="decimal" placeholder="동경 (예: 127.5)" value={v.customLongitude} onChange={(e) => set('customLongitude', e.target.value)} aria-label="경도" style={{ marginTop: 8 }} />
            )}
          </fieldset>
        )}
      </div>

      {children}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="primary">
          명식 보기
        </button>
      </div>
      {shownError && (
        <p className="error" role="alert">
          {shownError}
        </p>
      )}
      <p className="privacy">입력한 정보는 이 브라우저 안에서만 계산되며, 서버로 전송하거나 저장하지 않습니다.</p>
    </form>
  )
}
