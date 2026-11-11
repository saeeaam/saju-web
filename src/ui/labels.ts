import type { WarningCode } from '../core/index.ts'
import type { Element } from '../types/basic.ts'
import type { DayBoundary, DaeunAgeFormat, EarthStageRule, LeapMonthRule, SolarTimeCorrection, YearBoundary } from '../types/options.ts'

/** 오행 표시 순서: 상생 순서 (목 → 화 → 토 → 금 → 수) */
export const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']

export const ELEMENT_KO: Record<Element, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

export const ELEMENT_HANJA: Record<Element, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

export const WARNING_TEXT: Record<WarningCode, string> = {
  PRE_1908_LMT:
    '1908년 4월 이전은 표준시 도입 전입니다. 입력한 시각을 한국 표준시(UTC+9)로 간주해 계산했습니다. 지방시를 반영하려면 계산 기준에서 "출생지 경도"로 보정하세요.',
  NEAR_TERM_BOUNDARY:
    '절기가 바뀌는 시각(절입) 전후 1시간 이내입니다. 연주·월주가 달라질 수 있으니 출생 시각을 다시 확인하세요.',
  TERM_DAY_NO_TIME: '출생 시각을 몰라서, 절기가 바뀌는 날의 월주(·연주)를 확정할 수 없습니다.',
  ZI_HOUR_BOUNDARY:
    '23시~01시 출생은 자시 처리 기준(야자시·조자시)에 따라 일주와 시주가 달라집니다. 계산 기준에서 확인하세요.',
  HISTORICAL_TIME_ADJUSTED: '당시의 표준시·서머타임 규칙에 따라 시각이 보정되었습니다.',
}

export interface Place {
  id: string
  name: string
  /** 동경(°). 도시 중심의 근사값 */
  longitude: number
}

export const PLACES: Place[] = [
  { id: 'seoul', name: '서울', longitude: 126.978 },
  { id: 'incheon', name: '인천', longitude: 126.705 },
  { id: 'suwon', name: '수원', longitude: 127.009 },
  { id: 'chuncheon', name: '춘천', longitude: 127.73 },
  { id: 'gangneung', name: '강릉', longitude: 128.876 },
  { id: 'daejeon', name: '대전', longitude: 127.385 },
  { id: 'cheongju', name: '청주', longitude: 127.489 },
  { id: 'jeonju', name: '전주', longitude: 127.148 },
  { id: 'gwangju', name: '광주', longitude: 126.853 },
  { id: 'daegu', name: '대구', longitude: 128.601 },
  { id: 'ulsan', name: '울산', longitude: 129.312 },
  { id: 'busan', name: '부산', longitude: 129.075 },
  { id: 'jeju', name: '제주', longitude: 126.531 },
]

export const DAY_BOUNDARY_LABEL: Record<DayBoundary, { name: string; help: string }> = {
  midnight: {
    name: '자정에 날짜 변경 (야자시·조자시 구분)',
    help: '23:00~23:59는 당일 일간으로, 00:00~00:59는 다음날 일간으로 시주를 정합니다.',
  },
  'zi-hour-start': {
    name: '23시부터 다음날 (정자시)',
    help: '23:00부터 일주가 다음날로 바뀌고 시주도 다음날 일간 기준입니다.',
  },
  'split-zi': {
    name: '일주는 당일, 시주는 다음날 일간 기준',
    help: '23:00~23:59에 일주는 당일로 두고, 시주의 천간만 다음날 일간으로 정합니다.',
  },
}

export const YEAR_BOUNDARY_LABEL: Record<YearBoundary, string> = {
  ipchun: '입춘 기준',
  'lunar-new-year': '음력 설(1월 1일) 기준',
}

export const SOLAR_TIME_LABEL: Record<SolarTimeCorrection, string> = {
  none: '보정 없음 (표준시 그대로)',
  longitude: '출생지 경도로 보정 (진태양시)',
  'fixed-30': '일률 −30분',
}

export const EARTH_STAGE_LABEL: Record<EarthStageRule, string> = {
  'fire-earth': '화토동궁 (무·기가 병·정과 같음)',
  'water-earth': '수토동궁 (무·기가 임·계와 같음)',
}

export const DAEUN_AGE_LABEL: Record<DaeunAgeFormat, string> = {
  precise: '년·개월 단위로 정밀하게',
  integer: '정수 나이 (반올림)',
}

export const LEAP_RULE_LABEL: Record<LeapMonthRule, string> = {
  'split-15': '15일까지 그 달, 16일부터 다음 달로',
  'as-is': '윤달을 그 달로 그대로',
}
