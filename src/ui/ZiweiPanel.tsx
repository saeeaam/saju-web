import { useMemo } from 'react'
import type { SajuChart } from '../core/index.ts'
import { ganjiName } from '../core/ganji.ts'
import { nominalAge, ziweiFromChart } from '../core/ziwei-from-chart.ts'
import type { ZiweiPalace } from '../core/ziwei.ts'
import { BRANCHES, STEMS, ZIWEI } from '../data/index.ts'
import { GLOSSARY, SIHUA_TERM } from './glossary.ts'
import type { TermKey } from './glossary.ts'
import { Label } from './Label.tsx'
import { ELEMENT_PLAIN } from './labels.ts'
import { Term } from './Term.tsx'

const STAR_INFO = new Map(ZIWEI.stars.map((s) => [s.id, s]))

function Palace({ p, isSoul, current }: { p: ZiweiPalace; isSoul: boolean; current: boolean }) {
  const main = p.stars.filter((s) => STAR_INFO.get(s.id)!.kind === 'main')
  const others = p.stars.filter((s) => STAR_INFO.get(s.id)!.kind !== 'main')
  const plain = GLOSSARY[p.name as TermKey].plain
  const label = `${plain} 칸(${p.name}), ${STEMS[p.stem].ko}${BRANCHES[p.branch].ko} 자리${p.isBody ? ', 후반 인생의 자리' : ''}${current ? ', 현재 10년 운' : ''}`
  return (
    <li className="zw-palace" style={{ '--area': `b${p.branch}` } as React.CSSProperties} data-soul={isSoul} data-current={current} aria-label={label}>
      <div className="zw-head">
        <strong>
          <Term k={p.name as TermKey} />
        </strong>
        {p.isBody && (
          <span className="zw-tag">
            <Term k="신궁" static />
          </span>
        )}
        {current && <span className="now-tag">현재 10년 운</span>}
      </div>
      <ul className="zw-stars" aria-label="별">
        {main.length === 0 && <li className="zw-empty">큰 별 없음</li>}
        {main.map((s) => (
          <li key={s.id} className="zw-main">
            {STAR_INFO.get(s.id)!.ko}
            <span className="hanja" lang="zh">
              {STAR_INFO.get(s.id)!.hanja}
            </span>
            {s.sihua && (
              <span className="zw-sihua">
                <Term k={SIHUA_TERM[s.sihua]} />
              </span>
            )}
          </li>
        ))}
        {others.map((s) => (
          <li key={s.id} className={STAR_INFO.get(s.id)!.kind === 'malefic' ? 'zw-malefic' : 'zw-aux'}>
            {STAR_INFO.get(s.id)!.ko}
            {s.sihua && (
              <span className="zw-sihua">
                <Term k={SIHUA_TERM[s.sihua]} />
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="zw-foot">
        <span className="hanja" lang="zh">
          {STEMS[p.stem].hanja}
          {BRANCHES[p.branch].hanja}
        </span>
        <span>
          10년 운 {p.decade[0]}–{p.decade[1]}세
        </span>
      </div>
    </li>
  )
}

export function ZiweiPanel({ chart, now }: { chart: SajuChart; now: Date }) {
  const result = useMemo(() => ziweiFromChart(chart), [chart])

  const title = (
    <h2 id="ziwei-title">
      자미두수 <Label plain="(별자리 운명도)" term="명반" />
    </h2>
  )

  if (!result) {
    return (
      <section aria-labelledby="ziwei-title">
        {title}
        <p className="meta">자미두수는 태어난 시각이 있어야 계산할 수 있습니다. 태어난 시각을 입력하면 운명도가 표시됩니다.</p>
      </section>
    )
  }

  const { chart: zw, lunar } = result
  const age = nominalAge(lunar.year, now)
  // 명궁부터 역행 순서로 나열 (좁은 화면·스크린리더 순서). 넓은 화면에서는 CSS 격자가 지지 자리로 배치한다
  const ordered = [...zw.palaces].sort((a, b) => a.order - b.order)

  return (
    <section aria-labelledby="ziwei-title">
      {title}
      <p className="help" style={{ marginTop: 0 }}>
        12개 칸은 삶의 영역(나 자신, 재물, 일과 직업, 배우자 …)이고, 칸마다 놓인 별로 그 영역의 성향을 봅니다. 칸 이름을 누르면 설명이
        나옵니다.
      </p>
      <div className="zw-board">
        <ol className="zw-palaces" aria-label="12개 칸 (나 자신부터)">
          {ordered.map((p) => (
            <Palace key={p.branch} p={p} isSoul={p.order === 0} current={age >= p.decade[0] && age <= p.decade[1]} />
          ))}
        </ol>
        <div className="zw-center">
          <p>
            <strong>음력 생일</strong> {lunar.year}년 {lunar.isLeapMonth ? '윤' : ''}
            {lunar.month}월 {lunar.day}일 {BRANCHES[result.hourBranch].ko}시
          </p>
          {lunar.isLeapMonth && <p className="help">윤달 처리: 운명도에서는 {zw.effectiveMonth}월로 계산 (계산 기준에서 변경 가능)</p>}
          <p>
            <strong>태어난 해</strong> {ganjiName(zw.yearGanji)}년 (음력 기준)
          </p>
          <p>
            <strong>
              <Term k="오행국" />
            </strong>{' '}
            {ELEMENT_PLAIN[zw.bureau.element]} {zw.bureau.number} ({zw.bureau.napeum})
          </p>
          <p>
            <strong>나 자신 칸</strong> {BRANCHES[zw.soulBranch].ko} 자리 · <strong>후반 인생의 자리</strong> {BRANCHES[zw.bodyBranch].ko} 자리
          </p>
          <p>
            <strong>
              <Term k="대한" />
            </strong>{' '}
            <Term k={zw.decadeForward ? '순행' : '역행'} /> · 올해 세는 나이 {age}세
          </p>
        </div>
      </div>
      <p className="help">
        오픈소스 iztro의 기본 계산 방식과 맞춰 검증했습니다. 별의 밝기, 해마다의 운, 작은 별들은 표시하지 않습니다. 음력은
        한국천문연구원 기준이라, 중국 음력을 쓰는 서비스와는 약 3.6%의 날짜에서 결과가 다를 수 있습니다.
      </p>
    </section>
  )
}
