'use client'

import { Button } from '@xco-agency/corex-ui'
import { Send, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { useT } from '@/lib/i18n'
import { useOrganization } from '../organization/context'
import { askAssistant, type ChatMessage } from './service'

const SUGGESTIONS = ['Quel ordre de fabrication est en retard ?', 'État des stocks de matières premières', 'Quelles machines sont à l’arrêt ?', 'Quels clients ont des factures en retard ?']
const TOOL_LABEL: Record<string, string> = {
  get_kpis: 'Indicateurs', search_stock: 'Stock', low_stock_items: 'Stock bas', late_production_orders: 'Production en retard', open_breakdowns: 'Pannes', open_quality_issues: 'Qualité', overdue_receivables: 'Créances',
}

/** Chat with the read-only assistant (`/api/assistant`). Answers come from the organization's own data through tool calls. */
export function AssistantChat({ compact = false }: { compact?: boolean }) {
  const org = useOrganization()
  const t = useT()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setError(null)
    setBusy(true)
    try {
      const res = await askAssistant(org.id, next)
      setMessages([...next, { role: 'assistant', content: res.reply, tools: res.tools }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${compact ? '' : 'rounded-xl border bg-card'}`}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#1a1a1a] text-brand"><Sparkles className="size-6" /></span>
            <h2 className="text-xl font-semibold tracking-tight">{t('Par où commencer ?')}</h2>
            <div className="flex w-full max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => void send(s)} className="rounded-lg border px-3 py-2 text-start text-[13px] text-muted-foreground hover:bg-secondary">{t(s)}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.role === 'user' ? 'ms-auto bg-foreground text-background' : 'bg-secondary'}`}>
            {m.content}
            {m.tools && m.tools.length > 0 && <div className="mt-2 text-[11px] opacity-60">{t('Sources')} : {[...new Set(m.tools)].map((x) => t(TOOL_LABEL[x] ?? x)).join(', ')}</div>}
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">{t('Analyse en cours…')}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</div>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); void send(input) }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('Posez une question sur votre exploitation…')} className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40" />
        <Button variant="primary" submit loading={busy} disabled={!input.trim()} accessibilityLabel={t('Envoyer')}><Send className="size-4" /></Button>
      </form>
    </div>
  )
}
