export type Gender = 'male' | 'female'

export type CalendarType = 'solar' | 'lunar'

/** 출생지. 진태양시 보정에 경도가 필요하다. (동경 기준 양수) */
export interface BirthPlace {
  name?: string
  longitude: number
  /** IANA 시간대. 기본 Asia/Seoul */
  timeZone?: string
}

export interface BirthInput {
  calendar: CalendarType
  year: number
  month: number
  day: number
  /** 윤달 여부(음력일 때만 의미 있음) */
  isLeapMonth?: boolean
  /** 출생 시각. 시간을 모르면 null → 시주 없이 3주로 계산 */
  time: { hour: number; minute: number } | null
  gender: Gender
  place?: BirthPlace
}
