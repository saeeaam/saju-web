/**
 * 카테고리별 해석 (규칙 기반). 특징(features.ts) → 조건 → 문장.
 *
 * 문장 원칙 (docs: 261111_보완 계획 4절):
 * - 쉬운 말, "~로 봅니다·~편입니다" 같은 참고 어조. 단정·예언·공포 표현 없음.
 * - 시기는 단정하지 않는다("몇 년에 결혼" 같은 표현 없음).
 * - 건강은 생활 습관 참고만. 진단·질병 예측 없음. 재물은 투자 판단 근거가 아님.
 * - 같은 입력이면 항상 같은 결과 (LLM·난수 없음).
 * - 근거(basis)는 쉬운 말 + 원래 용어를 함께 담아, 화면에서 "전문 용어 함께 보기"에 따라 보여준다.
 */
import { STEMS } from '../data/index.ts'
import type { Element } from '../types/basic.ts'
import type { Group, LuckFeature, ReadingFeatures } from './features.ts'
import { GROUPS } from './features.ts'
import { ganjiName } from './ganji.ts'
import { 과와, 으로로, 을를, 이가 } from './josa.ts'

export type CategoryId = 'personality' | 'wealth' | 'career' | 'love' | 'relations' | 'study' | 'health' | 'flow'

export const CATEGORY_ORDER: CategoryId[] = ['personality', 'wealth', 'career', 'love', 'relations', 'study', 'health', 'flow']

export const CATEGORY_TITLE: Record<CategoryId, string> = {
  personality: '성격·기질',
  wealth: '재물',
  career: '직업·적성',
  love: '연애·결혼',
  relations: '대인관계·가족',
  study: '학업·시험',
  health: '건강 (생활 참고)',
  flow: '올해와 10년 흐름',
}

/** 문장 한 개. id로 모순 검사·테스트를 한다 */
export interface Line {
  id: string
  text: string
}

/** 근거 한 개: 쉬운 말 + 원래 용어 */
export interface BasisItem {
  plain: string
  term?: string
}

export interface CategoryReading {
  id: CategoryId
  title: string
  summary: string
  strengths: Line[]
  cautions: Line[]
  timing: Line[]
  basis: BasisItem[]
  /** 자미두수 관점 한 줄 (시간을 모르면 null) */
  ziwei: string | null
  /** 카테고리별 참고 문구 */
  note: string
}

// ── 쉬운 말 사전 (코어 전용, 화면 용어 사전과 같은 표현) ──
export const GROUP_PLAIN: Record<Group, string> = {
  비겁: '나와 같은 기운',
  식상: '표현하는 기운',
  재성: '재물의 기운',
  관성: '다스리는 기운',
  인성: '돕는 기운',
}

const GROUP_THEME: Record<Group, string> = {
  비겁: '사람·경쟁·독립',
  식상: '표현·활동·새로운 시도',
  재성: '돈·현실 문제·성과',
  관성: '책임·직장·평가',
  인성: '배움·준비·도움',
}

const ELEMENT_PLAIN: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' }
const ELEMENT_TRAIT: Record<Element, string> = {
  wood: '성장과 시작',
  fire: '표현과 열정',
  earth: '안정과 신뢰',
  metal: '결단과 원칙',
  water: '지혜와 유연함',
}
const ELEMENT_BODY: Record<Element, string> = {
  wood: '간·눈·근육',
  fire: '심장·혈액순환',
  earth: '위장·소화',
  metal: '폐·호흡·피부',
  water: '신장·방광·몸의 수분',
}
const ELEMENT_HABIT: Record<Element, string> = {
  wood: '스트레칭과 눈의 휴식',
  fire: '체온 유지와 가벼운 유산소 운동',
  earth: '규칙적인 식사',
  metal: '호흡 운동과 피부 보습',
  water: '충분한 수분과 잠',
}

const STRENGTH_PLAIN = { 신강: '강한 편', 신약: '약한 편', 중화: '균형' } as const

const DAY_MASTER_PLAIN: string[] = [
  '큰 나무처럼 곧게 위로 뻗어 가려는 기질',
  '풀과 덩굴처럼 유연하게 길을 찾는 기질',
  '태양처럼 밝고 드러내는 기질',
  '촛불처럼 따뜻하고 섬세한 기질',
  '큰 산처럼 묵직하고 든든한 기질',
  '논밭의 흙처럼 품고 길러 내는 기질',
  '바위와 쇠처럼 단단하고 결단력 있는 기질',
  '다듬은 보석처럼 예리하고 깔끔한 기질',
  '큰 강과 바다처럼 넓고 흐름을 읽는 기질',
  '비와 이슬처럼 조용히 스며드는 기질',
]

const STAR_PLAIN: Record<string, { name: string; trait: string }> = {
  ziwei: { name: '자미', trait: '앞에 서서 이끄는 힘' },
  tianji: { name: '천기', trait: '머리를 써서 계획하고 바꾸는 힘' },
  taiyang: { name: '태양', trait: '밝게 드러내고 베푸는 힘' },
  wuqu: { name: '무곡', trait: '실행력과 돈을 다루는 감각' },
  tiantong: { name: '천동', trait: '온화함과 여유' },
  lianzhen: { name: '염정', trait: '열정과 원칙' },
  tianfu: { name: '천부', trait: '안정적으로 지키고 쌓는 힘' },
  taiyin: { name: '태음', trait: '섬세함과 차분히 모으는 힘' },
  tanlang: { name: '탐랑', trait: '다재다능함과 사람을 끄는 힘' },
  jumen: { name: '거문', trait: '말과 분석의 힘' },
  tianxiang: { name: '천상', trait: '조율하고 돕는 힘' },
  tianliang: { name: '천량', trait: '보호하고 바로잡는 힘' },
  qisha: { name: '칠살', trait: '혼자 밀고 나가는 추진력' },
  pojun: { name: '파군', trait: '낡은 것을 깨고 새로 여는 힘' },
}

const PALACE_PLAIN: Record<string, string> = {
  명궁: '나 자신',
  형제궁: '형제·동료',
  부처궁: '배우자',
  자녀궁: '자녀',
  재백궁: '재물',
  질액궁: '몸과 건강',
  천이궁: '바깥 활동·이동',
  노복궁: '친구·아랫사람',
  관록궁: '일과 직업',
  전택궁: '집·부동산',
  복덕궁: '마음의 여유',
  부모궁: '부모·윗사람',
}

const SIHUA_PLAIN: Record<string, string> = { 록: '잘 풀림', 권: '힘을 얻음', 과: '이름이 남', 기: '마음 쓰임' }

// ── 도우미 ──
const has = (n: number | undefined) => (n ?? 0) > 0
const tg = (f: ReadingFeatures, name: string) => f.tenGods[name] ?? 0

/** 가장 많은 묶음 (같으면 최대 2개, 0개면 빈 배열) */
function topGroups(f: ReadingFeatures): Group[] {
  const max = Math.max(...GROUPS.map((g) => f.groups[g]))
  if (max === 0) return []
  return GROUPS.filter((g) => f.groups[g] === max).slice(0, 2)
}

/** 운(10년·올해·내년)의 위·아래 글자 묶음 중 keys에 해당하는 것을 우선 고른다 */
function pickGroup(luck: LuckFeature, keys: Group[]): Group | null {
  if (keys.includes(luck.stemGroup)) return luck.stemGroup
  if (keys.includes(luck.branchGroup)) return luck.branchGroup
  return null
}

interface LuckSlot {
  key: 'daeun' | 'this' | 'next'
  label: string
  luck: LuckFeature
}

function luckSlots(f: ReadingFeatures): LuckSlot[] {
  const out: LuckSlot[] = []
  if (f.daeun) out.push({ key: 'daeun', label: `지금의 10년 흐름(${ganjiName(f.daeun.ganji)})`, luck: f.daeun })
  out.push({ key: 'this', label: `${f.thisYear.year}년(${ganjiName(f.thisYear.ganji)})`, luck: f.thisYear })
  out.push({ key: 'next', label: `${f.nextYear.year}년(${ganjiName(f.nextYear.ganji)})`, luck: f.nextYear })
  return out
}

/** 시기 문장 한 개의 재료: 어느 시기(slot)에 어떤 내용(body)인지 */
interface TimingPart {
  slot: LuckSlot
  /** id 끝부분 (예: 재성, spouse, general) */
  tag: string
  /** "~에는" 뒤에 오는 내용 */
  body: string
}

/** 이어지는 시기의 내용이 같으면 "A, B에는 …"처럼 한 줄로 합친다 */
function mergeTiming(prefix: string, parts: TimingPart[]): Line[] {
  const out: Line[] = []
  let i = 0
  while (i < parts.length) {
    let j = i
    while (j + 1 < parts.length && parts[j + 1].body === parts[i].body && parts[j + 1].tag === parts[i].tag) j++
    const group = parts.slice(i, j + 1)
    const keys = group.map((p) => p.slot.key).join('+')
    const labels = group.map((p) => p.slot.label).join(', ')
    out.push({ id: `${prefix}-t-${keys}-${parts[i].tag}`, text: `${labels}에는 ${parts[i].body}` })
    i = j + 1
  }
  return out
}

/** 카테고리 시기 문장: 운에 그 카테고리의 핵심 묶음이 들어오면 맞춤 문장, 아니면 일반 문장 */
function timingLines(f: ReadingFeatures, prefix: string, texts: Partial<Record<Group, string>>, slots = luckSlots(f)): Line[] {
  const keys = Object.keys(texts) as Group[]
  const parts: TimingPart[] = slots.map((s) => {
    const g = pickGroup(s.luck, keys)
    if (g) return { slot: s, tag: g, body: texts[g]! }
    return { slot: s, tag: 'general', body: `이 영역보다 ${과와(`'${GROUP_THEME[s.luck.stemGroup]}'`)} 관련된 일이 더 두드러지기 쉽습니다.` }
  })
  return mergeTiming(prefix, parts)
}

function ziweiPalaceLine(f: ReadingFeatures, palace: string): string | null {
  if (!f.ziwei) return null
  const p = f.ziwei.palaces[palace]
  if (!p) return null
  const area = PALACE_PLAIN[palace]
  let text: string
  if (p.main.length === 0) {
    text = `자미두수로 보면 '${area}' 칸에는 큰 별이 없어, 맞은편 칸의 영향을 함께 본다고 합니다.`
  } else {
    const names = p.main.map((s) => STAR_PLAIN[s].name).join('·')
    const traits = p.main.map((s) => STAR_PLAIN[s].trait).join(', ')
    text = `자미두수로 보면 '${area}' 칸에 ${names} 별이 있어 ${이가(traits)} 이 영역에서 드러난다고 봅니다.`
  }
  const sihua = p.sihua.map((s) => `"${SIHUA_PLAIN[s.type]}"`)
  if (sihua.length) text += ` 이 칸에는 ${sihua.join('·')} 표시가 있습니다.`
  return text
}

const fallbackCaution = (id: string, text: string): Line => ({ id, text })

// ── 카테고리별 규칙 ──

function personality(f: ReadingFeatures): CategoryReading {
  const stem = STEMS[f.dayStem]
  const tops = topGroups(f)
  const strengthText = {
    신강: '내 기운이 강한 편이라 주관이 뚜렷하고 밀고 나가는 힘이 있습니다.',
    신약: '내 기운이 약한 편이라 주변과 맞추는 능력이 좋고, 도움을 받을 때 힘을 냅니다.',
    중화: '나를 돕는 기운과 누르는 기운이 균형에 가까워 상황에 맞춰 움직이는 편입니다.',
  }[f.strength]
  const summary = `나를 뜻하는 글자는 ${으로로(`${stem.ko}(${ELEMENT_PLAIN[stem.element]})`)}, ${으로로(DAY_MASTER_PLAIN[f.dayStem])} 봅니다. ${strengthText}`

  const STR: Record<Group, string> = {
    비겁: '자기 생각이 분명하고 스스로 해내려는 힘이 있는 편입니다.',
    식상: '생각을 말과 행동으로 표현하는 데 능한 편입니다.',
    재성: '현실 감각이 있고 계획을 세워 실속을 챙기는 편입니다.',
    관성: '책임감이 있고 맡은 일을 바르게 해내려는 편입니다.',
    인성: '배우기를 좋아하고 생각이 깊은 편입니다.',
  }
  const CAU: Record<Group, string> = {
    비겁: '고집이 강해 보일 수 있어, 남의 의견을 한 번 더 들어 보면 좋습니다.',
    식상: '말이 앞서거나 일을 벌이기만 하고 마무리가 약해질 수 있습니다.',
    재성: '결과와 실속을 따지다 보면 마음의 여유를 놓치기 쉽습니다.',
    관성: '스스로에게 엄격해 부담을 크게 느끼기 쉽습니다.',
    인성: '생각이 많아 행동으로 옮기는 데 시간이 걸릴 수 있습니다.',
  }

  const strengths: Line[] = tops.map((g) => ({ id: `p-s-${g}`, text: STR[g] }))
  for (const e of f.heavy) {
    strengths.push({ id: `p-heavy-${e}`, text: `${ELEMENT_PLAIN[e]} 기운이 많아 ${ELEMENT_TRAIT[e]}의 성향이 강하게 드러나는 편입니다.` })
  }

  const cautions: Line[] = GROUPS.filter((g) => f.groups[g] >= 3).map((g) => ({ id: `p-c-${g}`, text: CAU[g] }))
  for (const e of f.lacking.slice(0, 1)) {
    cautions.push({ id: `p-lack-${e}`, text: `${ELEMENT_PLAIN[e]} 기운이 없어 ${과와(ELEMENT_TRAIT[e])} 관련된 부분은 의식해서 채워 가면 좋습니다.` })
  }
  if (cautions.length === 0) {
    cautions.push(
      {
        신강: fallbackCaution('p-c-strong', '자기 방식대로 밀어붙이기 쉬우니 속도를 조절하면 좋습니다.'),
        신약: fallbackCaution('p-c-weak', '주변 의견에 흔들리기 쉬워, 스스로 정한 기준을 세워 두면 좋습니다.'),
        중화: fallbackCaution('p-c-balance', '뚜렷한 쏠림이 없어 장점이 덜 드러나 보일 수 있으니, 한 분야를 꾸준히 밀어 보는 것이 좋습니다.'),
      }[f.strength],
    )
  }

  return {
    id: 'personality',
    title: CATEGORY_TITLE.personality,
    summary,
    strengths: strengths.slice(0, 3),
    cautions: cautions.slice(0, 2),
    timing: f.daeun
      ? [{ id: `p-t-daeun-${f.daeun.stemGroup}`, text: `지금의 10년 흐름에서는 ${과와(`'${GROUP_THEME[f.daeun.stemGroup]}'`)} 관련된 면이 성격에서도 두드러지기 쉽습니다.` }]
      : [],
    basis: [
      { plain: `나를 뜻하는 글자: ${stem.ko}(${ELEMENT_PLAIN[stem.element]})`, term: '일간' },
      { plain: `내 기운의 세기: ${STRENGTH_PLAIN[f.strength]} (${Math.round(f.strengthPercent)}%)`, term: f.strength },
      ...(tops.length ? [{ plain: `가장 많은 기운: ${tops.map((g) => GROUP_PLAIN[g]).join('·')} ${f.groups[tops[0]]}개`, term: tops.join('·') }] : []),
    ],
    ziwei: ziweiPalaceLine(f, '명궁'),
    note: '성격은 환경과 경험에 따라 달라집니다. 경향을 보는 참고로만 보세요.',
  }
}

function wealth(f: ReadingFeatures): CategoryReading {
  const W = f.groups.재성
  const H = f.hiddenGroups.재성
  const jung = tg(f, '정재')
  const pyeon = tg(f, '편재')
  let summary: string
  if (W === 0) {
    summary = '재물의 기운이 겉으로는 드러나지 않습니다. 돈을 좇기보다 실력과 신뢰를 쌓아 그 결과로 재물이 따라오는 쪽으로 봅니다.'
    if (H > 0) summary += ' 속에 숨은 글자에는 있어 운의 흐름에 따라 드러날 수 있습니다.'
  } else if (W >= 3) {
    summary = '재물의 기운이 많은 편입니다. 돈을 다룰 기회가 많고 현실 감각이 좋은 편으로 봅니다.'
  } else {
    summary = '재물의 기운이 알맞게 있는 편입니다. 버는 방식과 지키는 방식의 균형이 중요하다고 봅니다.'
  }

  const strengths: Line[] = []
  if (jung > pyeon) strengths.push({ id: 'w-steady', text: '월급·저축처럼 꾸준히 쌓는 방식이 잘 맞는 편입니다.' })
  else if (pyeon > jung) strengths.push({ id: 'w-active', text: '사업·영업처럼 움직이며 버는 방식에 감각이 있는 편입니다.' })
  else if (jung > 0) strengths.push({ id: 'w-both', text: '꾸준한 수입과 움직이는 수입을 함께 다룰 수 있는 편입니다.' })
  if (has(f.groups.식상) && W > 0) strengths.push({ id: 'w-talent', text: '재능과 표현이 수입으로 이어지기 쉬운 구조로 봅니다.' })
  if (W > 0 && f.strength !== '신약') strengths.push({ id: 'w-handle', text: '재물을 다루고 지키는 힘이 있는 편입니다.' })
  if (W === 0 && has(f.groups.식상)) strengths.push({ id: 'w-skill', text: '기술과 재능을 키우면 그것이 재물의 통로가 된다고 봅니다.' })
  if (W === 0 && has(f.groups.인성)) strengths.push({ id: 'w-cred', text: '자격과 전문성으로 인정받는 쪽에서 재물이 따라오기 쉽다고 봅니다.' })

  const cautions: Line[] = []
  if (W >= 3 && f.strength === '신약') cautions.push({ id: 'w-overload', text: '기회에 비해 감당할 힘이 부족할 수 있어, 무리하게 늘리기보다 관리에 힘쓰는 편이 좋습니다.' })
  if (f.groups.비겁 >= 3 && W > 0) cautions.push({ id: 'w-share', text: '돈이 사람을 통해 나가기 쉬운 구조라, 동업·보증·빌려주는 일은 신중한 편이 좋습니다.' })
  if (pyeon >= 2 && jung === 0) cautions.push({ id: 'w-swing', text: '들어오고 나가는 폭이 클 수 있어 꾸준히 모아 두는 습관이 도움이 됩니다.' })
  if (W === 0 && f.groups.비겁 >= 2) cautions.push({ id: 'w-spend', text: '사람을 챙기느라 지출이 늘기 쉬우니 씀씀이의 기준을 정해 두면 좋습니다.' })
  if (cautions.length === 0) cautions.push({ id: 'w-default', text: '큰돈이 오가는 결정은 사주보다 실제 상황과 숫자를 기준으로 판단하세요.' })

  return {
    id: 'wealth',
    title: CATEGORY_TITLE.wealth,
    summary,
    strengths: strengths.slice(0, 3),
    cautions: cautions.slice(0, 2),
    timing: timingLines(f, 'w', {
      재성: '돈·성과와 관련된 일이 두드러질 수 있습니다.',
      식상: '재능을 수입으로 연결해 볼 만한 흐름입니다.',
      비겁: '지출이나 경쟁이 늘 수 있어 씀씀이를 살피면 좋습니다.',
    }),
    basis: [
      { plain: `재물의 기운 ${W}개 (속에 숨은 글자 ${H}개)`, term: '재성' },
      { plain: `꾸준한 재물 ${jung}개 · 큰 재물·활동 ${pyeon}개`, term: '정재·편재' },
      { plain: `표현하는 기운 ${f.groups.식상}개 · 나와 같은 기운 ${f.groups.비겁}개`, term: '식상·비겁' },
    ],
    ziwei: ziweiPalaceLine(f, '재백궁'),
    note: '재물 해석은 경향일 뿐이며 투자·대출 같은 판단의 근거로 쓰지 마세요.',
  }
}

function career(f: ReadingFeatures): CategoryReading {
  const FIELD: Record<Group, string> = {
    비겁: '스스로 꾸려 가는 일(자영·프리랜서)이나 팀을 이끄는 일',
    식상: '기술·예술·교육·말과 글처럼 표현하고 만들어 내는 일',
    재성: '사업·영업·재무·유통처럼 돈과 자원을 다루는 일',
    관성: '조직·공공 기관·관리직처럼 체계와 책임이 분명한 일',
    인성: '연구·교육·자격이 필요한 전문직처럼 배움을 쌓는 일',
  }
  const tops = topGroups(f)
  const summary = tops.length
    ? `${이가(tops.map((g) => GROUP_PLAIN[g]).join('과 '))} 두드러져 ${tops.map((g) => FIELD[g]).join(', 또는 ')}에 적성이 있는 편으로 봅니다.`
    : '기운이 고르게 퍼져 있어 한 분야보다 여러 경험을 거치며 적성을 찾아가는 편으로 봅니다.'

  const strengths: Line[] = []
  const monthBranch = f.monthGroups[1]
  strengths.push({ id: `c-month-${monthBranch}`, text: `사회 자리(태어난 달)에 ${이가(GROUP_PLAIN[monthBranch])} 있어, 일터에서는 ${과와(`'${GROUP_THEME[monthBranch]}'`)} 관련된 모습으로 보이기 쉽습니다.` })
  if (has(tg(f, '정관'))) strengths.push({ id: 'c-official', text: '정해진 규칙 안에서 신뢰를 쌓는 일에 강한 편입니다.' })
  if (has(tg(f, '칠살'))) strengths.push({ id: 'c-challenge', text: '압박이 있는 환경에서 오히려 힘을 내는 편입니다.' })
  if (has(tg(f, '식신'))) strengths.push({ id: 'c-craft', text: '한 분야를 즐기며 깊게 파고드는 데 강점이 있습니다.' })
  if (has(tg(f, '상관'))) strengths.push({ id: 'c-creative', text: '기존 방식을 바꾸는 아이디어와 말솜씨가 강점입니다.' })
  if (f.shinsal.has('역마')) strengths.push({ id: 'c-move', text: '이동·출장·해외처럼 움직임이 많은 일과 잘 맞는다고 봅니다.' })
  if (f.shinsal.has('화개')) strengths.push({ id: 'c-deep', text: '연구·예술처럼 혼자 깊이 몰두하는 일과 잘 맞는다고 봅니다.' })
  if (f.shinsal.has('도화')) strengths.push({ id: 'c-people', text: '사람을 만나고 드러나는 일(서비스·홍보)에서 매력이 발휘되기 쉽습니다.' })

  const cautions: Line[] = []
  if (f.groups.관성 === 0) cautions.push({ id: 'c-no-structure', text: '틀이 엄격한 조직에서는 답답함을 느끼기 쉬워, 스스로 방식을 정할 여지가 있는 환경이 편한 편입니다.' })
  if (f.groups.관성 >= 3) cautions.push({ id: 'c-pressure', text: '책임과 평가가 몰리기 쉬워 일의 우선순위를 정해 두는 것이 도움이 됩니다.' })
  if (f.groups.식상 >= 3 && f.groups.관성 > 0) cautions.push({ id: 'c-boss', text: '윗사람이나 규칙과 부딪히기 쉬우니 말의 수위를 조절하면 좋습니다.' })
  if (f.groups.비겁 >= 3) cautions.push({ id: 'c-solo', text: '혼자 끌고 가려는 경향이 있어 함께 일하는 방식을 미리 정해 두면 좋습니다.' })
  if (cautions.length === 0) cautions.push({ id: 'c-default', text: '적성은 경험으로 확인하는 것이 가장 정확합니다. 사주는 방향을 고르는 참고로만 보세요.' })

  return {
    id: 'career',
    title: CATEGORY_TITLE.career,
    summary,
    strengths: strengths.slice(0, 3),
    cautions: cautions.slice(0, 2),
    timing: timingLines(f, 'c', {
      관성: '책임이 늘거나 평가·승진처럼 일의 위치가 달라질 수 있는 흐름입니다.',
      식상: '새로운 일을 시도하거나 일하는 방식을 바꾸고 싶어지기 쉬운 흐름입니다.',
      인성: '공부·자격 준비처럼 다음 단계를 준비하기 좋은 흐름입니다.',
      재성: '성과와 보상이 주제가 되기 쉬운 흐름입니다.',
      비겁: '독립하거나 함께 일할 사람이 바뀌는 등 사람과 관련된 변화가 생기기 쉽습니다.',
    }),
    basis: [
      ...(tops.length ? [{ plain: `가장 많은 기운: ${tops.map((g) => GROUP_PLAIN[g]).join('·')}`, term: tops.join('·') }] : []),
      { plain: `사회 자리(태어난 달 아래 글자): ${GROUP_PLAIN[monthBranch]}`, term: `월지 ${monthBranch}` },
      { plain: `다스리는 기운 ${f.groups.관성}개 · 표현하는 기운 ${f.groups.식상}개`, term: '관성·식상' },
    ],
    ziwei: ziweiPalaceLine(f, '관록궁'),
    note: '직업 선택은 흥미·능력·환경을 함께 보고 정하세요. 사주는 참고 자료입니다.',
  }
}

function love(f: ReadingFeatures): CategoryReading {
  const s = f.spouse
  let summary: string
  if (s.count === 0) {
    summary = '배우자를 뜻하는 기운이 겉으로 드러나지 않아, 인연의 시기는 운의 흐름에서 함께 봅니다.'
    if (s.hidden > 0) summary += ' 속에 숨은 글자에는 있어 때가 되면 드러날 수 있습니다.'
  } else if (s.count >= 3) {
    summary = '배우자를 뜻하는 기운이 많은 편이라 인연이 많을 수 있고, 그만큼 관계를 고르는 눈이 중요하다고 봅니다.'
  } else {
    summary = '배우자를 뜻하는 기운이 알맞게 있는 편입니다.'
  }

  const PARTNER: Record<Group, string> = {
    비겁: '배우자 자리에 나와 같은 기운이 있어 친구처럼 편한 관계를 맺기 쉽습니다.',
    식상: '배우자 자리에 표현하는 기운이 있어 함께 있을 때 편안하고 대화가 잘 통하는 관계로 봅니다.',
    재성: '배우자 자리에 재물의 기운이 있어 현실적이고 생활력 있는 관계로 봅니다.',
    관성: '배우자 자리에 다스리는 기운이 있어 서로 책임감 있게 지켜 주는 관계로 봅니다.',
    인성: '배우자 자리에 돕는 기운이 있어 서로 배려하고 챙겨 주는 관계로 봅니다.',
  }
  const strengths: Line[] = [{ id: `l-partner-${f.dayBranchGroup}`, text: PARTNER[f.dayBranchGroup] }]
  if (s.inDayBranch && s.count <= 2) strengths.push({ id: 'l-home', text: '배우자를 뜻하는 기운이 배우자 자리에 있어 인연이 자리를 잡기 쉬운 구조로 봅니다.' })
  if (f.dayBranchNatal.combine > 0) strengths.push({ id: 'l-bond', text: '배우자 자리가 다른 글자와 어울려 있어 정이 깊은 편입니다.' })
  if (f.shinsal.has('도화')) strengths.push({ id: 'l-charm', text: '사람을 끄는 매력이 있어 이성의 관심을 받기 쉽습니다.' })

  const cautions: Line[] = []
  if (f.dayBranchNatal.clash > 0) cautions.push({ id: 'l-distance', text: '배우자 자리가 다른 글자와 부딪혀 있어 관계에 변화나 거리감이 생기기 쉬우니, 대화로 맞춰 가는 노력이 중요합니다.' })
  if (f.dayBranchNatal.tension > 0) cautions.push({ id: 'l-friction', text: '배우자 자리에 긴장 관계가 있어 사소한 오해가 쌓이지 않게 하는 것이 좋습니다.' })
  if (f.gender === 'female' && f.groups.식상 >= 3 && f.groups.관성 > 0) cautions.push({ id: 'l-words', text: '말이 날카롭게 전달되기 쉬워 표현 방식에 조금 신경 쓰면 좋습니다.' })
  if (f.gender === 'male' && f.groups.비겁 >= 3 && f.groups.재성 > 0) cautions.push({ id: 'l-attention', text: '사람 관계가 넓어 연인에게 소홀해 보일 수 있으니 둘만의 시간을 따로 내면 좋습니다.' })
  if (s.count >= 3) cautions.push({ id: 'l-choice', text: '인연이 겹치기 쉬워 관계를 분명히 하는 것이 좋습니다.' })
  if (cautions.length === 0) cautions.push({ id: 'l-default', text: '관계의 결과는 두 사람의 선택과 노력에 달려 있습니다. 사주는 성향을 보는 참고로만 보세요.' })

  // 시기: 배우자를 뜻하는 기운이 들어오거나, 배우자 자리와 어울림·부딪힘이 생기는 운
  const timing = mergeTiming(
    'l',
    luckSlots(f).map((slot): TimingPart => {
      if (slot.luck.stemGroup === s.group || slot.luck.branchGroup === s.group) {
        return { slot, tag: 'spouse', body: '배우자를 뜻하는 기운이 들어와 인연·관계의 변화가 두드러질 수 있는 시기로 봅니다.' }
      }
      if (slot.luck.dayBranch.combine > 0) {
        return { slot, tag: 'combine', body: '배우자 자리와 어울리는 글자가 들어와 관계가 가까워지기 쉬운 흐름입니다.' }
      }
      if (slot.luck.dayBranch.clash > 0) {
        return { slot, tag: 'clash', body: '배우자 자리와 부딪히는 글자가 들어와 관계나 생활에 변화가 생기기 쉬운 흐름입니다.' }
      }
      return { slot, tag: 'general', body: `연애·결혼보다 ${과와(`'${GROUP_THEME[slot.luck.stemGroup]}'`)} 관련된 일이 더 두드러지기 쉽습니다.` }
    }),
  )

  return {
    id: 'love',
    title: CATEGORY_TITLE.love,
    summary,
    strengths: strengths.slice(0, 3),
    cautions: cautions.slice(0, 2),
    timing,
    basis: [
      { plain: `배우자를 뜻하는 기운(${GROUP_PLAIN[s.group]}) ${s.count}개 (속에 숨은 글자 ${s.hidden}개)`, term: s.group },
      { plain: `배우자 자리(태어난 날 아래 글자): ${GROUP_PLAIN[f.dayBranchGroup]}`, term: `일지 ${f.dayBranchTenGod}` },
      { plain: `배우자 자리의 관계: 어울림 ${f.dayBranchNatal.combine} · 부딪힘 ${f.dayBranchNatal.clash} · 긴장 ${f.dayBranchNatal.tension}`, term: '합·충·형파해' },
    ],
    ziwei: ziweiPalaceLine(f, '부처궁'),
    note: '배우자를 뜻하는 기운은 전통적으로 남성은 재물의 기운, 여성은 다스리는 기운으로 봅니다. 시기는 단정하지 않습니다.',
  }
}

function relations(f: ReadingFeatures): CategoryReading {
  const B = f.groups.비겁
  const summary =
    B >= 2
      ? '사람을 좋아하고 주변에 함께하는 사람이 많은 편입니다.'
      : B === 0
        ? '혼자서 해내는 데 익숙하고, 관계에서 자기 영역을 지키는 편입니다.'
        : '사람 관계에서 적당한 거리를 지키며 필요한 관계를 이어 가는 편입니다.'

  const strengths: Line[] = []
  if (f.shinsal.has('천을귀인')) strengths.push({ id: 'r-helper', text: '어려울 때 도와주는 사람을 만나기 쉬운 편으로 봅니다.' })
  if (has(f.groups.인성)) strengths.push({ id: 'r-elder', text: '부모나 윗사람에게서 배우고 도움을 받는 인연이 있는 편입니다.' })
  if (has(f.groups.식상)) strengths.push({ id: 'r-care', text: '후배나 아랫사람을 챙기고 이끄는 데 능한 편입니다.' })
  if (B === 1 || B === 2) strengths.push({ id: 'r-peer', text: '동료와 협력하며 함께 성장하는 관계를 맺기 쉽습니다.' })

  const cautions: Line[] = []
  if (B >= 3) cautions.push({ id: 'r-compete', text: '가까운 사이에서 경쟁심이 생기기 쉬우니 역할을 나눠 두면 좋습니다.' })
  if (B === 0) cautions.push({ id: 'r-alone', text: '도움을 청하는 데 서툴 수 있어, 믿을 만한 협력자를 의식적으로 만들어 두면 좋습니다.' })
  if (f.groups.인성 === 0) cautions.push({ id: 'r-self', text: '스스로 길을 찾는 편이라 가끔 조언을 구하는 습관이 도움이 됩니다.' })
  if (cautions.length === 0) cautions.push({ id: 'r-default', text: '관계는 서로의 노력으로 달라집니다. 사주는 경향을 보는 참고로만 보세요.' })

  return {
    id: 'relations',
    title: CATEGORY_TITLE.relations,
    summary,
    strengths: strengths.slice(0, 3),
    cautions: cautions.slice(0, 2),
    timing: timingLines(f, 'r', {
      비겁: '사람과의 만남이 늘거나 경쟁이 생기기 쉬운 흐름입니다.',
      인성: '윗사람이나 가족에게 도움을 받기 쉬운 흐름입니다.',
      식상: '후배·자녀처럼 내가 돌볼 사람과의 일이 늘 수 있습니다.',
    }),
    basis: [
      { plain: `나와 같은 기운(동료·형제) ${B}개`, term: '비겁' },
      { plain: `돕는 기운(부모·윗사람) ${f.groups.인성}개`, term: '인성' },
      { plain: `도와주는 사람 운 ${f.shinsal.has('천을귀인') ? '있음' : '없음'}`, term: '천을귀인' },
    ],
    ziwei: ziweiPalaceLine(f, '노복궁'),
    note: '가족·대인관계는 서로의 노력과 상황에 따라 달라집니다.',
  }
}

function study(f: ReadingFeatures): CategoryReading {
  const I = f.groups.인성
  const summary =
    I > 0
      ? '배우는 힘을 뜻하는 기운이 있어 꾸준히 익히는 공부에 강한 편입니다.'
      : '배우는 힘을 뜻하는 기운이 겉으로 드러나지 않아, 직접 해 보며 익히는 방식이 잘 맞는 편입니다.'

  const strengths: Line[] = []
  if (has(tg(f, '정인'))) strengths.push({ id: 's-steady', text: '이론을 차근차근 쌓는 공부와 자격 취득에 강한 편입니다.' })
  if (has(tg(f, '편인'))) strengths.push({ id: 's-intuition', text: '직관이 좋아 남다른 주제를 깊이 파고드는 공부에 강합니다.' })
  if (has(f.groups.관성) && I > 0) strengths.push({ id: 's-exam', text: '시험·자격처럼 평가를 거쳐 인정받는 길에 강한 구조로 봅니다.' })
  if (has(f.groups.식상)) strengths.push({ id: 's-apply', text: '배운 것을 말하고 써 보며 익히는 방식(발표·실습)이 잘 맞습니다.' })
  if (f.shinsal.has('화개')) strengths.push({ id: 's-deep', text: '한 주제에 깊이 몰두하는 힘이 있습니다.' })

  const cautions: Line[] = []
  if (I >= 3) cautions.push({ id: 's-overthink', text: '생각과 준비가 길어져 실제로 해 보는 시간이 줄 수 있습니다.' })
  if (f.groups.식상 >= 3) cautions.push({ id: 's-scatter', text: '관심사가 많아 한 과목에 오래 집중하기 어려울 수 있습니다.' })
  if (f.groups.재성 >= 3 && I > 0) cautions.push({ id: 's-distract', text: '현실적인 일에 마음이 쏠려 공부 시간을 지키기 어려울 수 있습니다.' })
  if (I === 0) cautions.push({ id: 's-routine', text: '혼자 오래 붙잡는 공부보다 정해진 일정과 함께하는 사람이 있을 때 효과가 좋은 편입니다.' })
  if (cautions.length === 0) cautions.push({ id: 's-default', text: '공부 방법은 사람마다 다르니 결과를 보며 조정하세요.' })

  let ziwei: string | null = null
  if (f.ziwei) {
    const places = ['명궁', '관록궁'].filter((p) => f.ziwei!.palaces[p]?.others.some((s) => s === 'wenchang' || s === 'wenqu'))
    ziwei = places.length
      ? `자미두수로 보면 글과 시험을 뜻하는 별(문창·문곡)이 '${places.map((p) => PALACE_PLAIN[p]).join("'·'")}' 칸에 있어 공부 운을 돕는다고 봅니다.`
      : '자미두수로 보면 글과 시험을 뜻하는 별(문창·문곡)은 나 자신·일과 직업 칸 밖에 있습니다.'
  }

  return {
    id: 'study',
    title: CATEGORY_TITLE.study,
    summary,
    strengths: strengths.slice(0, 3),
    cautions: cautions.slice(0, 2),
    timing: timingLines(f, 's', {
      인성: '공부·자격 준비에 마음을 두기 좋은 흐름입니다.',
      관성: '시험·평가처럼 결과를 확인받는 일이 생기기 쉬운 흐름입니다.',
      식상: '배운 것을 밖으로 보여 줄 기회가 생기기 쉬운 흐름입니다.',
    }),
    basis: [
      { plain: `돕는 기운(배움) ${I}개: 배움·보호 ${tg(f, '정인')} · 직관·특기 ${tg(f, '편인')}`, term: '인성(정인·편인)' },
      { plain: `다스리는 기운(시험·평가) ${f.groups.관성}개 · 표현하는 기운 ${f.groups.식상}개`, term: '관성·식상' },
    ],
    ziwei,
    note: '학업 결과는 노력과 방법에 크게 좌우됩니다. 사주는 공부 성향을 보는 참고로만 보세요.',
  }
}

function health(f: ReadingFeatures): CategoryReading {
  const strengths: Line[] = []
  if (f.lacking.length === 0 && f.heavy.length === 0) {
    strengths.push({ id: 'h-balance', text: '다섯 기운이 고르게 있는 편이라 한쪽으로 크게 치우친 부분은 적다고 봅니다.' })
  }
  if (f.strength === '신강') strengths.push({ id: 'h-energy', text: '기운이 강한 편이라 몸을 움직여 에너지를 쓸 때 컨디션이 좋은 편입니다.' })
  if (f.strength === '중화') strengths.push({ id: 'h-steady', text: '기운의 균형이 맞는 편이라 생활 리듬을 지키면 컨디션을 유지하기 쉽습니다.' })
  if (f.strength === '신약') strengths.push({ id: 'h-sensitive', text: '몸의 신호에 민감한 편이라 무리하기 전에 알아차리고 쉬어 가기 쉽습니다.' })

  const cautions: Line[] = []
  for (const e of f.lacking.slice(0, 2)) {
    cautions.push({ id: `h-lack-${e}`, text: `${ELEMENT_PLAIN[e]} 기운이 없어 전통적으로 ${과와(ELEMENT_BODY[e])} 연결해 봅니다. ${ELEMENT_HABIT[e]}에 신경 쓰면 좋습니다.` })
  }
  for (const e of f.heavy.slice(0, 1)) {
    cautions.push({ id: `h-heavy-${e}`, text: `${ELEMENT_PLAIN[e]} 기운이 많아 ${ELEMENT_BODY[e]} 쪽에 무리가 가지 않게 ${을를(ELEMENT_HABIT[e])} 챙기면 좋습니다.` })
  }
  if (f.strength === '신약') cautions.push({ id: 'h-rest', text: '기운이 약한 편이라 무리한 일정보다 쉬는 리듬을 지키는 것이 좋습니다.' })
  if (cautions.length === 0) cautions.push({ id: 'h-default', text: '특별히 치우친 기운은 적지만, 규칙적인 생활이 가장 좋은 관리입니다.' })

  return {
    id: 'health',
    title: CATEGORY_TITLE.health,
    summary: '전통적으로 다섯 기운을 몸의 부위와 연결해 봅니다. 아래는 생활 습관 참고이며 진단이 아닙니다.',
    strengths: strengths.slice(0, 2),
    cautions: cautions.slice(0, 2),
    timing: [{ id: 'h-timing', text: '해마다의 흐름보다 평소의 잠·식사·운동 습관이 훨씬 중요합니다.' }],
    basis: [
      { plain: `없는 기운: ${f.lacking.length ? f.lacking.map((e) => ELEMENT_PLAIN[e]).join('·') : '없음'}`, term: '오행 부족' },
      { plain: `많은 기운: ${f.heavy.length ? f.heavy.map((e) => ELEMENT_PLAIN[e]).join('·') : '없음'}`, term: '오행 과다' },
      { plain: `내 기운의 세기: ${STRENGTH_PLAIN[f.strength]}`, term: f.strength },
    ],
    ziwei: null,
    note: '건강 해석은 생활 습관 참고일 뿐 진단이 아닙니다. 몸에 이상이 느껴지면 의료진과 상담하세요.',
  }
}

function flow(f: ReadingFeatures): CategoryReading {
  const summary = f.daeun
    ? `지금은 ${Math.floor(f.daeun.startAge)}세부터 이어지는 10년 흐름(${ganjiName(f.daeun.ganji)}) 안에 있습니다.`
    : '아직 첫 10년 흐름이 시작되기 전입니다.'

  const timing: Line[] = []
  if (f.daeun) {
    timing.push({
      id: `f-daeun-${f.daeun.stemGroup}-${f.daeun.branchGroup}`,
      text:
        f.daeun.stemGroup === f.daeun.branchGroup
          ? `지금의 10년 흐름은 ${이가(`'${GROUP_THEME[f.daeun.stemGroup]}'`)} 겉과 바탕 모두에서 중심 주제가 되기 쉽습니다.`
          : `지금의 10년 흐름은 ${이가(`'${GROUP_THEME[f.daeun.stemGroup]}'`)} 겉으로 드러나는 주제이고, ${이가(`'${GROUP_THEME[f.daeun.branchGroup]}'`)} 바탕에 깔린 흐름으로 봅니다.`,
    })
  }
  timing.push({ id: `f-this-${f.thisYear.stemGroup}`, text: `${f.thisYear.year}년(${ganjiName(f.thisYear.ganji)})에는 ${과와(`'${GROUP_THEME[f.thisYear.stemGroup]}'`)} 관련된 일이 두드러지기 쉽습니다.` })
  timing.push(
    f.nextYear.stemGroup === f.thisYear.stemGroup
      ? { id: `f-next-${f.nextYear.stemGroup}-same`, text: `${f.nextYear.year}년(${ganjiName(f.nextYear.ganji)})에도 ${이가(`'${GROUP_THEME[f.nextYear.stemGroup]}'`)} 주제인 흐름이 이어지기 쉽습니다.` }
      : { id: `f-next-${f.nextYear.stemGroup}`, text: `${f.nextYear.year}년(${ganjiName(f.nextYear.ganji)})에는 ${과와(`'${GROUP_THEME[f.nextYear.stemGroup]}'`)} 관련된 일로 관심이 옮겨 가기 쉽습니다.` },
  )

  // 어느 기준으로 도움이 되는지 함께 밝힌다 (균형 기준·계절 기준은 서로 다를 수 있다)
  const helpfulBasis = (e: Element) =>
    [f.helpful.eokbu === e ? '균형 기준' : null, f.helpful.johu === e ? '계절 기준' : null].filter(Boolean).join('과 ')
  // 올해 들어오는 기운의 종류마다 기회가 되는 면이 있다 (단정하지 않는 표현)
  const CHANCE: Record<Group, string> = {
    비겁: '함께할 사람을 얻거나 스스로 서는 힘을 키우기 좋은 해로 봅니다.',
    식상: '재능을 펼치고 새로운 일을 시도해 보기 좋은 해로 봅니다.',
    재성: '노력이 눈에 보이는 성과로 이어지기 쉬운 해로 봅니다.',
    관성: '책임을 맡으며 자리를 다지기 좋은 해로 봅니다.',
    인성: '배우고 준비하며 내실을 다지기 좋은 해로 봅니다.',
  }
  const strengths: Line[] = [{ id: `f-chance-${f.thisYear.stemGroup}`, text: `${f.thisYear.year}년은 ${CHANCE[f.thisYear.stemGroup]}` }]
  const thisEl = STEMS[f.thisYear.ganji.stem].element
  if (helpfulBasis(thisEl)) {
    strengths.push({
      id: 'f-helpful',
      text: `${f.thisYear.year}년에 들어오는 ${ELEMENT_PLAIN[thisEl]} 기운이 ${helpfulBasis(thisEl)}으로 나에게 도움이 되는 기운과 겹쳐, 비교적 순조롭게 느껴질 수 있습니다.`,
    })
  }
  if (f.thisYear.dayBranch.combine > 0) strengths.push({ id: 'f-combine', text: `${f.thisYear.year}년에는 나와 가장 가까운 자리와 어울리는 글자가 들어와 협력과 화합이 쉬운 흐름입니다.` })

  const cautions: Line[] = []
  if (f.thisYear.dayBranch.clash > 0) cautions.push({ id: 'f-change', text: `${f.thisYear.year}년에는 나와 가장 가까운 자리와 부딪히는 글자가 들어와 생활·관계에 변화가 생기기 쉽습니다. 큰 결정은 여유를 두고 하세요.` })
  if (f.daeun && f.daeun.dayBranch.clash > 0) cautions.push({ id: 'f-daeun-change', text: '지금의 10년 흐름은 나와 가장 가까운 자리와 부딪혀, 이 기간에 환경 변화가 잦을 수 있습니다.' })
  if (cautions.length === 0) cautions.push({ id: 'f-default', text: '운의 흐름은 경향일 뿐이며, 실제 결과는 선택과 준비에 달려 있습니다.' })

  let ziwei: string | null = null
  if (f.ziwei?.currentDecadePalace) {
    ziwei = `자미두수로 보면 지금 10년 운은 '${PALACE_PLAIN[f.ziwei.currentDecadePalace]}' 칸에 있어, 그 영역이 이 시기의 중심 주제가 되기 쉽다고 봅니다.`
  }

  return {
    id: 'flow',
    title: CATEGORY_TITLE.flow,
    summary,
    strengths: strengths.slice(0, 2),
    cautions: cautions.slice(0, 2),
    timing,
    basis: [
      ...(f.daeun
        ? [{ plain: `지금의 10년 흐름: ${ganjiName(f.daeun.ganji)} (${GROUP_PLAIN[f.daeun.stemGroup]} / ${GROUP_PLAIN[f.daeun.branchGroup]})`, term: '대운' }]
        : []),
      { plain: `${f.thisYear.year}년: ${ganjiName(f.thisYear.ganji)} (${GROUP_PLAIN[f.thisYear.stemGroup]} / ${GROUP_PLAIN[f.thisYear.branchGroup]})`, term: '세운' },
    ],
    ziwei,
    note: '운의 흐름은 "어떤 주제가 두드러지기 쉬운가"를 보는 참고입니다. 시기를 단정하지 않습니다.',
  }
}

export function buildCategoryReadings(f: ReadingFeatures): CategoryReading[] {
  return [personality(f), wealth(f), career(f), love(f), relations(f), study(f), health(f), flow(f)]
}
