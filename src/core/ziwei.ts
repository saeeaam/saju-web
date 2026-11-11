/**
 * 자미두수 명반 계산. 규칙: docs/261110_자미두수.md, 261110_검증 필요 항목 조사.md 3절.
 * 지지 위치는 자=0 … 해=11, 모든 위치 계산은 mod 12.
 *
 * 범위: 명궁·신궁, 12궁(이름·천간), 오행국, 14주성, 육길성(좌보·우필·문창·문곡·천괴·천월),
 *       록존·경양·타라, 화성·영성·지공·지겁, 생년 사화, 대한.
 * 미구현: 묘왕리함(밝기), 소한, 유년, 비성사화, 잡요.
 * 안성법은 통행 방식이며 iztro의 기본(default) 알고리즘과 교차 검증했다. 중주파 등 다른 유파는 다를 수 있다.
 */
import { NAPEUM, STEMS, ZIWEI } from '../data/index.ts'
import type { Gender } from '../types/input.ts'
import type { LeapMonthRule } from '../types/options.ts'
import { ganjiFromParts, mod } from './ganji.ts'
import type { Ganji } from './ganji.ts'

export type ZiweiStarId = (typeof ZIWEI.stars)[number]['id']
export type SihuaType = '록' | '권' | '과' | '기'
const SIHUA_TYPES: SihuaType[] = ['록', '권', '과', '기']

export interface ZiweiInput {
  /** 음력 생년월일 */
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean }
  /** 생시 지지 (자=0 … 해=11) */
  hourBranch: number
  gender: Gender
  leapMonthRule: LeapMonthRule
}

export interface ZiweiStar {
  id: ZiweiStarId
  sihua: SihuaType | null
}

export interface ZiweiPalace {
  branch: number
  stem: number
  /** 궁 이름 (명궁, 형제궁 …) */
  name: string
  /** 명궁에서 역행으로 센 순서 (명궁 0, 형제 1 … 부모 11) */
  order: number
  isBody: boolean
  stars: ZiweiStar[]
  /** 대한 나이 범위 [시작, 끝] */
  decade: [number, number]
}

export interface ZiweiChart {
  /** 생년 간지 (음력 연도 기준) */
  yearGanji: Ganji
  /** 명반에 쓴 음력 월 (윤달 처리 반영) */
  effectiveMonth: number
  soulBranch: number
  bodyBranch: number
  /** 오행국 수 (2~6)와 오행 */
  bureau: { number: number; element: 'water' | 'wood' | 'metal' | 'earth' | 'fire'; napeum: string }
  /** 자미성 위치 */
  ziweiBranch: number
  /** 대한 순행 여부 */
  decadeForward: boolean
  /** 지지 0~11 순서의 12궁 */
  palaces: ZiweiPalace[]
}

/** 윤달을 명반에서 몇 월로 볼지. split-15: 15일까지 그 달, 16일부터 다음 달 */
export function effectiveLunarMonth(lunar: ZiweiInput['lunar'], rule: LeapMonthRule): number {
  if (!lunar.isLeapMonth || rule === 'as-is') return lunar.month
  return lunar.day <= 15 ? lunar.month : (lunar.month % 12) + 1
}

/** 명궁·신궁. 인궁을 정월로 생월까지 순행, 거기서 자시를 일으켜 생시까지 명궁은 역행·신궁은 순행 */
export function soulAndBody(month: number, hourBranch: number): { soul: number; body: number } {
  return { soul: mod(2 + (month - 1) - hourBranch, 12), body: mod(2 + (month - 1) + hourBranch, 12) }
}

/** 궁의 천간: 생년 천간으로 인궁 천간을 정하고(오호둔) 지지 순서대로 증가 */
export function palaceStem(yearStem: number, branch: number): number {
  const yinStem = mod((yearStem % 5) * 2 + 2, 10)
  return mod(yinStem + mod(branch - 2, 12), 10)
}

/** 자미성 위치. 오행국 수 n, 음력 생일 d */
export function ziweiPosition(bureau: number, day: number): number {
  let x = 0
  while ((day + x) % bureau !== 0) x++
  const q = (day + x) / bureau
  const base = 2 + (q - 1)
  return mod(x % 2 === 0 ? base + x : base - x, 12)
}

export function calculateZiwei(input: ZiweiInput): ZiweiChart {
  const { lunar, hourBranch: h, gender } = input
  const yearIndex = mod(lunar.year - 4, 60)
  const yearGanji: Ganji = { stem: yearIndex % 10, branch: yearIndex % 12, index: yearIndex }
  const m = effectiveLunarMonth(lunar, input.leapMonthRule)

  const { soul, body } = soulAndBody(m, h)

  // 오행국: 명궁 간지의 납음오행
  const soulGanji = ganjiFromParts(palaceStem(yearGanji.stem, soul), soul)
  const napeum = NAPEUM[Math.floor(soulGanji.index / 2)]
  const bureauNumber = ZIWEI.bureauByElement[napeum.element as keyof typeof ZIWEI.bureauByElement]
  const ziwei = ziweiPosition(bureauNumber, lunar.day)
  const tianfu = mod(4 - ziwei, 12)

  const positions = new Map<ZiweiStarId, number>()
  for (const [id, off] of Object.entries(ZIWEI.ziweiGroupOffsets)) {
    if (!id.startsWith('_')) positions.set(id as ZiweiStarId, mod(ziwei + (off as number), 12))
  }
  for (const [id, off] of Object.entries(ZIWEI.tianfuGroupOffsets)) {
    if (!id.startsWith('_')) positions.set(id as ZiweiStarId, mod(tianfu + (off as number), 12))
  }

  // 육길성·록존·살성
  positions.set('zuofu', mod(4 + (m - 1), 12))
  positions.set('youbi', mod(10 - (m - 1), 12))
  positions.set('wenchang', mod(10 - h, 12))
  positions.set('wenqu', mod(4 + h, 12))
  const [kui, yue] = ZIWEI.kuiYueByStem.table[yearGanji.stem]
  positions.set('tiankui', kui)
  positions.set('tianyue', yue)
  const lu = ZIWEI.luCunByStem[yearGanji.stem]
  positions.set('lucun', lu)
  positions.set('qingyang', mod(lu + 1, 12))
  positions.set('tuoluo', mod(lu - 1, 12))
  positions.set('dijie', mod(11 + h, 12))
  positions.set('dikong', mod(11 - h, 12))
  const fb = ZIWEI.fireBellStart.groups.find((g) => g.branches.includes(yearGanji.branch))!
  positions.set('huoxing', mod(fb.huoxing + h, 12))
  positions.set('lingxing', mod(fb.lingxing + h, 12))

  // 생년 사화
  const sihua = new Map<string, SihuaType>()
  ZIWEI.sihuaByStem.table[yearGanji.stem].forEach((id, i) => sihua.set(id, SIHUA_TYPES[i]))

  // 대한: 양남음녀 순행, 음남양녀 역행. 명궁부터 오행국 수의 나이로 시작
  const yang = STEMS[yearGanji.stem].yinYang === 'yang'
  const decadeForward = gender === 'male' ? yang : !yang

  const starOrder = ZIWEI.stars.map((s) => s.id as ZiweiStarId)
  const palaces: ZiweiPalace[] = Array.from({ length: 12 }, (_, branch) => {
    const order = mod(soul - branch, 12)
    const steps = decadeForward ? mod(branch - soul, 12) : mod(soul - branch, 12)
    const start = bureauNumber + 10 * steps
    return {
      branch,
      stem: palaceStem(yearGanji.stem, branch),
      name: ZIWEI.palaces[order],
      order,
      isBody: branch === body,
      stars: starOrder
        .filter((id) => positions.get(id) === branch)
        .map((id) => ({ id, sihua: sihua.get(id) ?? null })),
      decade: [start, start + 9],
    }
  })

  return {
    yearGanji,
    effectiveMonth: m,
    soulBranch: soul,
    bodyBranch: body,
    bureau: { number: bureauNumber, element: napeum.element, napeum: napeum.ko },
    ziweiBranch: ziwei,
    decadeForward,
    palaces,
  }
}
