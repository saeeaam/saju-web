import { useMemo } from 'react'
import { extractFeatures } from '../core/features.ts'
import type { SajuChart } from '../core/index.ts'
import { analyzeChart } from '../core/insight.ts'
import { buildCategoryReadings } from '../core/reading.ts'
import type { CategoryReading, Line } from '../core/reading.ts'
import { ziweiFromChart } from '../core/ziwei-from-chart.ts'
import { Label } from './Label.tsx'

function Lines({ title, icon, lines, className }: { title: string; icon: string; lines: Line[]; className: string }) {
  if (lines.length === 0) return null
  return (
    <div className={`cat-block ${className}`}>
      <h3>
        <span aria-hidden="true">{icon}</span> {title}
      </h3>
      <ul>
        {lines.map((l) => (
          <li key={l.id} data-line={l.id}>
            {l.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Category({ r, open }: { r: CategoryReading; open: boolean }) {
  return (
    <details className="cat" open={open} data-category={r.id}>
      <summary>
        <span className="cat-title">{r.title}</span>
        <span className="cat-summary">{r.summary}</span>
      </summary>
      <div className="cat-body">
        <Lines title="좋은 점" icon="✓" lines={r.strengths} className="good" />
        <Lines title="주의할 점" icon="!" lines={r.cautions} className="care" />
        <Lines title="시기" icon="◷" lines={r.timing} className="when" />
        {r.ziwei && (
          <div className="cat-block ziwei">
            <h3>
              <span aria-hidden="true">✦</span> 다른 관점 (자미두수)
            </h3>
            <p>{r.ziwei}</p>
          </div>
        )}
        <div className="cat-block basis">
          <h3>근거</h3>
          <ul>
            {r.basis.map((b, i) => (
              <li key={i}>{b.term ? <Label plain={b.plain} term={b.term} /> : b.plain}</li>
            ))}
          </ul>
        </div>
        <p className="help">{r.note}</p>
      </div>
    </details>
  )
}

/** 카테고리별 사주 풀이. 규칙 기반이며 같은 입력이면 항상 같은 결과 */
export function CategoryPanel({ chart, now }: { chart: SajuChart; now: Date }) {
  const readings = useMemo(() => {
    const features = extractFeatures(chart, analyzeChart(chart), now, ziweiFromChart(chart))
    return buildCategoryReadings(features)
  }, [chart, now])

  return (
    <section aria-labelledby="reading-title">
      <h2 id="reading-title">사주 풀이</h2>
      <p className="help" style={{ marginTop: 0 }}>
        많이 궁금해하는 8가지 주제로 나눠 풀었습니다. 제목을 누르면 펼쳐집니다. 전통 해석의 일반론을 규칙에 따라 옮긴 참고용이며, 같은
        입력이면 항상 같은 결과가 나옵니다. 예측이나 단정이 아닙니다.
      </p>
      <div className="cats">
        {readings.map((r, i) => (
          <Category key={r.id} r={r} open={i === 0} />
        ))}
      </div>
    </section>
  )
}
