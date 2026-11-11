import type { Element } from '../types/basic.ts'

/** 오행 이름 (코어에서 문장을 만들 때 쓴다) */
export const ELEMENT_NAME: Record<Element, { ko: string; hanja: string }> = {
  wood: { ko: '목', hanja: '木' },
  fire: { ko: '화', hanja: '火' },
  earth: { ko: '토', hanja: '土' },
  metal: { ko: '금', hanja: '金' },
  water: { ko: '수', hanja: '水' },
}
