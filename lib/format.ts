import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const mad = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('fr-MA')

export const formatMAD = (value: number) => mad.format(value)
export const formatNumber = (value: number) => num.format(value)
export const formatPercent = (value: number) => `${Math.round(value)} %`
/** '2026-10-02' → '2 oct. 2026'; null/'' → '—'. */
export const formatDate = (iso: string | null | undefined) => (iso ? format(parseISO(iso), 'd MMM yyyy', { locale: fr }) : '—')
export const today = () => format(new Date(), 'yyyy-MM-dd')
export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
