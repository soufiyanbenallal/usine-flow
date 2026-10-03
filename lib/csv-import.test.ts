import { describe, expect, it } from 'vitest'
import { mapImport, parseCsv, parseNumber, templateCsv, type ImportField } from './csv-import'

describe('parseCsv', () => {
  it('detects ; , and tab, strips BOM, handles quotes and CRLF', () => {
    expect(parseCsv('﻿a;b\r\n1;"x;y"\r\n')).toEqual([['a', 'b'], ['1', 'x;y']])
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']])
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']])
    expect(parseCsv('a;b\n"say ""hi""";2')).toEqual([['a', 'b'], ['say "hi"', '2']])
  })
  it('keeps newlines inside quotes and skips blank lines', () => {
    expect(parseCsv('a;b\n"l1\nl2";2\n\n;\n')).toEqual([['a', 'b'], ['l1\nl2', '2']])
  })
})

describe('parseNumber', () => {
  it.each([['1200', 1200], ['1 200,50', 1200.5], ['1.200,50', 1200.5], ['1,200.50', 1200.5], ['12,5 DH', 12.5], ['-3', -3]])('%s → %s', (raw, n) => expect(parseNumber(raw)).toBe(n))
  it('rejects garbage', () => {
    expect(parseNumber('abc')).toBeNaN()
    expect(parseNumber('')).toBeNaN()
  })
})

type W = { full_name: string; daily_rate: number; active: boolean; phone: string | null }
const fields: ImportField<W>[] = [
  { key: 'full_name', label: 'Nom complet', aliases: ['nom'], required: true },
  { key: 'daily_rate', label: 'Taux journalier', kind: 'number', min: 0, aliases: ['tarif'] },
  { key: 'active', label: 'Actif', kind: 'boolean' },
  { key: 'phone', label: 'Téléphone' },
]

describe('mapImport', () => {
  it('maps headers by label, key or alias (case/accent-insensitive) and applies fallbacks', () => {
    const r = mapImport<W>(parseCsv('NOM;tarif;Téléphone;colonne inconnue\nAli;250,5;0600;x\nSara;;;'), fields)
    expect(r.errors).toEqual([])
    expect(r.rows).toEqual([
      { full_name: 'Ali', daily_rate: 250.5, active: true, phone: '0600' },
      { full_name: 'Sara', daily_rate: 0, active: true, phone: null },
    ])
    expect(r.ignoredHeaders).toEqual(['colonne inconnue'])
  })
  it('reports line-numbered errors without dropping valid rows', () => {
    const r = mapImport<W>(parseCsv('nom;taux journalier;actif\nAli;abc;oui\n;100;non\nBob;-5;peut-être\nOk;100;non'), fields)
    expect(r.rows).toEqual([{ full_name: 'Ok', daily_rate: 100, active: false, phone: null }])
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4])
    expect(r.errors[0]!.message).toContain('pas un nombre')
    expect(r.errors[1]!.message).toContain('vide')
    expect(r.errors[2]!.message).toContain('≥ 0')
  })
  it('flags a missing required column', () => {
    const r = mapImport<W>(parseCsv('tarif\n100'), fields)
    expect(r.missingColumns).toEqual(['Nom complet'])
    expect(r.rows).toEqual([])
  })
})

describe('templateCsv', () => {
  it('has the headers and an example row', () => {
    expect(templateCsv<W>(fields, { full_name: 'Ali', daily_rate: 250 })).toBe('﻿"Nom complet";"Taux journalier";"Actif";"Téléphone"\r\n"Ali";"250";"";""')
  })
})
