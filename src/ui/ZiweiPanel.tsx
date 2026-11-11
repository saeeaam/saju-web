import { useMemo } from 'react'
import type { SajuChart } from '../core/index.ts'
import { ganjiName } from '../core/ganji.ts'
import { nominalAge, ziweiFromChart } from '../core/ziwei-from-chart.ts'
import type { ZiweiPalace } from '../core/ziwei.ts'
import { BRANCHES, STEMS, ZIWEI } from '../data/index.ts'
import { ELEMENT_KO } from './labels.ts'

const STAR_INFO = new Map(ZIWEI.stars.map((s) => [s.id, s]))

function Palace({ p, isSoul, current }: { p: ZiweiPalace; isSoul: boolean; current: boolean }) {
  const main = p.stars.filter((s) => STAR_INFO.get(s.id)!.kind === 'main')
  const others = p.stars.filter((s) => STAR_INFO.get(s.id)!.kind !== 'main')
  const label = `${p.name}, ${STEMS[p.stem].ko}${BRANCHES[p.branch].ko}궁${p.isBody ? ', 신궁' : ''}${current ? ', 현재 대한' : ''}`
  return (
    <li className="zw-palace" style={{ '--area': `b${p.branch}` } as React.CSSProperties} data-soul={isSoul} data-current={current} aria-label={label}>
      <div className="zw-head">
        <strong>{p.name}</strong>
        {p.isBody && <span className="zw-tag">신궁</span>}
        {current && <span className="now-tag">현재 대한</span>}
      </div>
      <ul className="zw-stars" aria-label="별">
        {main.length === 0 && <li className="zw-empty">주성 없음</li>}
        {main.map((s) => (
          <li key={s.id} className="zw-main">
            {STAR_INFO.get(s.id)!.ko}
            <span className="hanja" lang="zh">
              {STAR_INFO.get(s.id)!.hanja}
            </span>
            {s.sihua && <span className="zw-sihua">화{s.sihua}</span>}
          </li>
        ))}
        {others.map((s) => (
          <li key={s.id} className={STAR_INFO.get(s.id)!.kind === 'malefic' ? 'zw-malefic' : 'zw-aux'}>
            {STAR_INFO.get(s.id)!.ko}
            {s.sihua && <span className="zw-sihua">화{s.sihua}</span>}
          </li>
        ))}
      </ul>
      <div className="zw-foot">
        <span className="hanja" lang="zh">
          {STEMS[p.stem].hanja}
          {BRANCHES[p.branch].hanja}
        </span>
        <span>
          대한 {p.decade[0]}–{p.decade[1]}
        </span>
      </div>
    </li>
  )
}

export function ZiweiPanel({ chart, now }: { chart: SajuChart; now: Date }) {
  const result = useMemo(() => ziweiFromChart(chart), [chart])

  if (!result) {
    return (
      <section aria-labelledby="ziwei-title">
        <h2 id="ziwei-title">자미두수 명반</h2>
        <p className="meta">자미두수 명반은 출생 시각이 있어야 계산할 수 있습니다. 출생 시각을 입력하면 명반이 표시됩니다.</p>
      </section>
    )
  }

  const { chart: zw, lunar } = result
  const age = nominalAge(lunar.year, now)
  // 명궁부터 역행 순서로 나열 (좁은 화면·스크린리더 순서). 넓은 화면에서는 CSS 격자가 지지 자리로 배치한다
  const ordered = [...zw.palaces].sort((a, b) => a.order - b.order)

  return (
    <section aria-labelledby="ziwei-title">
      <h2 id="ziwei-title">자미두수 명반</h2>
      <div className="zw-board">
        <ol className="zw-palaces" aria-label="12궁 (명궁부터)">
          {ordered.map((p) => (
            <Palace key={p.branch} p={p} isSoul={p.order === 0} current={age >= p.decade[0] && age <= p.decade[1]} />
          ))}
        </ol>
        <div className="zw-center">
          <p>
            <strong>음력</strong> {lunar.year}년 {lunar.isLeapMonth ? '윤' : ''}
            {lunar.month}월 {lunar.day}일 {BRANCHES[result.hourBranch].ko}시
          </p>
          {lunar.isLeapMonth && <p className="help">윤달 처리: 명반에서는 {zw.effectiveMonth}월로 계산 (계산 기준에서 변경 가능)</p>}
          <p>
            <strong>생년</strong> {ganjiName(zw.yearGanji)}년 (음력 연도 기준)
          </p>
          <p>
            <strong>오행국</strong> {ELEMENT_KO[zw.bureau.element]}
            {zw.bureau.number}국 ({zw.bureau.napeum})
          </p>
          <p>
            <strong>명궁</strong> {BRANCHES[zw.soulBranch].ko} · <strong>신궁</strong> {BRANCHES[zw.bodyBranch].ko}
          </p>
          <p>
            <strong>대한</strong> {zw.decadeForward ? '순행' : '역행'} · 올해 세는 나이 {age}세
          </p>
        </div>
      </div>
      <p className="help">
        통행 안성법(오픈소스 iztro의 기본 방식과 교차 검증)으로 계산했습니다. 별의 밝기(묘왕리함), 소한·유년, 잡요는 표시하지 않습니다. 음력은 한국천문연구원 기준이며, 중국 음력을 쓰는 서비스와는 약 3.6%의 날짜에서 음력 날짜가 달라 명반이 다를 수 있습니다.
      </p>
    </section>
  )
}
