/**
 * 한국어 조사 고르기: 앞 낱말의 마지막 글자에 받침이 있으면 첫째(과·을·이·은·으로), 없으면 둘째(와·를·가·는·로).
 * 따옴표·괄호 등 끝 기호는 건너뛰고 마지막 한글 글자를 본다.
 */
function lastHangul(word: string): string | null {
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return word[i]
  }
  return null
}

export function hasBatchim(word: string): boolean {
  const ch = lastHangul(word)
  if (!ch) return false
  return (ch.charCodeAt(0) - 0xac00) % 28 !== 0
}

/** 받침에 맞는 조사를 붙인다. 예: josa('소화', '과', '와') → '소화와' */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return word + (hasBatchim(word) ? withBatchim : withoutBatchim)
}

export const 과와 = (w: string) => josa(w, '과', '와')
export const 을를 = (w: string) => josa(w, '을', '를')
export const 이가 = (w: string) => josa(w, '이', '가')

/** (으)로: 받침이 없거나 ㄹ 받침이면 '로', 그 밖의 받침이면 '으로'. 예: 기질로, 흙으로, 나무로 */
export function 으로로(word: string): string {
  const ch = lastHangul(word)
  if (!ch) return word + '로'
  const jong = (ch.charCodeAt(0) - 0xac00) % 28
  return word + (jong === 0 || jong === 8 ? '로' : '으로')
}
