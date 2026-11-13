import type { OverviewLine } from '../core/overview.ts'

/** 한눈에 보기: 핵심 세 줄 */
export function OverviewCard({ lines }: { lines: OverviewLine[] }) {
  return (
    <section className="overview" aria-labelledby="overview-title">
      <h2 id="overview-title">한눈에 보기</h2>
      <dl>
        {lines.map((l) => (
          <div key={l.label}>
            <dt>{l.label}</dt>
            <dd>{l.text}</dd>
          </div>
        ))}
      </dl>
      <p className="help">자세한 내용은 아래 "사주 풀이"에서 주제별로 볼 수 있습니다.</p>
    </section>
  )
}
