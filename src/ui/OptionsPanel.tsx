import { useId } from 'react'
import type { SajuOptions } from '../types/options.ts'
import { DEFAULT_OPTIONS } from '../types/options.ts'
import { DAEUN_AGE_LABEL, DAY_BOUNDARY_LABEL, EARTH_STAGE_LABEL, LEAP_RULE_LABEL, SOLAR_TIME_LABEL, YEAR_BOUNDARY_LABEL } from './labels.ts'

interface Props {
  options: SajuOptions
  onChange: (next: SajuOptions) => void
}

function entries<K extends string, V>(rec: Record<K, V>): [K, V][] {
  return Object.entries(rec) as [K, V][]
}

/** 만세력·학파마다 달라지는 계산 기준. 기본값은 작업 계획의 승인된 기본 옵션 */
export function OptionsPanel({ options, onChange }: Props) {
  const id = useId()
  const set = <K extends keyof SajuOptions>(key: K, value: SajuOptions[K]) => onChange({ ...options, [key]: value })
  const isDefault = JSON.stringify(options) === JSON.stringify(DEFAULT_OPTIONS)

  return (
    <details className="options">
      <summary>계산 기준 {isDefault ? '(기본값)' : '(변경됨)'}</summary>
      <p className="help">만세력(사주 달력)마다 기준이 달라 결과가 다를 수 있습니다. 기준을 바꾸면 결과가 바로 바뀝니다.</p>
      <div className="form-grid" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor={`${id}-day`}>밤 11시~새벽 1시 출생 처리</label>
          <select id={`${id}-day`} aria-describedby={`${id}-day-help`} value={options.dayBoundary} onChange={(e) => set('dayBoundary', e.target.value as SajuOptions['dayBoundary'])}>
            {entries(DAY_BOUNDARY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l.name}
              </option>
            ))}
          </select>
          <span id={`${id}-day-help`} className="help">
            {DAY_BOUNDARY_LABEL[options.dayBoundary].help}
          </span>
        </div>

        <div className="field">
          <label htmlFor={`${id}-year`}>해가 바뀌는 기준</label>
          <select id={`${id}-year`} aria-describedby={`${id}-year-help`} value={options.yearBoundary} onChange={(e) => set('yearBoundary', e.target.value as SajuOptions['yearBoundary'])}>
            {entries(YEAR_BOUNDARY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <span id={`${id}-year-help`} className="help">
            달은 언제나 절기(입춘·경칩 등)로 바뀝니다.
          </span>
        </div>

        <div className="field">
          <label htmlFor={`${id}-solar`}>태어난 곳의 실제 해 시각 반영</label>
          <select id={`${id}-solar`} aria-describedby={`${id}-solar-help`} value={options.solarTimeCorrection} onChange={(e) => set('solarTimeCorrection', e.target.value as SajuOptions['solarTimeCorrection'])}>
            {entries(SOLAR_TIME_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <span id={`${id}-solar-help`} className="help">
            한국 표준 시각은 동경 135도 기준이라 실제 해 시각보다 30분가량 빠릅니다. 날·시의 글자에만 영향을 줍니다.
          </span>
        </div>

        <div className="field">
          <label htmlFor={`${id}-stage`}>기운의 단계 계산 방식 (흙 기운)</label>
          <select id={`${id}-stage`} value={options.earthStageRule} onChange={(e) => set('earthStageRule', e.target.value as SajuOptions['earthStageRule'])}>
            {entries(EARTH_STAGE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`${id}-age`}>10년 흐름 시작 나이 표기</label>
          <select id={`${id}-age`} value={options.daeunAgeFormat} onChange={(e) => set('daeunAgeFormat', e.target.value as SajuOptions['daeunAgeFormat'])}>
            {entries(DAEUN_AGE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-leap`}>자미두수: 윤달 처리</label>
          <select id={`${id}-leap`} aria-describedby={`${id}-leap-help`} value={options.leapMonthRule} onChange={(e) => set('leapMonthRule', e.target.value as SajuOptions['leapMonthRule'])}>
            {entries(LEAP_RULE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <span id={`${id}-leap-help`} className="help">
            윤달에 태어난 경우 자미두수에서 몇 월로 볼지 정합니다. 사주에는 영향이 없습니다.
          </span>
        </div>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <label>
          <input type="checkbox" checked={options.historicalTimeCorrection} onChange={(e) => set('historicalTimeCorrection', e.target.checked)} />
          그 시절 시간 제도(서머타임 등) 반영
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.applyEquationOfTime}
            disabled={options.solarTimeCorrection === 'none'}
            onChange={(e) => set('applyEquationOfTime', e.target.checked)}
          />
          계절에 따른 해 시각 차이까지 반영
        </label>
      </div>
      <p className="help">
        그 시절 시간 제도 반영: 1954~1961년의 다른 표준 시각, 1987·1988년 서머타임 등을 반영해 지금의 한국 시각으로 맞춥니다.
      </p>
      <div style={{ marginTop: 8 }}>
        <button type="button" className="ghost" onClick={() => onChange(DEFAULT_OPTIONS)} disabled={isDefault}>
          기본값으로 되돌리기
        </button>
      </div>
    </details>
  )
}
