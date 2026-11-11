/**
 * 외부 라이브러리와의 교차 검증. 시드 고정 난수 표본으로 우리 구현과 대조한다.
 * - manseryeok (KASI 기반, 한국 표준시 이력 내장): 4주·대운·십성·공망 전부
 * - lunar-javascript (중국 UTC+8 기준): 절기 경계에서 멀리 떨어진 표본만
 * - @fullstackfamily/manseryeok (KASI 기반): 음양력 변환, 일주·월주
 * 불일치는 모아서 한꺼번에 보고한다.
 */
import { describe, expect, it } from 'vitest'
import * as fullstack from '@fullstackfamily/manseryeok'
import { calculateFourPillars, getTenGodChart, solarToLunar as libSolarToLunar } from 'manseryeok'
import { tenGodOfStem } from './analysis.ts'
import { jieAround, lunarToSolar, solarToLunar } from './calendar.ts'
import { calculateSaju } from './index.ts'
import { ganjiHanja, ganjiName } from './ganji.ts'
import * as LunarModule from 'lunar-javascript'
import type { Gender } from '../types/input.ts'
import type { DayBoundary, SajuOptions } from '../types/options.ts'

// CJS 패키지라 환경에 따라 named export가 default 아래에 있을 수 있다
const Lunar = ((LunarModule as unknown as { default?: typeof LunarModule }).default ?? LunarModule) as typeof LunarModule

/** 시드 고정 난수 (mulberry32) */
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Sample {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: Gender
  /** 절기 경계 근처에서 뽑은 표본인지 */
  nearTerm: boolean
}

/** KST 시계 필드로 분해 (표본 생성 전용: 서머타임 구간 밖 단순 UTC+9) */
function kstFields(ms: number) {
  const d = new Date(ms + 9 * 3600_000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}

function makeSamples(n: number, seed: number, minYear = 1912, maxYear = 2049): Sample[] {
  const r = rng(seed)
  const out: Sample[] = []
  for (let i = 0; i < n; i++) {
    const gender: Gender = r() < 0.5 ? 'male' : 'female'
    const year = minYear + Math.floor(r() * (maxYear - minYear + 1))
    if (r() < 0.4) {
      // 절기 경계 ±90분
      const jie = jieAround(year).filter((t) => new Date(t.ms).getUTCFullYear() === year)
      const t = jie[Math.floor(r() * jie.length)]
      const f = kstFields(t.ms + Math.round((r() * 180 - 90) * 60_000))
      out.push({ ...f, gender, nearTerm: true })
    } else {
      out.push({
        year,
        month: 1 + Math.floor(r() * 12),
        day: 1 + Math.floor(r() * 28),
        hour: Math.floor(r() * 24),
        minute: Math.floor(r() * 60),
        gender,
        nearTerm: false,
      })
    }
  }
  return out
}

const fmt = (s: Sample) => `${s.year}-${s.month}-${s.day} ${s.hour}:${String(s.minute).padStart(2, '0')} ${s.gender}`

function report(name: string, total: number, mismatches: string[]): string {
  return `${name}: ${mismatches.length}/${total}건 불일치\n${mismatches.slice(0, 8).join('\n')}`
}

const BOUNDARY: Record<DayBoundary, 'midnight' | 'jasi' | 'splitJasi'> = {
  midnight: 'midnight',
  'zi-hour-start': 'jasi',
  'split-zi': 'splitJasi',
}

describe('교차 검증 1: manseryeok (4주·십성·공망·대운)', () => {
  const samples = makeSamples(3000, 20261110, 1908, 2049)
  const boundaries: DayBoundary[] = ['midnight', 'zi-hour-start', 'split-zi']

  it('옵션 조합을 섞은 3000건에서 4주가 모두 일치한다', () => {
    const r = rng(7)
    const mismatches: string[] = []
    for (const s of samples) {
      const dayBoundary = boundaries[Math.floor(r() * 3)]
      const useLongitude = r() < 0.4
      const longitude = 124 + r() * 7
      const eot = r() < 0.5
      const hist = r() < 0.8
      const options: Partial<SajuOptions> = {
        dayBoundary,
        historicalTimeCorrection: hist,
        solarTimeCorrection: useLongitude ? 'longitude' : 'none',
        applyEquationOfTime: eot,
      }
      const ours = calculateSaju(
        {
          calendar: 'solar', year: s.year, month: s.month, day: s.day,
          time: { hour: s.hour, minute: s.minute }, gender: s.gender,
          place: useLongitude ? { longitude } : undefined,
        },
        options,
      )
      const trueSolarTime = useLongitude
        ? { longitude, applyEquationOfTime: eot, applyHistoricalDst: hist }
        : hist
          ? { longitude: 135, applyEquationOfTime: false, applyHistoricalDst: true }
          : undefined
      const lib = calculateFourPillars({
        year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute,
        dayBoundary: BOUNDARY[dayBoundary], trueSolarTime,
      }).toObject()
      const o = Object.fromEntries(ours.pillars.map((p) => [p.key, ganjiName(p.ganji)]))
      if (o.year !== lib.year || o.month !== lib.month || o.day !== lib.day || o.hour !== lib.hour) {
        mismatches.push(
          `${fmt(s)} [${dayBoundary}${useLongitude ? ` lon=${longitude.toFixed(2)} eot=${eot}` : ''} hist=${hist}] 우리=${o.year} ${o.month} ${o.day} ${o.hour} / 라이브러리=${lib.year} ${lib.month} ${lib.day} ${lib.hour}`,
        )
      }
    }
    expect(mismatches.length, report('4주', samples.length, mismatches)).toBe(0)
  })

  it('대운 방향·시작(년/월/일)·간지 10개가 일치한다 (반일 동점만 +1일 허용)', () => {
    const mismatches: string[] = []
    let ties = 0
    const total = (y: number, m: number, d: number) => (y * 12 + m) * 30 + d
    for (const s of samples.slice(0, 1500)) {
      const ours = calculateSaju(
        { calendar: 'solar', year: s.year, month: s.month, day: s.day, time: { hour: s.hour, minute: s.minute }, gender: s.gender },
        { daeunAgeFormat: 'precise' },
      )
      const lib = calculateFourPillars({
        year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute, gender: s.gender,
        trueSolarTime: { longitude: 135, applyEquationOfTime: false, applyHistoricalDst: true },
      }).luckPillars!
      const a = ours.daeun
      const oursNames = a.pillars.map((p) => ganjiName(p.ganji)).join(',')
      const libNames = lib.pillars.map((p) => p.korean).join(',')

      // 일수가 정확히 반일(.5)로 떨어지는 동점인가. 우리는 정수 분으로 항상 올리고,
      // 라이브러리는 부동소수점 오차로 내림이 될 수 있다.
      const minutes = Math.abs(a.baseTermMs - ours.instantMs) / 60_000
      const rest = minutes % 4320
      const isTie = (rest % 360) % 12 === 6

      const ourTotal = total(a.start.years, a.start.months, a.start.days)
      const libTotal = total(lib.startYears, lib.startMonths, lib.startDays)
      const startOk = ourTotal === libTotal || (isTie && ourTotal === libTotal + 1)
      if (ourTotal !== libTotal && startOk) ties++
      if (a.forward !== lib.forward || !startOk || oursNames !== libNames) {
        mismatches.push(
          `${fmt(s)} 우리=${a.forward ? '순' : '역'} ${a.start.years}년${a.start.months}월${a.start.days}일 ${oursNames.slice(0, 11)} / 라이브러리=${lib.forward ? '순' : '역'} ${lib.startYears}년${lib.startMonths}월${lib.startDays}일 ${libNames.slice(0, 11)} (동점=${isTie})`,
        )
      }
    }
    expect(mismatches.length, report('대운', 1500, mismatches)).toBe(0)
    // 동점으로 인한 +1일 차이는 소수여야 한다 (전체의 5% 미만)
    expect(ties).toBeLessThan(75)
  })

  it('십성(천간·지지)과 공망이 일치한다 (편관=칠살 이름 차이 보정)', () => {
    const mismatches: string[] = []
    const norm = (n: string) => (n === '칠살' ? '편관' : n)
    for (const s of samples.slice(0, 1500)) {
      const ours = calculateSaju({ calendar: 'solar', year: s.year, month: s.month, day: s.day, time: { hour: s.hour, minute: s.minute }, gender: s.gender })
      const lib = calculateFourPillars({
        year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute,
        trueSolarTime: { longitude: 135, applyEquationOfTime: false, applyHistoricalDst: true },
      })
      const chart = lib.tenGods
      for (const p of ours.pillars) {
        const l = chart[p.key]
        const stemOk = p.key === 'day' ? true : norm(p.stemTenGod!.name) === l.stem
        const branchOk = norm(p.branchTenGod.name) === l.branch
        if (!stemOk || !branchOk) {
          mismatches.push(`${fmt(s)} ${p.key}: 우리=${p.stemTenGod?.name}/${p.branchTenGod.name} / 라이브러리=${l.stem}/${l.branch}`)
        }
      }
      const oursVoid = ours.voidBranches.map((b) => ganjiName({ stem: 0, branch: b }).slice(1)).sort().join('')
      const libVoid = [...lib.voidBranches].sort().join('')
      if (oursVoid !== libVoid) mismatches.push(`${fmt(s)} 공망: 우리=${oursVoid} / 라이브러리=${libVoid}`)
    }
    expect(mismatches.length, report('십성·공망', 1500, mismatches)).toBe(0)
  })
})

describe('교차 검증 2: lunar-javascript (중국 UTC+8 기준, 절기 경계 제외)', () => {
  const samples = makeSamples(2500, 1108, 1912, 2049).filter((s) => !s.nearTerm)

  const jieMs = (year: number) => jieAround(year).map((t) => t.ms)
  /** 표본이 어떤 절의 ±3시간 이내면 UTC+8/+9 차이 때문에 비교하지 않는다 */
  const nearAnyJie = (s: Sample) => {
    const ms = Date.UTC(s.year, s.month - 1, s.day, s.hour, s.minute) - 9 * 3600_000
    return jieMs(s.year).some((t) => Math.abs(t - ms) <= 3 * 3600_000)
  }

  it('23시를 뺀 표본에서 4주가 일치한다 (시계 시각을 그대로 KST로 간주)', () => {
    const mismatches: string[] = []
    let n = 0
    for (const s of samples) {
      if (s.hour === 23 || nearAnyJie(s)) continue
      n++
      const ours = calculateSaju(
        { calendar: 'solar', year: s.year, month: s.month, day: s.day, time: { hour: s.hour, minute: s.minute }, gender: s.gender },
        { historicalTimeCorrection: false },
      )
      const ec = Lunar.Solar.fromYmdHms(s.year, s.month, s.day, s.hour, s.minute, 0).getLunar().getEightChar()
      const o = ours.pillars.map((p) => ganjiHanja(p.ganji))
      const l = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()]
      if (o.join() !== l.join()) mismatches.push(`${fmt(s)} 우리=${o.join(' ')} / lunar-javascript=${l.join(' ')}`)
    }
    expect(n).toBeGreaterThan(1000)
    expect(mismatches.length, report('4주(23시 제외)', n, mismatches)).toBe(0)
  })

  it('23시 표본: sect=2 ↔ split-zi, sect=1 ↔ zi-hour-start 와 일치한다', () => {
    const r = rng(99)
    const mismatches: string[] = []
    let n = 0
    for (let i = 0; i < 400; i++) {
      const s: Sample = {
        year: 1912 + Math.floor(r() * 138), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28),
        hour: 23, minute: Math.floor(r() * 60), gender: 'male', nearTerm: false,
      }
      if (nearAnyJie(s)) continue
      n++
      for (const [sect, boundary] of [[2, 'split-zi'], [1, 'zi-hour-start']] as const) {
        const ours = calculateSaju(
          { calendar: 'solar', year: s.year, month: s.month, day: s.day, time: { hour: 23, minute: s.minute }, gender: 'male' },
          { historicalTimeCorrection: false, dayBoundary: boundary },
        )
        const ec = Lunar.Solar.fromYmdHms(s.year, s.month, s.day, 23, s.minute, 0).getLunar().getEightChar()
        ec.setSect(sect)
        const o = ours.pillars.map((p) => ganjiHanja(p.ganji))
        const l = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()]
        if (o.join() !== l.join()) mismatches.push(`${fmt(s)} sect=${sect}/${boundary} 우리=${o.join(' ')} / lunar-javascript=${l.join(' ')}`)
      }
    }
    expect(mismatches.length, report('23시', n * 2, mismatches)).toBe(0)
  })
})

describe('교차 검증 3: 음양력 변환과 @fullstackfamily/manseryeok', () => {
  it('양력 → 음력 변환이 두 KASI 기반 라이브러리 사이에서 일치한다 (1900~2049, 3000건)', () => {
    const r = rng(555)
    const mismatches: string[] = []
    for (let i = 0; i < 3000; i++) {
      const y = 1900 + Math.floor(r() * 150)
      const m = 1 + Math.floor(r() * 12)
      const d = 1 + Math.floor(r() * 28)
      const a = solarToLunar({ year: y, month: m, day: d })
      const b = fullstack.solarToLunar(y, m, d).lunar
      if (a.year !== b.year || a.month !== b.month || a.day !== b.day || a.isLeapMonth !== b.isLeapMonth) {
        mismatches.push(`${y}-${m}-${d} manseryeok=${JSON.stringify(a)} / fullstack=${JSON.stringify(b)}`)
      }
    }
    expect(mismatches.length, report('음력 변환', 3000, mismatches)).toBe(0)
  })

  it('음력 → 양력 왕복 변환이 항등이다 (윤달 포함)', () => {
    const r = rng(321)
    const bad: string[] = []
    for (let i = 0; i < 2000; i++) {
      const y = 1900 + Math.floor(r() * 150)
      const solar = { year: y, month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28) }
      const lunar = solarToLunar(solar)
      const back = lunarToSolar(lunar, lunar.isLeapMonth)
      if (back.year !== solar.year || back.month !== solar.month || back.day !== solar.day) {
        bad.push(`${JSON.stringify(solar)} → ${JSON.stringify(lunar)} → ${JSON.stringify(back)}`)
      }
    }
    expect(bad.length, report('왕복', 2000, bad)).toBe(0)
  })

  it('일주·월주 간지가 @fullstackfamily/manseryeok 의 gapja와 일치한다 (12:00 표본, 절기 당일 제외)', () => {
    const r = rng(2468)
    const mismatches: string[] = []
    let n = 0
    for (let i = 0; i < 1500; i++) {
      const s = { year: 1912 + Math.floor(r() * 138), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28) }
      // 절기 당일은 일(日) 단위 라이브러리와 시각 해석이 달라질 수 있어 제외
      const dayStart = Date.UTC(s.year, s.month - 1, s.day) - 9 * 3600_000
      if (jieAround(s.year).some((t) => t.ms >= dayStart - 86_400_000 && t.ms < dayStart + 2 * 86_400_000)) continue
      n++
      const g = fullstack.solarToLunar(s.year, s.month, s.day).gapja
      const ours = calculateSaju(
        { calendar: 'solar', ...s, time: { hour: 12, minute: 0 }, gender: 'male' },
        { historicalTimeCorrection: false },
      )
      const [, month, day] = ours.pillars.map((p) => ganjiName(p.ganji))
      if (day !== g.dayPillar || month !== g.monthPillar) {
        mismatches.push(`${s.year}-${s.month}-${s.day} 우리=월 ${month} 일 ${day} / fullstack=월 ${g.monthPillar} 일 ${g.dayPillar}`)
      }
    }
    expect(n).toBeGreaterThan(800)
    expect(mismatches.length, report('일주·월주', n, mismatches)).toBe(0)
  })

  it('(참고) manseryeok의 solarToLunar 직접 호출도 동일 결과를 낸다', () => {
    const a = libSolarToLunar(2024, 1, 1)
    expect(a).toEqual({ year: 2023, month: 11, day: 20, isLeapMonth: false })
    expect(getTenGodChart).toBeTypeOf('function')
  })
})

describe('교차 검증 4: lunar-javascript (납음·지장간·12운성·십성)', () => {
  /** lunar-javascript는 간체자를 쓴다. 우리 표기(정자)로 맞춘다 */
  const SIMPLIFIED: Record<string, string> = {
    炉: '爐', 剑: '劍', 锋: '鋒', 头: '頭', 涧: '澗', 蜡: '蠟', 杨: '楊', 雳: '靂',
    长: '長', 砂: '沙', 旁: '傍', 灯: '燈', 驿: '驛', 钗: '釵', 钏: '釧',
  }
  const trad = (s: string) => [...s].map((c) => SIMPLIFIED[c] ?? c).join('')

  const DISHI: Record<string, string> = {
    长生: '장생', 沐浴: '목욕', 冠带: '관대', 临官: '건록', 帝旺: '제왕', 衰: '쇠',
    病: '병', 死: '사', 墓: '묘', 绝: '절', 胎: '태', 养: '양',
  }
  const SHISHEN: Record<string, string> = {
    比肩: '비견', 劫财: '겁재', 食神: '식신', 伤官: '상관', 偏财: '편재',
    正财: '정재', 七杀: '칠살', 正官: '정관', 偏印: '편인', 正印: '정인',
  }
  const STEM_HANJA = '甲乙丙丁戊己庚辛壬癸'

  it('납음오행: 연속 60일(= 60갑자 전체)의 일주 납음이 모두 일치한다', () => {
    const mismatches: string[] = []
    for (let i = 0; i < 60; i++) {
      const date = new Date(Date.UTC(2001, 0, 1 + i))
      const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate()
      const ours = calculateSaju({ calendar: 'solar', year: y, month: m, day: d, time: { hour: 12, minute: 0 }, gender: 'male' }, { historicalTimeCorrection: false })
      const ec = Lunar.Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar()
      const ourNapeum = ours.pillars[2].napeum
      const lib = trad(ec.getDayNaYin())
      // 우리는 한글 이름이므로 한자 이름으로 비교하려면 데이터에서 찾는다
      const hanja = napeumHanjaByKo(ourNapeum)
      if (hanja !== lib) mismatches.push(`${y}-${m}-${d} ${ganjiHanja(ours.pillars[2].ganji)} 우리=${ourNapeum}(${hanja}) / lunar-javascript=${ec.getDayNaYin()}→${lib}`)
    }
    expect(mismatches.length, report('납음', 60, mismatches)).toBe(0)
  })

  it('지장간(구성·정기)·12운성·십성이 일치한다 (지장간은 알려진 학파 변형만 허용)', () => {
    const samples = makeSamples(1500, 4242, 1912, 2049).filter((s) => !s.nearTerm)
    const jieMs = (y: number) => jieAround(y).map((t) => t.ms)
    // 우리 표에만 있고 lunar-javascript에는 없는 지장간: 문서(261110_사주팔자 기초.md 6절)에 적은 학파차
    // 자 임(여기), 묘 갑(여기), 오 병(여기), 유 경(여기), 해 무(여기)
    const KNOWN_EXTRA: Record<string, string> = { 子: '壬', 卯: '甲', 午: '丙', 酉: '庚', 亥: '戊' }
    const BRANCH_HANJA = '子丑寅卯辰巳午未申酉戌亥'
    const bad: Record<string, string[]> = { 지장간: [], '12운성': [], 천간십성: [], 지장간십성: [] }
    let n = 0
    for (const s of samples) {
      if (s.hour === 23) continue
      const ms = Date.UTC(s.year, s.month - 1, s.day, s.hour, s.minute) - 9 * 3600_000
      if (jieMs(s.year).some((t) => Math.abs(t - ms) <= 3 * 3600_000)) continue
      n++
      const ours = calculateSaju(
        { calendar: 'solar', year: s.year, month: s.month, day: s.day, time: { hour: s.hour, minute: s.minute }, gender: s.gender },
        { historicalTimeCorrection: false },
      )
      const ec = Lunar.Solar.fromYmdHms(s.year, s.month, s.day, s.hour, s.minute, 0).getLunar().getEightChar()
      const libHide = [ec.getYearHideGan(), ec.getMonthHideGan(), ec.getDayHideGan(), ec.getTimeHideGan()]
      const libDishi = [ec.getYearDiShi(), ec.getMonthDiShi(), ec.getDayDiShi(), ec.getTimeDiShi()]
      const libZhi = [ec.getYearShiShenZhi(), ec.getMonthShiShenZhi(), ec.getDayShiShenZhi(), ec.getTimeShiShenZhi()]
      const libGan = [ec.getYearShiShenGan(), ec.getMonthShiShenGan(), ec.getDayShiShenGan(), ec.getTimeShiShenGan()]

      ours.pillars.forEach((p, i) => {
        const where = `${fmt(s)} ${p.key}(${ganjiHanja(p.ganji)})`
        const ourHide = p.hiddenStems.map((h) => STEM_HANJA[h.stem])
        const libList = libHide[i] as string[]
        // 지장간: lunar 구성 ⊆ 우리 구성, 정기 동일, 추가분은 알려진 변형뿐
        const subset = libList.every((c) => ourHide.includes(c))
        const extras = ourHide.filter((c) => !libList.includes(c))
        const extrasKnown = extras.every((c) => KNOWN_EXTRA[BRANCH_HANJA[p.ganji.branch]] === c)
        const sameMain = ourHide[ourHide.length - 1] === libList[0]
        if (!subset || !extrasKnown || !sameMain) {
          bad['지장간'].push(`${where} 우리=${ourHide.join('')} / lunar=${libList.join('')}`)
        }
        if (p.twelveStage.name !== DISHI[libDishi[i] as string]) bad['12운성'].push(`${where} 우리=${p.twelveStage.name} / lunar=${libDishi[i]}`)
        if (p.key !== 'day' && p.stemTenGod!.name !== SHISHEN[libGan[i] as string]) bad['천간십성'].push(`${where} 우리=${p.stemTenGod!.name} / lunar=${libGan[i]}`)
        // 지장간 십성: lunar의 각 지장간(구성 순서대로)에 대해 우리 판정과 직접 비교
        libList.forEach((c, k) => {
          const stemId = STEM_HANJA.indexOf(c)
          const ourName = tenGodOfStem(ours.dayMaster, stemId).name
          if (ourName !== SHISHEN[(libZhi[i] as string[])[k]]) {
            bad['지장간십성'].push(`${where} ${c}: 우리=${ourName} / lunar=${(libZhi[i] as string[])[k]}`)
          }
        })
      })
    }
    expect(n).toBeGreaterThan(700)
    for (const [name, list] of Object.entries(bad)) {
      expect(list.length, report(name, n * 4, list)).toBe(0)
    }
  })
})

import { NAPEUM } from '../data/index.ts'
function napeumHanjaByKo(ko: string): string {
  return NAPEUM.find((n) => n.ko === ko)!.hanja
}
