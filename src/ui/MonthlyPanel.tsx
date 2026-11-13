import { ganjiHanja, ganjiName } from '../core/index.ts'
import { MONTH_TAG_LABEL } from '../core/monthly.ts'
import type { MonthlyReading } from '../core/monthly.ts'

/** 한국 시각 기준 "2월 4일" */
function kstDate(ms: number): string {
  const d = new Date(ms + 9 * 3_600_000)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`
}

/** 올해(입춘 기준)의 12개월 흐름 */
export function MonthlyPanel({ monthly }: { monthly: MonthlyReading }) {
  return (
    <section aria-labelledby="monthly-title">
      <h2 id="monthly-title">올해 월별 흐름 ({monthly.sajuYear}년)</h2>
      <p className="help" style={{ marginTop: 0 }}>
        사주의 달은 절기(입춘·경칩 …)로 바뀌어 양력 1일과 맞지 않습니다. 날짜는 그 달이 시작하는 날(절기)이고, 다음 달 시작 전까지 이어집니다. 그 달 기운이 나에게
        어떤 주제가 되기 쉬운지를 보는 참고입니다.
      </p>
      <ol className="months" aria-label="월별 흐름">
        {monthly.months.map((m) => (
          <li key={m.startMs} className="month" data-current={m.isCurrent}>
            <div className="month-head">
              <strong>{kstDate(m.startMs)}부터</strong>
              {m.isCurrent && <span className="now-tag">이번 달</span>}
            </div>
            <div className="month-ganji">
              <span className="hanja" lang="zh">
                {ganjiHanja(m.ganji)}
              </span>{' '}
              {ganjiName(m.ganji)}
            </div>
            <p className="month-theme">{m.theme}</p>
            {m.tags.length > 0 && (
              <ul className="month-tags" aria-label="표시">
                {m.tags.map((t) => (
                  <li key={t}>{MONTH_TAG_LABEL[t]}</li>
                ))}
              </ul>
            )}
            {m.notes.map((n) => (
              <p key={n} className="help">
                {n}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </section>
  )
}
