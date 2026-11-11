import { describe, expect, it } from 'vitest'
import { ZIWEI } from '../data/index.ts'
import type { BirthInput } from '../types/input.ts'
import { extractFeatures } from './features.ts'
import { calculateSaju } from './index.ts'
import { analyzeChart } from './insight.ts'
import { buildCategoryReadings, CATEGORY_ORDER } from './reading.ts'
import type { CategoryReading } from './reading.ts'
import { ziweiFromChart } from './ziwei-from-chart.ts'
import { hasBatchim, josa, 으로로 } from './josa.ts'

const NOW = new Date('2026-11-10T03:00:00Z')

function read(input: BirthInput) {
  const chart = calculateSaju(input)
  const features = extractFeatures(chart, analyzeChart(chart), NOW, ziweiFromChart(chart))
  return { features, readings: buildCategoryReadings(features) }
}

const byId = (rs: CategoryReading[], id: string) => rs.find((r) => r.id === id)!
const ids = (lines: { id: string }[]) => lines.map((l) => l.id)

const INPUT_1992: BirthInput = { calendar: 'solar', year: 1992, month: 10, day: 24, time: { hour: 5, minute: 30 }, gender: 'male' }

describe('특징 추출: 1992-10-24 05:30 남 (임신 경술 계유 을묘) 손풀이', () => {
  // 일간 계(물). 겉으로 드러난 7글자: 시간 을 식신, 월간 경 정인, 연간 임 겁재,
  // 시지 묘(을) 식신, 일지 유(신) 편인, 월지 술(무) 정관, 연지 신(경) 정인
  const { features: f } = read(INPUT_1992)

  it('묶음 개수: 나와 같은 1, 표현 2, 재물 0, 다스림 1, 돕는 3', () => {
    expect(f.groups).toEqual({ 비겁: 1, 식상: 2, 재성: 0, 관성: 1, 인성: 3 })
  })

  it('재물의 기운은 겉에 없고 속에 숨은 글자(술 속 정화 = 편재)에 1개', () => {
    expect(f.hiddenGroups.재성).toBe(1)
    expect(f.tenGods['편재']).toBeUndefined()
  })

  it('배우자(남성 → 재물의 기운) 0개·숨은 1개, 배우자 자리는 돕는 기운(편인)', () => {
    expect(f.spouse).toEqual({ group: '재성', count: 0, hidden: 1, inDayBranch: false })
    expect(f.dayBranchGroup).toBe('인성')
    expect(f.dayBranchTenGod).toBe('편인')
  })

  it('배우자 자리(유)의 관계: 신유술 방합(어울림) 1, 묘유충(부딪힘) 1, 유술해(긴장) 1', () => {
    expect(f.dayBranchNatal).toEqual({ combine: 1, clash: 1, tension: 1 })
  })

  it('없는 기운은 불, 쏠린 기운은 없음(쇠 3개 < 4)', () => {
    expect(f.lacking).toEqual(['fire'])
    expect(f.heavy).toEqual([])
  })

  it('지금 10년 흐름 계축(위: 같은 기운, 아래: 다스림), 2026 병오(위·아래 모두 재물)', () => {
    expect(f.daeun!.ganji.index).toBe(49) // 계축
    expect([f.daeun!.stemGroup, f.daeun!.branchGroup]).toEqual(['비겁', '관성'])
    expect([f.thisYear.year, f.thisYear.stemGroup, f.thisYear.branchGroup]).toEqual([2026, '재성', '재성'])
    expect(f.thisYear.dayBranch).toEqual({ combine: 0, clash: 0, tension: 0 })
  })

  it('옛 이름표: 도와주는 사람 운·매력', () => {
    expect([...f.shinsal].sort()).toEqual(['도화', '천을귀인'])
  })

  it('자미두수: 현재 10년 운은 전택궁', () => {
    expect(f.ziwei!.currentDecadePalace).toBe('전택궁')
    expect(f.ziwei!.palaces['재백궁'].main).toEqual(['ziwei', 'tanlang'])
  })
})

describe('카테고리 해석: 1992 손풀이 기대 문장', () => {
  const { readings: rs } = read(INPUT_1992)

  it('8개 카테고리가 정해진 순서로', () => {
    expect(rs.map((r) => r.id)).toEqual(CATEGORY_ORDER)
  })

  it('성격: 돕는 기운이 가장 많음(3) → 배움·생각 깊음, 3개 이상이라 생각이 많음 주의', () => {
    const r = byId(rs, 'personality')
    expect(r.summary).toContain('계(물)')
    expect(ids(r.strengths)).toContain('p-s-인성')
    expect(ids(r.cautions)).toContain('p-c-인성')
  })

  it('재물: 겉에 없음 + 숨은 글자에 있음, 재능·자격 쪽 통로, 2026년은 재물 흐름', () => {
    const r = byId(rs, 'wealth')
    expect(r.summary).toContain('겉으로는 드러나지 않습니다')
    expect(r.summary).toContain('속에 숨은 글자에는 있어')
    expect(ids(r.strengths)).toEqual(['w-skill', 'w-cred'])
    // 2026·2027년이 모두 재물 흐름이라 한 줄로 합쳐진다
    expect(ids(r.timing)).toContain('w-t-this+next-재성')
  })

  it('연애·결혼: 배려하는 관계, 정이 깊음·매력 / 거리감·오해 주의, 2026년은 배우자 기운이 들어옴', () => {
    const r = byId(rs, 'love')
    expect(ids(r.strengths)).toEqual(['l-partner-인성', 'l-bond', 'l-charm'])
    expect(ids(r.cautions)).toEqual(['l-distance', 'l-friction'])
    expect(ids(r.timing)).toContain('l-t-this+next-spouse')
  })

  it('학업: 꾸준한 이론·직관·시험 구조, 준비가 길어짐 주의', () => {
    const r = byId(rs, 'study')
    expect(ids(r.strengths)).toEqual(['s-steady', 's-intuition', 's-exam'])
    expect(ids(r.cautions)).toEqual(['s-overthink'])
  })

  it('직업: 돕는 기운 중심(연구·교육), 사회 자리는 다스리는 기운', () => {
    const r = byId(rs, 'career')
    expect(r.summary).toContain('연구·교육')
    expect(ids(r.strengths)[0]).toBe('c-month-관성')
  })

  it('건강: 불 기운이 없어 심장·혈액순환 쪽 생활 습관 참고, 진단 아님 안내', () => {
    const r = byId(rs, 'health')
    expect(ids(r.cautions)).toContain('h-lack-fire')
    expect(r.note).toContain('진단이 아닙니다')
  })

  it('흐름: 계축 10년 흐름과 2026·2027년 문장, 자미두수는 집·부동산 칸', () => {
    const r = byId(rs, 'flow')
    expect(r.summary).toContain('계축')
    expect(r.timing.map((t) => t.text).join(' ')).toMatch(/2026년\(병오\).*2027년\(정미\)/)
    expect(r.ziwei).toContain("'집·부동산' 칸")
  })
})

// ── 전수 검사 ──
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInputs(n: number, seed: number): BirthInput[] {
  const r = rng(seed)
  return Array.from({ length: n }, () => ({
    calendar: 'solar' as const,
    year: 1930 + Math.floor(r() * 90),
    month: 1 + Math.floor(r() * 12),
    day: 1 + Math.floor(r() * 28),
    time: r() < 0.15 ? null : { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) },
    gender: (r() < 0.5 ? 'male' : 'female') as 'male' | 'female',
  }))
}

const FORBIDDEN = ['반드시', '틀림없', '무조건', '운명이 정해', '불행', '재앙', '망한', '대박', '죽', '이혼', '파산', '병에 걸', '질병', '암', '수술', '사고', '평생 가난', '확실히']
const JARGON = [
  '비견', '겁재', '식신', '상관', '편재', '정재', '칠살', '편관', '정관', '편인', '정인',
  '장생', '건록', '제왕', '공망', '지장간', '천간', '지지', '신강', '신약', '득령', '득지', '득세',
  '용신', '억부', '조후', '대운', '세운', '명궁', '재백궁', '관록궁', '부처궁', '화록', '화권', '화과', '화기',
  '오행국', '대한', '신살', '천을귀인', '역마', '화개', '도화', '순행', '역행', '십성', '12운성', '납음', '일간', '일지', '월지',
  '비겁', '식상', '재성', '관성', '인성',
]
const STAR_NAMES = ZIWEI.stars.map((s) => s.ko)

/** 화면에 쉬운 말로 보이는 글 (근거의 원래 용어는 제외) */
function plainText(r: CategoryReading): string {
  let text = [r.title, r.summary, ...r.strengths.map((l) => l.text), ...r.cautions.map((l) => l.text), ...r.timing.map((l) => l.text), r.note, r.ziwei ?? '', ...r.basis.map((b) => b.plain)].join(' ')
  for (const n of STAR_NAMES) text = text.split(n).join('')
  return text
}

// 함께 나오면 안 되는 문장 쌍
const CONFLICTS: [string, string][] = [
  ['w-steady', 'w-active'], ['w-steady', 'w-both'], ['w-active', 'w-both'],
  ['w-talent', 'w-skill'], ['w-handle', 'w-cred'], ['w-handle', 'w-skill'], ['w-overload', 'w-spend'],
  ['c-no-structure', 'c-pressure'], ['c-no-structure', 'c-official'], ['c-no-structure', 'c-challenge'], ['c-no-structure', 'c-boss'],
  ['r-peer', 'r-compete'], ['r-peer', 'r-alone'], ['r-alone', 'r-compete'], ['r-elder', 'r-self'],
  ['s-overthink', 's-routine'], ['s-steady', 's-routine'], ['s-exam', 's-routine'], ['s-intuition', 's-routine'],
  ['h-energy', 'h-rest'], ['h-steady', 'h-rest'], ['h-energy', 'h-steady'],
  ['p-c-strong', 'p-c-weak'], ['p-c-strong', 'p-c-balance'], ['p-c-weak', 'p-c-balance'],
  ['l-home', 'l-choice'],
]

describe('전수 검사: 임의 사주 2000건', () => {
  const samples = randomInputs(2000, 777).map((input) => ({ input, ...read(input) }))

  it('8개 카테고리가 모두 요약·주의·근거·참고 문구를 갖는다', () => {
    const bad: string[] = []
    for (const s of samples) {
      if (s.readings.length !== 8) bad.push(`${JSON.stringify(s.input)}: ${s.readings.length}개`)
      for (const r of s.readings) {
        if (!r.summary || r.cautions.length === 0 || r.basis.length === 0 || !r.note) bad.push(`${JSON.stringify(s.input)} ${r.id}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('강점이 하나도 없는 카테고리 비율이 작다 (카테고리별 10% 미만)', () => {
    const empty: Record<string, number> = {}
    for (const s of samples) for (const r of s.readings) if (r.strengths.length === 0) empty[r.id] = (empty[r.id] ?? 0) + 1
    for (const id of CATEGORY_ORDER) expect(empty[id] ?? 0, `${id} 강점 없음 ${empty[id] ?? 0}건`).toBeLessThan(200)
  })

  it('금지 표현(단정·공포·진단)이 없다', () => {
    const bad: string[] = []
    for (const s of samples) for (const r of s.readings) {
      const text = plainText(r)
      for (const w of FORBIDDEN) if (text.includes(w)) bad.push(`${r.id}: ${w} ← ${JSON.stringify(s.input)}`)
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('쉬운 말 문장에 전문 용어가 없다 (근거의 원래 용어와 별 이름 제외)', () => {
    const bad = new Set<string>()
    for (const s of samples) for (const r of s.readings) {
      const text = plainText(r)
      for (const w of JARGON) if (text.includes(w)) bad.add(`${r.id}: ${w}`)
    }
    expect([...bad]).toEqual([])
  })

  it('서로 모순되는 문장이 함께 나오지 않는다', () => {
    const bad: string[] = []
    for (const s of samples) {
      const all = new Set(s.readings.flatMap((r) => [...ids(r.strengths), ...ids(r.cautions)]))
      for (const [a, b] of CONFLICTS) if (all.has(a) && all.has(b)) bad.push(`${a} + ${b} ← ${JSON.stringify(s.input)}`)
      const lack = [...all].some((x) => x.startsWith('h-lack-') || x.startsWith('h-heavy-'))
      if (lack && all.has('h-balance')) bad.push(`h-balance + 치우침 ← ${JSON.stringify(s.input)}`)
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('요약과 문장이 어긋나지 않는다: "드러나지 않음" 요약이면 그 기운이 있다고 전제하는 문장이 없다', () => {
    const bad: string[] = []
    for (const s of samples) {
      const w = byId(s.readings, 'wealth')
      if (w.summary.includes('겉으로는 드러나지 않습니다') && ids(w.strengths).some((x) => ['w-handle', 'w-talent', 'w-steady', 'w-active', 'w-both'].includes(x))) bad.push(`wealth ${JSON.stringify(s.input)}`)
      const l = byId(s.readings, 'love')
      if (l.summary.startsWith('배우자를 뜻하는 기운이 겉으로 드러나지 않아') && ids(l.strengths).includes('l-home')) bad.push(`love ${JSON.stringify(s.input)}`)
      const st = byId(s.readings, 'study')
      if (st.summary.includes('드러나지 않아') && ids(st.strengths).some((x) => ['s-steady', 's-intuition', 's-exam'].includes(x))) bad.push(`study ${JSON.stringify(s.input)}`)
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('시간 모름이면 자미두수 문장이 없다 (null)', () => {
    for (const s of samples.filter((x) => x.input.time === null)) {
      for (const r of s.readings) expect(r.ziwei).toBeNull()
    }
  })

  it('같은 입력이면 항상 같은 결과', () => {
    for (const s of samples.slice(0, 50)) expect(read(s.input).readings).toEqual(s.readings)
  })

  it('강점 2~3, 주의 1~2 상한을 지킨다', () => {
    for (const s of samples) for (const r of s.readings) {
      expect(r.strengths.length).toBeLessThanOrEqual(3)
      expect(r.cautions.length).toBeLessThanOrEqual(2)
    }
  })
})

describe('조사(과/와·을/를·이/가)', () => {
  it('받침 판별과 조사 선택', () => {
    expect(hasBatchim('소화')).toBe(false)
    expect(hasBatchim('신뢰')).toBe(false)
    expect(hasBatchim('시작')).toBe(true)
    expect(hasBatchim("'성과'")).toBe(false) // 따옴표는 건너뛴다
    expect(josa('소화', '과', '와')).toBe('소화와')
    expect(josa('안정과 신뢰', '과', '와')).toBe('안정과 신뢰와')
    expect(josa('규칙적인 식사', '을', '를')).toBe('규칙적인 식사를')
    expect(josa("'배움·준비·도움'", '이', '가')).toBe("'배움·준비·도움'이")
    expect(으로로('기질')).toBe('기질로')
    expect(으로로('흙')).toBe('흙으로')
    expect(으로로('계(물)')).toBe('계(물)로')
    expect(으로로('나무')).toBe('나무로')
    expect(으로로('무(흙)')).toBe('무(흙)으로')
  })

  it('임의 사주 2000건의 문장에서 따옴표 뒤·문장 속 조사가 받침과 맞는다', () => {
    const bad = new Set<string>()
    // '…'과 / '…'와 / '…'이 / '…'가 / '…'을 / '…'를 형태를 모두 검사
    const re = /'([^']+)'(과|와|이|가|을|를)(?=\s)/g
    for (const s of randomInputs(2000, 4242)) {
      for (const r of read(s).readings) {
        const text = [r.summary, ...r.strengths, ...r.cautions, ...r.timing].map((x) => (typeof x === 'string' ? x : x.text)).join(' ')
        for (const m of text.matchAll(re)) {
          const want = { 과: '과', 와: '과', 이: '이', 가: '이', 을: '을', 를: '을' }[m[2]]!
          const pair = { 과: ['과', '와'], 이: ['이', '가'], 을: ['을', '를'] }[want]!
          const right = hasBatchim(m[1]) ? pair[0] : pair[1]
          if (m[2] !== right) bad.add(`${r.id}: '${m[1]}'${m[2]} → ${right}`)
        }
        // 오행 관련 고정 문구의 잘못된 조사 형태
        for (const wrong of ['소화과', '신뢰과', '식사을', '시도과', '성과과', '평가과', '기질으로', '물)으로', '나무)으로']) if (text.includes(wrong)) bad.add(`${r.id}: ${wrong}`)
      }
    }
    expect([...bad]).toEqual([])
  })
})

describe('시기 문장 합치기와 반복 방지', () => {
  it('같은 내용이 이어지는 시기는 한 줄로 합쳐진다 (같은 카드에 같은 문장이 두 번 나오지 않음)', () => {
    for (const s of randomInputs(500, 99)) {
      for (const r of read(s).readings) {
        const bodies = r.timing.map((t) => t.text.replace(/^.*?에는 /, ''))
        for (let i = 1; i < bodies.length; i++) expect(bodies[i], `${r.id} ${JSON.stringify(s)}`).not.toBe(bodies[i - 1])
      }
    }
  })

  it('흐름: 내년 주제가 올해와 같으면 "이어지기", 다르면 "옮겨 가기"', () => {
    for (const s of randomInputs(300, 5)) {
      const f = read(s).features
      const flow = read(s).readings.find((r) => r.id === 'flow')!
      const next = flow.timing.at(-1)!.text
      if (f.nextYear.stemGroup === f.thisYear.stemGroup) expect(next).toContain('이어지기')
      else expect(next).toContain('옮겨 가기')
    }
  })
})
