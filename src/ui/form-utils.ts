import type { BirthInput, Gender } from '../types/input.ts'
import { PLACES } from './labels.ts'

export interface FormValues {
  calendar: 'solar' | 'lunar'
  year: string
  month: string
  day: string
  isLeap: boolean
  timeKnown: boolean
  hour: string
  minute: string
  gender: Gender
  placeId: string
  customLongitude: string
}

export const EMPTY_FORM: FormValues = {
  calendar: 'solar',
  year: '',
  month: '',
  day: '',
  isLeap: false,
  timeKnown: true,
  hour: '',
  minute: '',
  gender: 'male',
  placeId: 'seoul',
  customLongitude: '',
}

export const CUSTOM_PLACE = 'custom'

function parseInteger(text: string): number | null {
  if (text.trim() === '') return null
  const n = Number(text)
  return Number.isInteger(n) ? n : null
}

/** 폼 값 → 계산 입력. 잘못된 값이면 사용자에게 보여줄 오류 문장을 돌려준다 */
export function toBirthInput(v: FormValues): { input: BirthInput } | { error: string } {
  const year = parseInteger(v.year)
  const month = parseInteger(v.month)
  const day = parseInteger(v.day)
  if (year === null || month === null || day === null) return { error: '생년월일을 숫자로 모두 입력해 주세요.' }

  let time: BirthInput['time'] = null
  if (v.timeKnown) {
    const hour = parseInteger(v.hour)
    const minute = v.minute.trim() === '' ? 0 : parseInteger(v.minute)
    if (hour === null || minute === null) return { error: '출생 시각의 시를 숫자로 입력해 주세요. 모르면 "시간 모름"을 선택하세요.' }
    time = { hour, minute }
  }

  let place: BirthInput['place']
  if (v.placeId === CUSTOM_PLACE) {
    if (v.customLongitude.trim() !== '') {
      const lon = Number(v.customLongitude)
      if (!Number.isFinite(lon)) return { error: '경도를 숫자로 입력해 주세요. (예: 126.978)' }
      place = { longitude: lon }
    }
  } else {
    const p = PLACES.find((x) => x.id === v.placeId)
    if (p) place = { name: p.name, longitude: p.longitude }
  }

  return {
    input: {
      calendar: v.calendar,
      year,
      month,
      day,
      isLeapMonth: v.calendar === 'lunar' ? v.isLeap : false,
      time,
      gender: v.gender,
      place,
    },
  }
}
