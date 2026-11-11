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

/** 오행의 쉬운 이름 */
export const ELEMENT_PLAIN: Record<Element, string> = {
  wood: '나무',
  fire: '불',
  earth: '흙',
  metal: '쇠',
  water: '물',
}

/** 예: 나무(목) */
export const elementText = (e: Element) => `${ELEMENT_PLAIN[e]}(${ELEMENT_KO[e]})`

export const ELEMENT_HANJA: Record<Element, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

export const WARNING_TEXT: Record<WarningCode, string> = {
  PRE_1908_LMT:
    '1908년 4월 이전에는 지금 같은 표준 시각이 없었습니다. 입력한 시각을 지금의 한국 시각으로 보고 계산했습니다. 태어난 곳의 실제 해 시각을 반영하려면 계산 기준에서 "태어난 곳 경도로 보정"을 고르세요.',
  NEAR_TERM_BOUNDARY:
    '태어난 시각이 달이 바뀌는 절기 시각과 1시간 이내로 가깝습니다. 태어난 해·달의 글자가 달라질 수 있으니 출생 시각을 다시 확인하세요.',
  TERM_DAY_NO_TIME: '태어난 시각을 몰라, 절기로 달이 바뀌는 날의 글자를 하나로 정할 수 없습니다.',
  ZI_HOUR_BOUNDARY:
    '밤 11시~새벽 1시 출생은 날짜를 언제 바꾸는지에 따라 날과 시의 글자가 달라집니다. 계산 기준에서 확인하세요.',
  HISTORICAL_TIME_ADJUSTED: '태어난 시절의 시간 제도(서머타임 등)에 맞춰 시각을 보정했습니다.',
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
    name: '자정에 날짜를 바꿈 (기본)',
    help: '밤 11시~자정은 그날로, 자정~새벽 1시는 다음 날로 봅니다. (야자시·조자시 구분)',
  },
  'zi-hour-start': {
    name: '밤 11시에 날짜를 바꿈',
    help: '밤 11시부터 다음 날로 봅니다. (정자시)',
  },
  'split-zi': {
    name: '날짜는 그대로, 시간 글자만 다음 날 기준',
    help: '밤 11시~자정에 날의 글자는 그날로 두고, 시의 글자만 다음 날 기준으로 정합니다.',
  },
}

export const YEAR_BOUNDARY_LABEL: Record<YearBoundary, string> = {
  ipchun: '입춘(2월 4일 무렵)에 해가 바뀜 (기본)',
  'lunar-new-year': '음력 설날에 해가 바뀜',
}

export const SOLAR_TIME_LABEL: Record<SolarTimeCorrection, string> = {
  none: '보정하지 않음 (기본)',
  longitude: '태어난 곳 경도로 보정',
  'fixed-30': '일률적으로 30분 빼기',
}

export const EARTH_STAGE_LABEL: Record<EarthStageRule, string> = {
  'fire-earth': '흙을 불과 같이 봄 (기본)',
  'water-earth': '흙을 물과 같이 봄',
}

export const DAEUN_AGE_LABEL: Record<DaeunAgeFormat, string> = {
  precise: '몇 세 몇 개월까지 (기본)',
  integer: '정수 나이로 반올림',
}

export const LEAP_RULE_LABEL: Record<LeapMonthRule, string> = {
  'split-15': '15일까지 그 달, 16일부터 다음 달로 (기본)',
  'as-is': '윤달을 그 달로 그대로',
}
