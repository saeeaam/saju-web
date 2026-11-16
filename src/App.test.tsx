// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { ZIWEI } from './data/index.ts'

afterEach(() => cleanup())

const NOW = new Date('2026-11-10T03:00:00Z')

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  v: { year: string; month: string; day: string; hour?: string; minute?: string },
) {
  await user.type(screen.getByLabelText('연도'), v.year)
  await user.type(screen.getByLabelText('월'), v.month)
  await user.type(screen.getByLabelText('일'), v.day)
  if (v.hour !== undefined) await user.type(screen.getByLabelText('시'), v.hour)
  if (v.minute !== undefined) await user.type(screen.getByLabelText('분'), v.minute)
}

const submit = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: '명식 보기' }))

/** 손풀이 기준 사주: 1992-10-24 05:30 남 = 임신 경술 계유 을묘 */
async function show1992() {
  const user = userEvent.setup()
  render(<App now={NOW} />)
  await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
  await submit(user)
  await screen.findByText(/임신년 경술월/)
  return user
}

/** 전문 용어 함께 보기 켜기 (기본은 꺼짐) */
const showTerms = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByLabelText('전문 용어 함께 보기'))

const rowHeaders = (table: HTMLElement) =>
  within(table).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('rowheader')[0].textContent ?? '')

describe('명식 화면', () => {
  it('2000-01-01 12:00 → 기묘년 병자월 무오일 무오시, 열은 태어난 시·날·달·해 순', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '12', minute: '0' })
    await submit(user)
    expect(await screen.findByText(/기묘년 병자월 무오일 무오시/)).toBeTruthy()
    expect(screen.getByText(/입력 시각 2000-01-01 12:00 \(보정 없음\)/)).toBeTruthy()
    const table = screen.getByRole('table', { name: /사주 명식표/ })
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['태어난 시', '태어난 날', '태어난 달', '태어난 해'])
  })

  it('잘못된 날짜(2월 30일)는 오류 문장을 보여주고 결과를 만들지 않는다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '2', day: '30', hour: '12' })
    await submit(user)
    expect((await screen.findByRole('alert')).textContent).toMatch(/존재하지 않는 양력 날짜/)
    expect(screen.queryByRole('table', { name: /사주 명식표/ })).toBeNull()
  })

  it('숫자가 비어 있으면 안내 문장', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await submit(user)
    expect((await screen.findByRole('alert')).textContent).toMatch(/생년월일을 숫자로/)
  })

  it('시간 모름: 시 열은 비고 요약은 3주', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24' })
    await user.click(screen.getByLabelText(/시간 모름/))
    await submit(user)
    expect(await screen.findByText(/임신년 경술월 계유일$/)).toBeTruthy()
    expect(screen.getByText('시간 모름', { selector: '.help' })).toBeTruthy()
    expect(screen.getByText(/\(시간 모름\)/)).toBeTruthy()
  })

  it('음력을 고르면 윤달 체크박스가 나타난다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    expect(screen.queryByLabelText('윤달')).toBeNull()
    await user.click(screen.getByLabelText('음력'))
    expect(screen.getByLabelText('윤달')).toBeTruthy()
  })

  it('음력 1992-09-29 → 양력 1992-10-24와 같은 명식', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await user.click(screen.getByLabelText('음력'))
    await fill(user, { year: '1992', month: '9', day: '29', hour: '5', minute: '30' })
    await submit(user)
    expect(await screen.findByText(/임신년 경술월 계유일 을묘시/)).toBeTruthy()
  })
})

describe('계산 기준(옵션)', () => {
  it('밤 11시 출생 처리를 바꾸면 결과가 바로 갱신된다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '23', minute: '30' })
    await submit(user)
    expect(await screen.findByText(/무오일 임자시/)).toBeTruthy()
    await user.click(screen.getByText(/^계산 기준/))
    await user.selectOptions(screen.getByLabelText('밤 11시~새벽 1시 출생 처리'), 'zi-hour-start')
    expect(await screen.findByText(/기미일 갑자시/)).toBeTruthy()
  })

  it('경도 보정을 고르면 출생지 입력이 나타나고, 서울 기준 −32분 보정이 표시된다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    expect(screen.queryByLabelText('출생지')).toBeNull()
    await user.click(screen.getByText(/^계산 기준/))
    await user.selectOptions(screen.getByLabelText('태어난 곳의 실제 해 시각 반영'), 'longitude')
    expect(screen.getByLabelText('출생지')).toBeTruthy()
    await fill(user, { year: '1990', month: '5', day: '15', hour: '7', minute: '5' })
    await submit(user)
    expect(await screen.findByText(/날·시 글자 계산 시각 1990-05-15 06:33 \(보정 −32분\)/)).toBeTruthy()
  })

  it('기본값으로 되돌리기 버튼은 기본값일 때 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await user.click(screen.getByText(/^계산 기준/))
    const reset = screen.getByRole('button', { name: '기본값으로 되돌리기' }) as HTMLButtonElement
    expect(reset.disabled).toBe(true)
    await user.selectOptions(screen.getByLabelText('해가 바뀌는 기준'), 'lunar-new-year')
    expect(reset.disabled).toBe(false)
    await user.click(reset)
    expect(reset.disabled).toBe(true)
  })
})

describe('경고와 안내', () => {
  it('1908년 이전 출생은 표준 시각이 없던 시절이라는 안내를 보여준다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1900', month: '6', day: '1', hour: '12' })
    await submit(user)
    expect(await screen.findByText(/지금 같은 표준 시각이 없었습니다/)).toBeTruthy()
  })

  it('면책 문구와 개인정보 안내가 항상 보인다', () => {
    render(<App now={NOW} />)
    expect(screen.getByText(/과학적으로 검증된 예측 방법이 아닙니다/)).toBeTruthy()
    expect(screen.getByText(/서버로 전송하거나 저장하지 않습니다/)).toBeTruthy()
  })

  it('계산 중 네트워크 요청이나 저장소 쓰기를 하지 않는다', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await show1992()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    vi.unstubAllGlobals()
  })
})

describe('쉬운 말과 전문 용어', () => {
  // 쉬운 말만 보기에서 남아 있으면 안 되는 전문 용어
  const JARGON = [
    '비견', '겁재', '식신', '상관', '편재', '정재', '칠살', '편관', '정관', '편인', '정인',
    '장생', '목욕', '관대', '건록', '제왕', '공망', '지장간', '천간', '지지', '신강', '신약',
    '득령', '득지', '득세', '용신', '억부', '조후', '대운', '세운', '명궁', '재백궁', '관록궁',
    '부처궁', '화록', '화권', '화과', '화기', '오행국', '대한', '신살', '천을귀인', '역마',
    '화개', '도화', '순행', '역행', '십성', '12운성', '납음', '일간', '일지', '월지', '연지', '명반',
  ]

  it('전문 용어 함께 보기는 기본 꺼짐(일반인 기준), 켜면 쉬운 말 옆에 원래 용어가 작게 붙는다', async () => {
    const user = await show1992()
    expect((screen.getByLabelText('전문 용어 함께 보기') as HTMLInputElement).checked).toBe(false)
    expect(document.querySelectorAll('.term-orig')).toHaveLength(0)
    await showTerms(user)
    expect(document.querySelectorAll('.term-orig').length).toBeGreaterThan(30)
    // 연간 임(겁재) → 쉬운 말 "경쟁" + 원래 용어 "겁재"
    const table = screen.getByRole('table', { name: /사주 명식표/ })
    expect(within(table).getAllByText('겁재').length).toBeGreaterThan(0)
    expect(within(table).getAllByRole('button', { name: /^경쟁/ }).length).toBeGreaterThan(0)
  })

  it('기본(쉬운 말만) 상태에서 결과 화면 전체에 전문 용어가 남지 않는다', async () => {
    const user = await show1992()
    expect(document.querySelectorAll('.term-orig')).toHaveLength(0)

    const areas: HTMLElement[] = [
      screen.getByRole('table', { name: /사주 명식표/ }),
      screen.getByRole('region', { name: /^내 기운의 세기/ }),
      screen.getByRole('region', { name: /^글자 사이의 어울림과 부딪힘/ }),
      screen.getByRole('region', { name: /^나에게 도움이 되는 기운/ }),
      screen.getByRole('region', { name: /^옛 이름표/ }),
      screen.getByRole('region', { name: /^10년 흐름과 해마다의 흐름/ }),
      screen.getByRole('region', { name: /^자미두수/ }),
      screen.getByRole('region', { name: '사주 풀이' }),
      screen.getByRole('region', { name: '한눈에 보기' }),
      screen.getByRole('region', { name: /^올해 월별 흐름/ }),
    ]
    // 펼침 패널(계산 근거)도 열어서 검사한다
    await user.click(screen.getByText('계산 근거 (자리별 비중)'))
    const leftovers: string[] = []
    // 자미두수 별 이름(예: 칠살 七殺)은 고유명사라 바꾸지 않는다 — 십성 용어와 글자가 같아도 예외
    const starNames = ZIWEI.stars.map((st) => st.ko)
    for (const area of areas) {
      let text = area.textContent ?? ''
      if (['ziwei-title', 'reading-title'].includes(area.getAttribute('aria-labelledby') ?? '')) {
        for (const name of starNames) text = text.split(name).join('')
      }
      for (const word of JARGON) if (text.includes(word)) leftovers.push(`${area.getAttribute('aria-labelledby') ?? 'table'}: ${word}`)
    }
    expect(leftovers).toEqual([])
  })

  it('용어를 누르면 설명 창이 열리고, 닫기로 닫힌다', async () => {
    const user = await show1992()
    // 월간 경(정인) → "배움·보호"
    const table = screen.getByRole('table', { name: /사주 명식표/ })
    await user.click(within(table).getAllByRole('button', { name: /^배움·보호/ })[0])
    const dialog = document.querySelector('dialog.term-dialog') as HTMLDialogElement
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(within(dialog).getByRole('heading').textContent).toContain('배움·보호')
    expect(dialog.textContent).toContain('학문')
    await user.click(within(dialog).getByRole('button', { name: '닫기' }))
    expect(dialog.hasAttribute('open')).toBe(false)
  })
})

describe('오행 차트와 10년 흐름', () => {
  it('오행 차트를 표로 전환하면 위 글자·아래 글자·숨은 글자 열이 보인다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '12', minute: '0' })
    await submit(user)
    await screen.findByText(/기묘년 병자월/)
    await user.click(screen.getByRole('button', { name: '표' }))
    const t = screen.getByRole('table', { name: '오행별 개수' })
    expect(within(t).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['기운', '위 글자', '아래 글자', '합계', '숨은 글자', '숨은 글자 포함'])
    // 기묘 병자 무오 무오: 흙(토) 위 글자 3(기·무·무)
    const earthRow = within(t).getByRole('row', { name: /흙 土/ })
    expect(within(earthRow).getAllByRole('cell')[0].textContent).toBe('3')
  })

  it('오행 막대는 쉬운 이름과 개수를 접근 가능한 이름으로 가진다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '12', minute: '0' })
    await submit(user)
    const row = await screen.findByRole('listitem', { name: /^흙\(토·土\) 3개/ })
    expect(row.getAttribute('tabindex')).toBe('0')
  })

  it('현재 나이에 해당하는 10년 흐름 카드에 "지금" 표시와 제목이 붙는다', async () => {
    await show1992()
    // 1992-10-24 05:30 남자(임=양년) → 순행, 대운수 약 4.7세 → 2026-11 기준 24.7세 시작 대운(계축)이 현재
    const list = screen.getByRole('list', { name: '10년 흐름 목록' })
    const current = within(list).getByText('지금').closest('button')!
    expect(current.textContent).toBe('24~33세내 힘으로 서려는 10년바탕: 직장과 책임지금')
  })

  it('10년 흐름 카드를 누르면 해마다의 흐름 10개가 바뀐다', async () => {
    const user = await show1992()
    const list = screen.getByRole('list', { name: '10년 흐름 목록' })
    const cards = within(list).getAllByRole('button')
    expect(cards).toHaveLength(10)
    await user.click(cards[0])
    expect(cards[0].getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelectorAll('ul.seun li')).toHaveLength(10)
  })
})

describe('명리 분석 화면', () => {
  it('내 기운의 세기: 손풀이 48% 균형, 태어난 달 × 바로 아래 ○ 주변 ○', async () => {
    await show1992()
    const meter = screen.getByRole('meter', { name: '나를 돕는 기운의 비율' })
    expect(meter.getAttribute('aria-valuenow')).toBe('48')
    expect(meter.getAttribute('aria-valuetext')).toBe('48퍼센트, 중화')
    const badges = [...document.querySelectorAll('.badge')].map((b) => b.textContent)
    expect(badges).toEqual(['태어난 달의 도움 × 없음', '바로 아래 글자의 도움 ○ 있음', '주변 글자의 도움 ○ 있음'])
  })

  it('글자 사이 관계 표: 손풀이 5개를 쉬운 이름으로 (원래 이름 병기)', async () => {
    const user = await show1992()
    await showTerms(user)
    const section = screen.getByRole('region', { name: /^글자 사이의 어울림과 부딪힘/ })
    const table = within(section).getByRole('table', { name: '글자 사이 관계 목록' })
    const names = rowHeaders(table)
    expect(names).toHaveLength(5)
    const expected: [string, string][] = [
      ['을·경 위 글자끼리 어울림', '을경합'],
      ['유·술 어긋남', '유술해'],
      ['묘·술 두 글자 어울림', '묘술합'],
      ['묘·유 부딪힘', '묘유충'],
      ['유·술·신 같은 계절 모임', '신유술 방합'],
    ]
    for (const [plain, orig] of expected) {
      expect(names.some((n) => n.startsWith(plain) && n.includes(orig)), `${plain} / ${orig}`).toBe(true)
    }
    const clash = within(table).getAllByRole('row').find((r) => r.textContent?.startsWith('묘·유 부딪힘'))!
    expect(clash.textContent).toContain('이웃')
    expect(clash.textContent).toContain('시의 아래 글자 · 날의 아래 글자')
  })

  it('도움이 되는 기운: 균형이라 균형 기준 후보 없음, 술월이라 계절 기준도 없음, 한계 안내', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: /^나에게 도움이 되는 기운/ })
    expect(within(section).getByText(/특별히 채울 기운이 뚜렷하지 않습니다/)).toBeTruthy()
    expect(within(section).getByText(/봄·가을처럼 춥거나 덥지 않은 계절/)).toBeTruthy()
    expect(within(section).getByText(/겨울·여름만 따진 간단한 판정/)).toBeTruthy()
  })

  it('옛 이름표: 천을귀인(도와주는 사람 운)과 도화(매력)를 참고로 보여준다', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: /^옛 이름표/ })
    expect(within(section).getByRole('button', { name: /^도와주는 사람 운/ })).toBeTruthy()
    expect(within(section).getByRole('button', { name: /^사람을 끄는 매력/ })).toBeTruthy()
    expect(within(section).getByText(/참고로만 보여드립니다/)).toBeTruthy()
  })

  it('사주 풀이: 8개 주제가 순서대로, 첫 주제만 펼쳐져 있다', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: '사주 풀이' })
    const cats = [...section.querySelectorAll('details.cat')] as HTMLDetailsElement[]
    expect(cats.map((c) => c.querySelector('.cat-title')!.textContent)).toEqual([
      '성격·기질', '재물', '직업·적성', '연애·결혼', '대인관계·가족', '학업·시험', '건강 (생활 참고)', '올해와 10년 흐름',
    ])
    expect(cats.map((c) => c.open)).toEqual([true, false, false, false, false, false, false, false])
  })

  it('사주 풀이: 재물 주제를 펼치면 손풀이 결과(겉에 없음·숨은 글자에 있음, 2026년 재물 흐름)가 보인다', async () => {
    const user = await show1992()
    const wealth = document.querySelector('details.cat[data-category="wealth"]') as HTMLDetailsElement
    await user.click(within(wealth).getByText('재물'))
    expect(wealth.open).toBe(true)
    expect(wealth.textContent).toContain('겉으로는 드러나지 않습니다')
    expect(wealth.querySelector('[data-line="w-skill"]')).toBeTruthy()
    // 2026·2027년이 모두 재물 흐름이라 한 줄로 합쳐진다
    expect(wealth.querySelector('[data-line="w-t-this+next-재성"]')!.textContent).toContain('2026년(병오), 2027년(정미)에는')
    expect(wealth.textContent).toContain('투자·대출 같은 판단의 근거로 쓰지 마세요')
  })

  it('사주 풀이: 근거는 쉬운 말 + 원래 용어(켜져 있을 때)', async () => {
    const user = await show1992()
    await showTerms(user)
    const love = document.querySelector('details.cat[data-category="love"]')!
    const basis = love.querySelector('.cat-block.basis')!.textContent!
    expect(basis).toContain('배우자를 뜻하는 기운(재물의 기운) 0개')
    expect(basis).toContain('재성')
  })

  it('옛 "해석 요약"은 사주 풀이로 대체되어 없다', async () => {
    await show1992()
    expect(screen.queryByRole('region', { name: '해석 요약' })).toBeNull()
  })

  it('계산 근거 표: 자리별 비중 합계 100, 돕는 합계 48', async () => {
    const user = await show1992()
    await user.click(screen.getByText('계산 근거 (자리별 비중)'))
    const table = screen.getByRole('table', { name: '자리별 비중과 나를 돕는지 여부' })
    const foot = within(table).getAllByRole('row').at(-1)!
    expect(foot.textContent).toContain('합계')
    expect(foot.textContent).toContain('100')
    expect(foot.textContent).toContain('48')
  })
})

describe('10년 흐름·해마다의 흐름 풀이', () => {
  it('지금의 10년(24~33세)과 올해(2026년)의 풀이가 기본으로 보인다', async () => {
    await show1992()
    const decade = screen.getByRole('article', { name: '24~33세 (지금) · 내 힘으로 서려는 10년' })
    expect(decade.textContent).toContain('동료·친구·형제와 함께하거나 경쟁하는 일이 중심이 되기 쉬운 10년입니다')
    // 계축 대운의 축이 일지 유와 반합 → 가까운 자리와 어울림
    expect(decade.textContent).toContain('가까운 사람과의 관계가 안정되기 쉽습니다')
    expect(decade.textContent).toContain('이렇게 보내면 좋아요')
    const year = screen.getByRole('article', { name: '2026년 (올해) · 돈과 성과의 해' })
    // 병오의 오가 월지 술과 반합 → 일·사회 자리와 어울림, 남성에게 재물 = 배우자 기운
    expect(year.textContent).toContain('일·사회 자리와 어울리는 글자가 들어와')
    expect(year.textContent).toContain('연애·결혼과 관련된 일이 생기기 쉬운 해')
  })

  it('근거 자세히에는 들어오는 글자와 관계가 있고, 용어를 켜면 원래 이름(병임충·묘오파·오술 반합)이 보인다', async () => {
    const user = await show1992()
    await showTerms(user)
    const year = screen.getByRole('article', { name: /^2026년/ })
    const basis = year.querySelector('details.flow-basis')!
    expect(basis.textContent).toContain('들어오는 글자: 병오')
    for (const name of ['병임충', '묘오파', '오술 반합']) expect(basis.textContent).toContain(name)
  })

  it('해마다 카드를 누르면 그 해의 풀이로 바뀐다 (2025년 을사: 을은 계 일간에게 표현하는 기운)', async () => {
    const user = await show1992()
    // 지금의 10년(24~33세)에 해당하는 해는 2017~2026년
    await user.click(screen.getByRole('button', { name: /^2025년 흐름/ }))
    expect(screen.getByRole('article', { name: '2025년 · 표현과 새로운 시도의 해' })).toBeTruthy()
  })

  it('10년 카드를 바꾸면 풀이와 해마다 범위가 바뀐다 (4~13세 신해 · 배우고 준비하는 10년, 1997년부터)', async () => {
    const user = await show1992()
    const list = screen.getByRole('list', { name: '10년 흐름 목록' })
    await user.click(within(list).getAllByRole('button')[0])
    expect(screen.getByRole('article', { name: '4~13세 · 배우고 준비하는 10년' })).toBeTruthy()
    const years = within(screen.getByRole('list', { name: '해마다의 흐름 목록' })).getAllByRole('button')
    expect(years).toHaveLength(10)
    expect(years[0].textContent).toMatch(/^1997년/)
  })
})

describe('자미두수 화면', () => {
  it('1992-10-24 05:30 남: 나 자신 칸 정미(염정·칠살·문창·문곡), 물 2국, 미·축 자리, 순행', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: /^자미두수/ })
    const list = within(section).getByRole('list', { name: '12개 칸 (나 자신부터)' })
    const palaces = within(list).getAllByRole('listitem', { name: /칸\(/ })
    expect(palaces).toHaveLength(12)
    expect(palaces[0].getAttribute('aria-label')).toMatch(/^나 자신 칸\(명궁\), 정미 자리/)
    const soulText = palaces[0].textContent ?? ''
    for (const star of ['염정', '칠살', '문창', '문곡']) expect(soulText).toContain(star)
    expect(section.textContent).toContain('물 2 (천하수)')
    expect(section.textContent).toMatch(/나 자신 칸\s*미 자리/)
    expect(section.textContent).toMatch(/후반 인생의 자리\s*축 자리/)
    expect(section.textContent).toContain('앞으로 진행')
  })

  it('사화는 글자로 표시된다: 임년 천량 화록, 자미 화권, 좌보 화과, 무곡 화기', async () => {
    const user = await show1992()
    await showTerms(user)
    const section = screen.getByRole('region', { name: /^자미두수/ })
    for (const s of ['화록', '화권', '화과', '화기']) expect(within(section).getAllByText(s)).toHaveLength(1)
    for (const s of ['잘 풀림', '힘을 얻음', '이름이 남', '마음 쓰임']) expect(within(section).getAllByRole('button', { name: new RegExp(`^${s}`) })).toHaveLength(1)
  })

  it('현재 10년 운: 2026년 세는 나이 35세 → 32–41 집·부동산 칸(전택궁, 경술)', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: /^자미두수/ })
    const current = within(section).getAllByRole('listitem', { name: /현재 10년 운/ })
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute('aria-label')).toMatch(/^집·부동산 칸\(전택궁\), 경술 자리/)
    expect(section.textContent).toContain('올해 세는 나이 35세')
  })

  it('시간 모름이면 운명도 대신 안내 문장', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24' })
    await user.click(screen.getByLabelText(/시간 모름/))
    await submit(user)
    const section = await screen.findByRole('region', { name: /^자미두수/ })
    expect(section.textContent).toContain('태어난 시각이 있어야 계산할 수 있습니다')
    expect(within(section).queryByRole('list')).toBeNull()
  })

  it('윤달: 음력 2020 윤4월 20일 묘시 — 기본은 5월로 나 자신 칸 묘, "그대로"면 4월로 인', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await user.click(screen.getByLabelText('음력'))
    await user.click(screen.getByLabelText('윤달'))
    await fill(user, { year: '2020', month: '4', day: '20', hour: '5', minute: '30' })
    await submit(user)
    const section = await screen.findByRole('region', { name: /^자미두수/ })
    expect(section.textContent).toContain('윤4월 20일')
    expect(section.textContent).toContain('운명도에서는 5월로 계산')
    expect(section.textContent).toMatch(/나 자신 칸\s*묘 자리/)
    await user.click(screen.getByText(/^계산 기준/))
    await user.selectOptions(screen.getByLabelText('자미두수: 윤달 처리'), 'as-is')
    expect(section.textContent).toContain('운명도에서는 4월로 계산')
    expect(section.textContent).toMatch(/나 자신 칸\s*인 자리/)
  })
})

describe('한눈에 보기와 월별 흐름', () => {
  it('한눈에 보기: 사주 요약 바로 아래에 성향·강점·올해와 이번 달 세 줄', async () => {
    await show1992()
    const card = screen.getByRole('region', { name: '한눈에 보기' })
    const terms = [...card.querySelectorAll('dt')].map((d) => d.textContent)
    expect(terms).toEqual(['나의 성향', '강점', '올해·이번 달'])
    expect(card.textContent).toContain('계(물) · 기운은 균형')
    expect(card.textContent).toContain('이번 달은 책임과 일정이 늘기 쉬운 달로 봅니다')
    // 위치: 명식표보다 위
    const table = screen.getByRole('table', { name: /사주 명식표/ })
    expect(card.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('월별 흐름: 2026년 12개월, 이번 달(기해월, 11월 7일부터)에 표시', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: '올해 월별 흐름 (2026년)' })
    const items = within(within(section).getByRole('list', { name: '월별 흐름' })).getAllByRole('listitem').filter((li) => li.classList.contains('month'))
    expect(items).toHaveLength(12)
    expect(items[0].textContent).toMatch(/^2월 4일부터/)
    const current = items.filter((li) => li.getAttribute('data-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain('이번 달')
    expect(current[0].textContent).toContain('기해')
    expect(current[0].textContent).toMatch(/^11월 7일부터/)
  })

  it('월별 흐름: 손풀이대로 신묘월은 "변화", 무술월은 "화합"과 "작은 오해 주의"', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: /^올해 월별 흐름/ })
    const byGanji = (g: string) => [...section.querySelectorAll('li.month')].find((li) => li.textContent?.includes(g))!
    expect([...byGanji('신묘').querySelectorAll('.month-tags li')].map((x) => x.textContent)).toEqual(['변화'])
    expect([...byGanji('무술').querySelectorAll('.month-tags li')].map((x) => x.textContent)).toEqual(['화합', '작은 오해 주의'])
  })
})

describe('궁합 보기', () => {
  async function fillPartner(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('상대 연도'), '1994')
    await user.type(screen.getByLabelText('상대 월'), '3')
    await user.type(screen.getByLabelText('상대 일'), '15')
    await user.type(screen.getByLabelText('상대 시'), '12')
    await user.type(screen.getByLabelText('상대 분'), '0')
  }

  it('상대 성별 기본값은 내 성별의 반대', async () => {
    await show1992()
    expect((screen.getByLabelText('상대 여') as HTMLInputElement).checked).toBe(true)
  })

  it('1992 계유일(남) × 1994 경자일(여): 손풀이대로 잘 맞는 점 2개·맞춰 갈 점 2개, 점수 없음', async () => {
    const user = await show1992()
    await fillPartner(user)
    await user.click(screen.getByRole('button', { name: '궁합 보기' }))
    const section = screen.getByRole('region', { name: '궁합 보기' })
    expect(await within(section).findByText(/상대: 갑술년 정묘월 경자일 임오시/)).toBeTruthy()
    expect(section.textContent).toContain('잘 맞는 부분과 맞춰 갈 부분이 함께 있습니다.')
    const lines = [...section.querySelectorAll('[data-line]')].map((l) => l.getAttribute('data-line'))
    expect(lines).toEqual(['cp-they-give', 'cp-fill-me-fire', 'cp-they-tired', 'cp-home-tension'])
    expect(section.textContent).not.toMatch(/\d+\s*점/)
  })

  it('쉬운 말만 보기(기본)에서 궁합 결과에 전문 용어가 없다', async () => {
    const user = await show1992()
    await fillPartner(user)
    await user.click(screen.getByRole('button', { name: '궁합 보기' }))
    const section = screen.getByRole('region', { name: '궁합 보기' })
    await within(section).findByText(/상대:/)
    for (const w of ['일간', '일지', '연지', '신강', '신약', '천간', '지지']) expect(section.textContent, w).not.toContain(w)
  })

  it('상대 날짜가 잘못되면 오류 문장', async () => {
    const user = await show1992()
    await user.type(screen.getByLabelText('상대 연도'), '1994')
    await user.type(screen.getByLabelText('상대 월'), '2')
    await user.type(screen.getByLabelText('상대 일'), '30')
    await user.click(screen.getByLabelText('상대 시간 모름'))
    await user.click(screen.getByRole('button', { name: '궁합 보기' }))
    const section = screen.getByRole('region', { name: '궁합 보기' })
    expect((await within(section).findByRole('alert')).textContent).toMatch(/존재하지 않는 양력 날짜/)
  })

  it('경도 보정을 켜도 상대는 보정 없이 계산하고 안내한다 (출생지 없음 오류가 나지 않음)', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await user.click(screen.getByText(/^계산 기준/))
    await user.selectOptions(screen.getByLabelText('태어난 곳의 실제 해 시각 반영'), 'longitude')
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    await screen.findByText(/임신년 경술월/)
    await fillPartner(user)
    await user.click(screen.getByRole('button', { name: '궁합 보기' }))
    const section = screen.getByRole('region', { name: '궁합 보기' })
    expect(await within(section).findByText(/상대:/)).toBeTruthy()
    expect(section.textContent).toContain('경도 보정 없이 계산합니다')
    expect(within(section).queryByRole('alert')).toBeNull()
  })
})

describe('화면 구성 (일반인 기준)', () => {
  it('기본 화면은 풀이 위주이고, 전문 영역은 "전문가용 자세히 보기"에 접혀 있다', async () => {
    await show1992()
    const expert = document.querySelector('details.expert') as HTMLDetailsElement
    expect(expert.open).toBe(false)
    expect(expert.querySelector('summary')!.textContent).toContain('전문가용 자세히 보기')
    // 전문 영역은 접힌 곳 안에
    for (const id of ['strength-title', 'relation-title', 'yongshin-title', 'shinsal-title', 'ziwei-title', 'element-title']) {
      expect(expert.querySelector(`#${id}`), id).toBeTruthy()
    }
    expect(expert.querySelector('table.pillars')).toBeTruthy()
    // 풀이 영역은 접힌 곳 밖에
    for (const id of ['overview-title', 'reading-title', 'daeun-title', 'monthly-title', 'compat-title']) {
      const el = document.getElementById(id)!
      expect(expert.contains(el), id).toBe(false)
    }
  })
})
