// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

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

describe('명식 화면', () => {
  it('2000-01-01 12:00 → 기묘년 병자월 무오일 무오시', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '12', minute: '0' })
    await submit(user)
    expect(await screen.findByText(/기묘년 병자월 무오일 무오시/)).toBeTruthy()
    expect(screen.getByText(/입력 시각 2000-01-01 12:00 \(보정 없음\)/)).toBeTruthy()
    // 명식표는 시·일·월·연 순서의 열을 가진다
    const table = screen.getByRole('table', { name: /사주 명식표/ })
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['시주', '일주', '월주', '연주'])
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

  it('시간 모름: 시주 열은 비고 요약은 3주', async () => {
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
  it('자시 처리 옵션을 바꾸면 결과가 바로 갱신된다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '23', minute: '30' })
    await submit(user)
    expect(await screen.findByText(/무오일 임자시/)).toBeTruthy()
    await user.click(screen.getByText(/^계산 기준/))
    await user.selectOptions(screen.getByLabelText('자시(23시~01시) 처리'), 'zi-hour-start')
    expect(await screen.findByText(/기미일 갑자시/)).toBeTruthy()
  })

  it('경도 보정을 고르면 출생지 입력이 나타나고, 서울 기준 −32분 보정이 표시된다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    expect(screen.queryByLabelText('출생지')).toBeNull()
    await user.click(screen.getByText(/^계산 기준/))
    await user.selectOptions(screen.getByLabelText('진태양시 보정'), 'longitude')
    expect(screen.getByLabelText('출생지')).toBeTruthy()
    await fill(user, { year: '1990', month: '5', day: '15', hour: '7', minute: '5' })
    await submit(user)
    expect(await screen.findByText(/일주·시주 계산 시각 1990-05-15 06:33 \(보정 −32분\)/)).toBeTruthy()
  })

  it('기본값으로 되돌리기 버튼은 기본값일 때 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await user.click(screen.getByText(/^계산 기준/))
    const reset = screen.getByRole('button', { name: '기본값으로 되돌리기' }) as HTMLButtonElement
    expect(reset.disabled).toBe(true)
    await user.selectOptions(screen.getByLabelText('연주를 바꾸는 기준'), 'lunar-new-year')
    expect(reset.disabled).toBe(false)
    await user.click(reset)
    expect(reset.disabled).toBe(true)
  })
})

describe('경고와 안내', () => {
  it('1908년 이전 출생은 표준시 도입 전 경고를 보여준다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1900', month: '6', day: '1', hour: '12' })
    await submit(user)
    expect(await screen.findByText(/표준시 도입 전/)).toBeTruthy()
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
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    await screen.findByText(/임신년 경술월/)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    vi.unstubAllGlobals()
  })
})

describe('오행 차트와 대운', () => {
  it('오행 차트를 표로 전환하면 천간·지지·지장간 열이 보인다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '12', minute: '0' })
    await submit(user)
    await screen.findByText(/기묘년 병자월/)
    await user.click(screen.getByRole('button', { name: '표' }))
    const t = screen.getByRole('table', { name: '오행별 개수' })
    expect(within(t).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['오행', '천간', '지지', '합계', '지장간', '지장간 포함'])
    // 기묘 병자 무오 무오: 토 천간 3(기·무·무)
    const earthRow = within(t).getByRole('row', { name: /土 토/ })
    expect(within(earthRow).getAllByRole('cell')[0].textContent).toBe('3')
  })

  it('오행 막대는 항목 이름과 개수를 접근 가능한 이름으로 가진다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '2000', month: '1', day: '1', hour: '12', minute: '0' })
    await submit(user)
    const row = await screen.findByRole('listitem', { name: /^토\(土\) 3개/ })
    expect(row.getAttribute('tabindex')).toBe('0')
  })

  it('현재 나이에 해당하는 대운에 "현재" 표시가 붙는다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    await screen.findByText(/임신년 경술월/)
    // 1992-10-24 05:30 남자(임=양년) → 순행, 입동(1992-11-07)까지 약 14일 → 대운수 약 4.7세.
    // 2026-11-10 기준 만 34.04세이므로 34.7세 시작 대운은 아직 오지 않았고, 24.7세 대운이 현재다.
    const current = screen.getByText('현재')
    // 버튼 이름은 화면에 보이는 글자에서 만들어진다 (aria-label 없음)
    expect(current.closest('button')!.textContent).toMatch(/^24세~ 대운癸丑계축.*현재$/)
  })

  it('대운 카드를 누르면 해당 대운의 세운 10개가 바뀐다', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    await screen.findByText(/임신년 경술월/)
    const list = screen.getByRole('list', { name: '대운 목록' })
    const cards = within(list).getAllByRole('button')
    expect(cards).toHaveLength(10)
    await user.click(cards[0])
    expect(cards[0].getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelectorAll('ul.seun li')).toHaveLength(10)
  })
})

describe('명리 분석 화면', () => {
  async function show1992() {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    await screen.findByText(/임신년 경술월/)
    return user
  }

  it('일간의 강약: 손풀이 48% 중화, 득령 × 득지 ○ 득세 ○', async () => {
    await show1992()
    const meter = screen.getByRole('meter', { name: '일간을 돕는 기운의 비율' })
    expect(meter.getAttribute('aria-valuenow')).toBe('48')
    expect(meter.getAttribute('aria-valuetext')).toBe('48퍼센트, 중화')
    expect(screen.getByText(/득령\(월지\) ×/)).toBeTruthy()
    expect(screen.getByText(/득지\(일지\) ○/)).toBeTruthy()
    expect(screen.getByText(/득세\(나머지\) ○/)).toBeTruthy()
  })

  it('원국 관계 표: 묘유충·유술해·신유술 방합·을경합·묘술합', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: '합·충·형·파·해' })
    const table = within(section).getByRole('table', { name: '합충형파해 관계 목록' })
    const rows = within(table).getAllByRole('row').slice(1)
    const names = rows.map((r) => within(r).getAllByRole('rowheader')[0].textContent ?? '')
    expect(names.some((n) => n.startsWith('묘유충'))).toBe(true)
    expect(names.some((n) => n.startsWith('유술해'))).toBe(true)
    expect(names.some((n) => n.startsWith('신유술 방합'))).toBe(true)
    expect(names.some((n) => n.startsWith('을경합'))).toBe(true)
    expect(names.some((n) => n.startsWith('묘술합'))).toBe(true)
    expect(rows).toHaveLength(5)
    // 인접 여부는 기호가 아니라 글자로 표시된다
    const clash = rows.find((r) => within(r).getAllByRole('rowheader')[0].textContent?.startsWith('묘유충'))!
    expect(clash.textContent).toContain('인접')
    expect(clash.textContent).toContain('시주 지지 · 일주 지지')
  })

  it('용신 후보: 중화라 억부 후보 없음, 조후는 술월이라 치우침 없음, 한계 안내', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: '용신 후보 (참고)' })
    expect(within(section).getByText(/균형에 가까워 억부로 특별히 보강할 방향이 뚜렷하지 않습니다/)).toBeTruthy()
    expect(within(section).getByText(/한열이 한쪽으로 치우친 계절이 아니어서/)).toBeTruthy()
    expect(within(section).getByText(/궁통보감의 일간×월지 표를 쓴 것이 아닙니다/)).toBeTruthy()
  })

  it('신살: 천을귀인과 도화를 참고 표지로 보여준다', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: '신살 (참고 표지)' })
    expect(within(section).getByText('천을귀인')).toBeTruthy()
    expect(within(section).getByText('도화')).toBeTruthy()
    expect(within(section).getByText(/참고 표지로만 표시/)).toBeTruthy()
  })

  it('해석 요약: 근거가 함께 표시되고 단정 표현이 없다', async () => {
    await show1992()
    const section = screen.getByRole('region', { name: '해석 요약' })
    const articles = within(section).getAllByRole('article')
    expect(articles.length).toBeGreaterThanOrEqual(4)
    for (const a of articles) expect(a.textContent).toContain('근거:')
    expect(section.textContent).not.toMatch(/반드시|틀림없|무조건|불행/)
    expect(within(section).getByText(/예측이 아니라 참고용/)).toBeTruthy()
  })

  it('계산 근거 표: 자리별 가중치 합계 100, 돕는 합계 48', async () => {
    const user = await show1992()
    await user.click(screen.getByText('계산 근거 (자리별 가중치)'))
    const table = screen.getByRole('table', { name: '자리별 가중치와 일간을 돕는지 여부' })
    const foot = within(table).getAllByRole('row').at(-1)!
    expect(foot.textContent).toContain('합계')
    expect(foot.textContent).toContain('100')
    expect(foot.textContent).toContain('48')
  })
})

describe('대운·세운과 원국의 관계', () => {
  async function show1992() {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    await screen.findByText(/임신년 경술월/)
    return user
  }

  it('현재 대운(계축)과 올해 세운(2026 병오)의 관계 제목이 나온다', async () => {
    await show1992()
    expect(screen.getByText('24세 대운(계축)과 원국의 관계')).toBeTruthy()
    expect(screen.getByText('2026년 세운(병오)과 원국·대운의 관계')).toBeTruthy()
  })

  it('2026 병오 세운은 원국과 병임충·묘오파·오술 반합을 맺는다 (손풀이)', async () => {
    await show1992()
    const tables = screen.getAllByRole('table', { name: '합충형파해 관계 목록' })
    const seunTable = tables.at(-1)!
    const names = within(seunTable).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('rowheader')[0].textContent ?? '')
    expect(names.some((n) => n.startsWith('병임충'))).toBe(true)
    expect(names.some((n) => n.startsWith('묘오파'))).toBe(true)
    expect(names.some((n) => n.startsWith('오술 반합'))).toBe(true)
  })

  it('세운 카드를 누르면 관계 제목이 그 해로 바뀌고 인접 표시는 "—"이다', async () => {
    const user = await show1992()
    await user.click(screen.getByRole('button', { name: /^2024년 세운/ }))
    expect(screen.getByText('2024년 세운(갑진)과 원국·대운의 관계')).toBeTruthy()
    const seunTable = screen.getAllByRole('table', { name: '합충형파해 관계 목록' }).at(-1)!
    const cells = within(seunTable).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell').at(-1)!.textContent)
    expect(cells.every((c) => c === '—')).toBe(true)
  })

  it('대운을 바꾸면 세운 범위와 관계 제목이 바뀐다', async () => {
    const user = await show1992()
    const list = screen.getByRole('list', { name: '대운 목록' })
    await user.click(within(list).getAllByRole('button')[0]) // 첫 대운 4세~ 신해
    expect(screen.getByText('4세 대운(신해)과 원국의 관계')).toBeTruthy()
    // 첫 대운은 4세 9개월에 시작(1992-10 + 4.8년 = 1997년)하고 올해(2026)는 범위 밖이라 첫 해가 선택된다
    expect(screen.getByText(/^1997년 세운/)).toBeTruthy()
  })
})

describe('자미두수 명반 화면', () => {
  it('1992-10-24 05:30 남: 명궁 정미(염정·칠살·문창·문곡), 수2국, 명궁 미·신궁 축, 순행', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    const section = await screen.findByRole('region', { name: '자미두수 명반' })
    const list = within(section).getByRole('list', { name: '12궁 (명궁부터)' })
    const palaces = within(list).getAllByRole('listitem', { name: /궁, / })
    expect(palaces).toHaveLength(12)
    expect(palaces[0].getAttribute('aria-label')).toMatch(/^명궁, 정미궁/)
    const soulText = palaces[0].textContent ?? ''
    for (const star of ['염정', '칠살', '문창', '문곡']) expect(soulText).toContain(star)
    expect(section.textContent).toContain('수2국 (천하수)')
    expect(section.textContent).toMatch(/명궁\s*미\s*·\s*신궁\s*축/)
    expect(section.textContent).toContain('순행')
  })

  it('사화는 글자로 표시된다: 임년 천량 화록, 자미 화권, 좌보 화과, 무곡 화기', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    const section = await screen.findByRole('region', { name: '자미두수 명반' })
    for (const s of ['화록', '화권', '화과', '화기']) expect(within(section).getAllByText(s)).toHaveLength(1)
  })

  it('현재 대한: 2026년 세는 나이 35세 → 32–41 전택궁(술)', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24', hour: '5', minute: '30' })
    await submit(user)
    const section = await screen.findByRole('region', { name: '자미두수 명반' })
    const current = within(section).getAllByRole('listitem', { name: /현재 대한/ })
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute('aria-label')).toMatch(/^전택궁, 경술궁/)
    expect(section.textContent).toContain('올해 세는 나이 35세')
  })

  it('시간 모름이면 명반 대신 안내 문장', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await fill(user, { year: '1992', month: '10', day: '24' })
    await user.click(screen.getByLabelText(/시간 모름/))
    await submit(user)
    const section = await screen.findByRole('region', { name: '자미두수 명반' })
    expect(section.textContent).toContain('출생 시각이 있어야 계산할 수 있습니다')
    expect(within(section).queryByRole('list')).toBeNull()
  })

  it('윤달: 음력 2020 윤4월 20일 묘시 — 기본(16일부터 다음 달)은 5월로 명궁 묘, "그대로"면 4월로 명궁 인', async () => {
    const user = userEvent.setup()
    render(<App now={NOW} />)
    await user.click(screen.getByLabelText('음력'))
    await user.click(screen.getByLabelText('윤달'))
    await fill(user, { year: '2020', month: '4', day: '20', hour: '5', minute: '30' })
    await submit(user)
    const section = await screen.findByRole('region', { name: '자미두수 명반' })
    expect(section.textContent).toContain('윤4월 20일')
    expect(section.textContent).toContain('명반에서는 5월로 계산')
    expect(section.textContent).toMatch(/명궁\s*묘/)
    await user.click(screen.getByText(/^계산 기준/))
    await user.selectOptions(screen.getByLabelText('자미두수 윤달 처리'), 'as-is')
    expect(section.textContent).toContain('명반에서는 4월로 계산')
    expect(section.textContent).toMatch(/명궁\s*인/)
  })
})
