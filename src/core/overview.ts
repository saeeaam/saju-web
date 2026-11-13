/**
 * "한눈에 보기": 사주 풀이와 월별 흐름에서 핵심 세 줄을 뽑는다.
 * 새 해석을 만들지 않고, 이미 만든 문장을 재사용해 카드 내용과 어긋나지 않게 한다.
 */
import { STEMS } from '../data/index.ts'
import type { ReadingFeatures } from './features.ts'
import { ganjiName } from './ganji.ts'
import { 이가 } from './josa.ts'
import type { MonthlyReading } from './monthly.ts'
import type { CategoryReading } from './reading.ts'

export interface OverviewLine {
  label: string
  text: string
}

const ELEMENT_PLAIN = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' } as const
const STRENGTH_PLAIN = { 신강: '강한 편', 신약: '약한 편', 중화: '균형' } as const

const THEME: Record<string, string> = {
  비겁: '사람·경쟁·독립',
  식상: '표현·활동·새로운 시도',
  재성: '돈·현실 문제·성과',
  관성: '책임·직장·평가',
  인성: '배움·준비·도움',
}

/** 문장 끝 "~편입니다." → 요약에 맞게 그대로 쓴다. 첫 문장만 잘라 쓴다 */
function firstSentence(text: string): string {
  const i = text.indexOf('. ')
  return i >= 0 ? text.slice(0, i + 1) : text
}

export function buildOverview(f: ReadingFeatures, readings: CategoryReading[], monthly: MonthlyReading): OverviewLine[] {
  const stem = STEMS[f.dayStem]
  const personality = readings.find((r) => r.id === 'personality')!
  const lines: OverviewLine[] = []

  lines.push({
    label: '나의 성향',
    text: `${stem.ko}(${ELEMENT_PLAIN[stem.element]}) · 기운은 ${STRENGTH_PLAIN[f.strength]}. ${firstSentence(personality.summary.replace(/^나를 뜻하는 글자는 [^,]+, /, ''))}`,
  })

  const strength = personality.strengths[0]
  if (strength) lines.push({ label: '강점', text: strength.text })

  const current = monthly.months.find((m) => m.isCurrent)
  const year = `${f.thisYear.year}년(${ganjiName(f.thisYear.ganji)})은 ${이가(`'${THEME[f.thisYear.stemGroup]}'`)} 중심 주제가 되기 쉽습니다.`
  const month = current ? ` 이번 달은 ${current.theme.replace(/ 달입니다\.$/, ' 달로 봅니다.')}` : ''
  lines.push({ label: '올해·이번 달', text: year + month })

  return lines
}
