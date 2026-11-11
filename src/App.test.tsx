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
    expect(headers).toEqual(['태어난 시시주', '태어난 날일주', '태어난 달월주', '태어난 해연주'])
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

  it('전문 용어 함께 보기(기본 켜짐)에서는 쉬운 말 옆에 원래 용어가 작게 붙는다', async () => {
    await show1992()
    expect((screen.getByLabelText('전문 용어 함께 보기') as HTMLInputElement).checked).toBe(true)
    expect(document.querySelectorAll('.term-orig').length).toBeGreaterThan(30)
    // 연간 임(겁재) → 쉬운 말 "경쟁" + 원래 용어 "겁재"
    const table = screen.getByRole('table', { name: /사주 명식표/ })
    expect(within(table).getAllByText('겁재').length).toBeGreaterThan(0)
    expect(within(table).getAllByRole('button', { name: /^경쟁/ }).length).toBeGreaterThan(0)
  })

  it('끄면 원래 용어가 사라지고, 결과 화면(해석 요약 제외)에 전문 용어가 남지 않는다', async () => {
    const user = await show1992()
    await user.click(screen.getByLabelText('전문 용어 함께 보기'))
    expect(document.querySelectorAll('.term-orig')).toHaveLength(0)

    const areas: HTMLElement[] = [
      screen.getByRole('table', { name: /사주 명식표/ }),
      screen.getByRole('region', { name: /^내 기운의 세기/ }),
      screen.getByRole('region', { name: /^글자 사이의 어울림과 부딪힘/ }),
      screen.getByRole('region', { name: /^나에게 도움이 되는 기운/ }),
      screen.getByRole('region', { name: /^옛 이름표/ }),
      screen.getByRole('region', { name: /^10년 흐름과 해마다의 흐름/ }),
      screen.getByRole('region', { name: /^자미두수/ }),
    ]
    // 펼침 패널(계산 근거)도 열어서 검사한다
    await user.click(screen.getByText('계산 근거 (자리별 비중)'))
    const leftovers: string[] = []
    // 자미두수 별 이름(예: 칠살 七殺)은 고유명사라 바꾸지 않는다 — 십성 용어와 글자가 같아도 예외
    const starNames = ZIWEI.stars.map((st) => st.ko)
    for (const area of areas) {
      let text = area.textContent ?? ''
      if (area.getAttribute('aria-labelledby') === 'ziwei-title') {
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

  it('현재 나이에 해당하는 10년 흐름에 "현재" 표시가 붙는다', async () => {
    await show1992()
    // 1992-10-24 05:30 남자(임=양년) → 순행, 입동(1992-11-07)까지 약 14일 → 대운수 약 4.7세.
    // 2026-11-10 기준 만 34.04세이므로 34.7세 시작 대운은 아직 오지 않았고, 24.7세 대운이 현재다.
    const current = screen.getByText('현재')
    expect(current.closest('button')!.textContent).toMatch(/^24세~ 10년 흐름癸丑계축.*현재$/)
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
    expect(badges).toEqual(['태어난 달의 도움득령 × 없음', '바로 아래 글자의 도움득지 ○ 있음', '주변 글자의 도움득세 ○ 있음'])
  })

  it('글자 사이 관계 표: 손풀이 5개를 쉬운 이름으로 (원래 이름 병기)', async () => {
    await show1992()
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

  it('해석 요약: 근거가 함께 표시되고 단정 표현이 없다', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: '해석 요약' })
    const articles = within(section).getAllByRole('article')
    expect(articles.length).toBeGreaterThanOrEqual(4)
    for (const a of articles) expect(a.textContent).toContain('근거:')
    expect(section.textContent).not.toMatch(/반드시|틀림없|무조건|불행/)
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

describe('10년 흐름·해마다의 흐름과 내 사주의 관계', () => {
  it('현재 10년 흐름(계축)과 올해(2026 병오)의 관계 제목이 나온다', async () => {
    await show1992()
    expect(screen.getByText('24세부터의 10년 흐름(계축)과 내 사주의 관계')).toBeTruthy()
    expect(screen.getByText('2026년의 흐름(병오)과 내 사주·10년 흐름의 관계')).toBeTruthy()
  })

  it('2026 병오는 내 사주와 병임충·묘오파·오술 반합을 맺는다 (손풀이)', async () => {
    await show1992()
    const tables = screen.getAllByRole('table', { name: '글자 사이 관계 목록' })
    const names = rowHeaders(tables.at(-1)!)
    expect(names.some((n) => n.startsWith('임·병 위 글자끼리 부딪힘') && n.includes('병임충'))).toBe(true)
    expect(names.some((n) => n.startsWith('묘·오 깨짐') && n.includes('묘오파'))).toBe(true)
    expect(names.some((n) => n.startsWith('술·오 반쪽 어울림') && n.includes('오술 반합'))).toBe(true)
  })

  it('해마다의 흐름 카드를 누르면 관계 제목이 그 해로 바뀌고 이웃 여부는 "—"이다', async () => {
    const user = await show1992()
    await user.click(screen.getByRole('button', { name: /^2024년 흐름/ }))
    expect(screen.getByText('2024년의 흐름(갑진)과 내 사주·10년 흐름의 관계')).toBeTruthy()
    const seunTable = screen.getAllByRole('table', { name: '글자 사이 관계 목록' }).at(-1)!
    const cells = within(seunTable).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell').at(-1)!.textContent)
    expect(cells.every((c) => c === '—')).toBe(true)
  })

  it('10년 흐름을 바꾸면 해마다의 범위와 관계 제목이 바뀐다', async () => {
    const user = await show1992()
    const list = screen.getByRole('list', { name: '10년 흐름 목록' })
    await user.click(within(list).getAllByRole('button')[0]) // 첫 대운 4세~ 신해
    expect(screen.getByText('4세부터의 10년 흐름(신해)과 내 사주의 관계')).toBeTruthy()
    // 첫 대운은 4세 9개월에 시작(1992-10 + 4.8년 = 1997년)하고 올해(2026)는 범위 밖이라 첫 해가 선택된다
    expect(screen.getByText(/^1997년의 흐름/)).toBeTruthy()
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
    expect(section.textContent).toContain('순행')
  })

  it('사화는 글자로 표시된다: 임년 천량 화록, 자미 화권, 좌보 화과, 무곡 화기', async () => {
    await show1992()
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
