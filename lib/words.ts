const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

/** 0–99 */
function below100(n: number): string {
  if (n < 20) return UNITS[n]!
  if (n < 70) {
    const t = Math.floor(n / 10)
    const u = n % 10
    return u === 0 ? TENS[t]! : `${TENS[t]}${u === 1 ? ' et un' : `-${UNITS[u]}`}`
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${UNITS[n - 60]}`
  return n === 80 ? 'quatre-vingts' : `quatre-vingt-${below100(n - 80)}`
}

/** 0–999; `plural` lets "quatre-vingts"/"cent" take their s only when nothing follows (as in "deux cents"). */
function below1000(n: number, final: boolean): string {
  if (n < 100) return n === 80 && !final ? 'quatre-vingt' : below100(n)
  const h = Math.floor(n / 100)
  const rest = n % 100
  const head = h === 1 ? 'cent' : `${UNITS[h]} cent${rest === 0 && final ? 's' : ''}`
  return rest === 0 ? head : `${head} ${below1000(rest, final)}`
}

/** Integer 0 … 999 999 999 in French words. */
export function integerInWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) throw new RangeError('integerInWords: 0 … 999 999 999')
  if (n === 0) return 'zéro'
  const parts: string[] = []
  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000
  if (millions) parts.push(`${millions === 1 ? 'un' : below1000(millions, false)} million${millions > 1 ? 's' : ''}`)
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`)
  if (rest) parts.push(below1000(rest, true))
  return parts.join(' ')
}

/** « mille deux cents dirhams et cinquante centimes » (rounded to the centime). */
export function amountInWords(amount: number): string {
  const cents = Math.round(Math.abs(amount) * 100)
  const dh = Math.floor(cents / 100)
  const c = cents % 100
  const dhWords = `${integerInWords(dh)} dirham${dh > 1 ? 's' : ''}`
  return c ? `${dhWords} et ${integerInWords(c)} centime${c > 1 ? 's' : ''}` : dhWords
}
