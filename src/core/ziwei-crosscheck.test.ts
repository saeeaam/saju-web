/**
 * 자미두수 교차 검증: iztro(MIT, 통행 안성법 = algorithm 'default')와 대조한다.
 * 음력 날짜는 우리가 계산한 값을 그대로 넣어(byLunar) 음력 변환 차이와 자시 처리 차이를 분리한다.
 * iztro의 시진 번호: 0 = 이른 자시(00~01), 1~11 = 축~해. 23시대(늦은 자시, 12)는 쓰지 않는다.
 */
import { describe, expect, it } from 'vitest'
import { astro } from 'iztro'
import { ZIWEI } from '../data/index.ts'
import * as LunarModule from 'lunar-javascript'
import { lunarToSolar, solarToLunar } from './calendar.ts'
import { calculateZiwei } from './ziwei.ts'
import type { ZiweiInput } from './ziwei.ts'
import type { Gender } from '../types/input.ts'
import type { LeapMonthRule } from '../types/options.ts'

const Lunar = ((LunarModule as unknown as { default?: typeof LunarModule }).default ?? LunarModule) as typeof LunarModule

/** 같은 양력 날짜의 중국 음력(lunar-javascript)이 우리 한국 음력과 같은가 */
function sameAsChineseLunar(lunar: ZiweiInput['lunar']): boolean {
  const solar = lunarToSolar(lunar, lunar.isLeapMonth)
  const cn = Lunar.Solar.fromYmdHms(solar.year, solar.month, solar.day, 12, 0, 0).getLunar()
  return cn.getYear() === lunar.year && Math.abs(cn.getMonth()) === lunar.month && (cn.getMonth() < 0) === lunar.isLeapMonth && cn.getDay() === lunar.day
}

const BRANCH_HANJA = '子丑寅卯辰巳午未申酉戌亥'
const STEM_HANJA = '甲乙丙丁戊己庚辛壬癸'
const PALACE_TW = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母']
const BUREAU_NUM: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }
const SIHUA_TW: Record<string, string> = { 祿: '록', 權: '권', 科: '과', 忌: '기' }
const HANJA_TO_ID = new Map(ZIWEI.stars.map((s) => [s.hanja, s.id]))

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 한 명반을 비교 가능한 문자열 목록으로: 궁마다 "지지 궁이름 천간 대한 별[사화]…" */
function ours(input: ZiweiInput): string[] {
  const c = calculateZiwei(input)
  const head = [`명궁=${BRANCH_HANJA[c.soulBranch]}`, `신궁=${BRANCH_HANJA[c.bodyBranch]}`, `국=${c.bureau.number}`]
  const palaces = c.palaces.map((p) => {
    const stars = p.stars.map((s) => s.id + (s.sihua ? `[${s.sihua}]` : '')).sort().join(',')
    return `${BRANCH_HANJA[p.branch]} ${p.name} ${STEM_HANJA[p.stem]} ${p.decade.join('-')} ${stars}`
  })
  return [...head, ...palaces]
}

function theirs(input: ZiweiInput): string[] {
  const { year, month, day, isLeapMonth } = input.lunar
  const a = astro.byLunar(`${year}-${month}-${day}`, input.hourBranch, input.gender, isLeapMonth, input.leapMonthRule === 'split-15', 'zh-TW')
  const head = [`명궁=${a.earthlyBranchOfSoulPalace}`, `신궁=${a.earthlyBranchOfBodyPalace}`, `국=${BUREAU_NUM[a.fiveElementsClass[1]]}`]
  const byBranch = [...a.palaces].sort((x, y) => BRANCH_HANJA.indexOf(x.earthlyBranch) - BRANCH_HANJA.indexOf(y.earthlyBranch))
  const palaces = byBranch.map((p) => {
    const name = ZIWEI.palaces[PALACE_TW.indexOf(p.name)]
    // 우리가 구현한 27개 별만 비교한다 (천마 등은 범위 밖)
    const stars = [...p.majorStars, ...p.minorStars]
      .filter((s) => HANJA_TO_ID.has(s.name))
      .map((s) => HANJA_TO_ID.get(s.name)! + (s.mutagen ? `[${SIHUA_TW[s.mutagen]}]` : ''))
      .sort()
      .join(',')
    return `${p.earthlyBranch} ${name} ${p.heavenlyStem} ${p.decadal.range.join('-')} ${stars}`
  })
  return [...head, ...palaces]
}

function diff(a: string[], b: string[]): string {
  return a.map((x, i) => (x === b[i] ? null : `  우리 ${x}\n  iztro ${b[i]}`)).filter(Boolean).join('\n')
}

/**
 * iztro는 중국 음력(UTC+8)으로 날짜를 검증하므로, 한국 음력에만 있는 날짜(예: 한국은 30일, 중국은 29일인 달)는
 * 거부한다. 그런 표본은 "대조 불가"로 따로 세고, 거부 사유가 음력 날짜 문제인지만 확인한다.
 */
function check(samples: ZiweiInput[]) {
  const bad: string[] = []
  const skipped: string[] = []
  for (const s of samples) {
    // 한국 음력과 중국 음력이 다른 날짜는 명반이 달라지는 것이 정상이므로 대조하지 않는다
    if (!sameAsChineseLunar(s.lunar)) {
      skipped.push(`${JSON.stringify(s.lunar)}: 한·중 음력 차이`)
      continue
    }
    let t: string[]
    try {
      t = theirs(s)
    } catch (e) {
      const msg = (e as Error).message
      // 확인된 iztro 한계: 윤달 30일을 평달 일수(29일)로 검증해 거부한다.
      // (lunar-javascript는 같은 날짜를 정상 날짜로 인식) 이 패턴만 대조 불가로 분류한다.
      if (s.lunar.isLeapMonth && s.lunar.day === 30 && /only 29 days/.test(msg)) {
        skipped.push(`${JSON.stringify(s.lunar)}: iztro 윤달 30일 처리 불가`)
        continue
      }
      // 그 밖의 거부는 대조 불가가 아니라 실패로 본다
      throw new Error(`iztro 오류 (한·중 음력은 같음): ${JSON.stringify(s.lunar)}: ${msg}`)
    }
    const d = diff(ours(s), t)
    if (d) bad.push(`${JSON.stringify(s.lunar)} 시=${s.hourBranch} ${s.gender} ${s.leapMonthRule}\n${d}`)
  }
  return { bad, skipped, compared: samples.length - skipped.length }
}

const skipReasons = (r: ReturnType<typeof check>) => ({
  calendar: r.skipped.filter((x) => x.includes('한·중 음력 차이')).length,
  leap30: r.skipped.filter((x) => x.includes('윤달 30일')).length,
})

function expectClean(name: string, total: number, r: ReturnType<typeof check>, maxSkipRatio: number) {
  // 결과 요약을 남긴다 (문서화용)
  console.info(`[${name}] 표본 ${total}, 비교 ${r.compared}, 불일치 ${r.bad.length}, 대조 불가 ${JSON.stringify(skipReasons(r))}`)
  const msg = `${name}: 비교 ${r.compared}건 중 불일치 ${r.bad.length}건, 대조 불가 ${r.skipped.length}건\n${r.bad.slice(0, 4).join('\n')}\n대조 불가 예: ${r.skipped.slice(0, 3).join(' | ')}`
  expect(r.bad.length, msg).toBe(0)
  expect(r.skipped.length / total, msg).toBeLessThanOrEqual(maxSkipRatio)
}

describe('자미두수 교차 검증: iztro', { timeout: 180_000 }, () => {
  it('음력 표본 2000건(1900~2049, 시·성별·윤달 규칙 무작위)에서 명반 전체가 일치한다', () => {
    const r = rng(20261111)
    const samples: ZiweiInput[] = []
    for (let i = 0; i < 2000; i++) {
      const solar = { year: 1900 + Math.floor(r() * 150), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28) }
      samples.push({
        lunar: solarToLunar(solar),
        hourBranch: Math.floor(r() * 12),
        gender: (r() < 0.5 ? 'male' : 'female') as Gender,
        leapMonthRule: (r() < 0.5 ? 'split-15' : 'as-is') as LeapMonthRule,
      })
    }
    // 1900~2049년 전체 날짜 중 3.56%(1948일)는 한·중 음력이 다르다 (manseryeok vs lunar-javascript 전수 비교).
    // 그만큼은 대조 불가가 정상이므로 한도를 6%로 둔다.
    expectClean('무작위', samples.length, check(samples), 0.06)
  })

  it('윤달 날짜만 모은 표본(두 윤달 규칙 모두)에서 일치한다', () => {
    const r = rng(77)
    const leapDays: ZiweiInput['lunar'][] = []
    for (let t = Date.UTC(1900, 0, 1); t < Date.UTC(2050, 0, 1) && leapDays.length < 250; t += 86_400_000 * (1 + Math.floor(r() * 9))) {
      const d = new Date(t)
      const l = solarToLunar({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() })
      if (l.isLeapMonth) leapDays.push(l)
    }
    expect(leapDays.length).toBeGreaterThan(100)
    const samples: ZiweiInput[] = leapDays.flatMap((lunar) =>
      (['split-15', 'as-is'] as const).map((leapMonthRule) => ({
        lunar, hourBranch: Math.floor(r() * 12), gender: (r() < 0.5 ? 'male' : 'female') as Gender, leapMonthRule,
      })),
    )
    // 윤달은 한·중 역법 차이가 몰리는 곳이라 대조 불가 허용 비율을 넓게 둔다
    expectClean('윤달', samples.length, check(samples), 0.15)
  })

  it('경계: 매월 1·15·16·29·30일과 12시진 전부 (1984년)', () => {
    const samples: ZiweiInput[] = []
    for (let t = Date.UTC(1984, 0, 1); t < Date.UTC(1985, 0, 1); t += 86_400_000) {
      const d = new Date(t)
      const lunar = solarToLunar({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() })
      if (![1, 15, 16, 29, 30].includes(lunar.day)) continue
      for (let h = 0; h < 12; h++) samples.push({ lunar, hourBranch: h, gender: h % 2 ? 'male' : 'female', leapMonthRule: 'split-15' })
    }
    expect(samples.length).toBeGreaterThan(600)
    expectClean('경계', samples.length, check(samples), 0.05)
  })
})
