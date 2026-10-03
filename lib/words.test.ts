import { describe, expect, it } from 'vitest'
import { amountInWords, integerInWords } from './words'

describe('integerInWords', () => {
  it.each([
    [0, 'zéro'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [80, 'quatre-vingts'],
    [91, 'quatre-vingt-onze'],
    [100, 'cent'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [1000, 'mille'],
    [1200, 'mille deux cents'],
    [80_000, 'quatre-vingt mille'],
    [200_000, 'deux cent mille'],
    [1_000_000, 'un million'],
    [2_500_000, 'deux millions cinq cent mille'],
  ])('%i → %s', (n, words) => expect(integerInWords(n)).toBe(words))
  it('rejects out-of-range values', () => {
    expect(() => integerInWords(-1)).toThrow(RangeError)
    expect(() => integerInWords(1.5)).toThrow(RangeError)
  })
})

describe('amountInWords', () => {
  it('formats dirhams and centimes', () => {
    expect(amountInWords(1)).toBe('un dirham')
    expect(amountInWords(1200)).toBe('mille deux cents dirhams')
    expect(amountInWords(12.5)).toBe('douze dirhams et cinquante centimes')
    expect(amountInWords(0.01)).toBe('zéro dirham et un centime')
  })
})
