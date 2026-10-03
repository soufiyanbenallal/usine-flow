'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { Repeat } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { StockBadge } from '@/components/business/stock-badge'
import { formatMoney, formatQty } from '@/lib/format'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { Pill } from '../_core/pill'
import { useItemStock } from '../items/hooks'
import { useOrganization, useOrgPath } from '../organization/context'
import { useCan } from '../organization/permissions'
import { reorderSuggestion } from './calculations'

type Line = { itemId: string; sku: string; name: string; qty: number; price: number; vat: number }

/**
 * Automatic replenishment suggestions from min/max levels, reorder points, safety stock and incoming purchases.
 * Selected lines become a draft purchase request (to be approved and converted into orders).
 */
export function ReplenishmentPage() {
  const { data, isPending, error } = useItemStock()
  const org = useOrganization()
  const href = useOrgPath()
  const router = useRouter()
  const client = useQueryClient()
  const canBuy = useCan('purchase.write')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const suggestions = useMemo(
    () =>
      (data ?? [])
        .filter((s) => s.active)
        .map((s) => ({ s, qty: reorderSuggestion({ onHand: s.on_hand, reserved: s.reserved, incoming: s.incoming, reorderPoint: s.reorder_point, reorderQty: s.reorder_qty, minStock: s.min_stock, safetyStock: s.safety_stock, maxStock: s.max_stock }) }))
        .filter((x) => x.qty > 0),
    [data],
  )
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (!n.delete(id)) n.add(id); return n })

  const create = useMutation<string, Error, Line[]>({
    mutationFn: async (lines) => {
      const supabase = requireSupabase()
      const { data: req, error: e1 } = await supabase.from('purchase_requests').insert({ organization_id: org.id, requested_by_name: 'Réapprovisionnement automatique' }).select('id').single()
      if (e1) throw toUserError(e1)
      const { error: e2 } = await supabase.from('purchase_request_lines').insert(lines.map((l) => ({ organization_id: org.id, request_id: req.id, item_id: l.itemId, quantity: l.qty, unit_price: l.price, vat_rate: l.vat })))
      if (e2) throw toUserError(e2)
      return req.id as string
    },
    onSuccess: async (id) => {
      await client.invalidateQueries({ queryKey: ['org', org.id] })
      router.push(href(`achats/demandes/${id}`))
    },
  })

  const submit = async () => {
    const chosen = suggestions.filter((x) => selected.has(x.s.item_id))
    const { data: items } = await requireSupabase().from('items').select('id, last_purchase_cost, vat_rate').in('id', chosen.map((c) => c.s.item_id))
    const byId = new Map((items ?? []).map((i) => [i.id as string, i as { last_purchase_cost: number; vat_rate: number }]))
    create.mutate(chosen.map((c) => ({ itemId: c.s.item_id, sku: c.s.sku, name: c.s.name, qty: c.qty, price: byId.get(c.s.item_id)?.last_purchase_cost ?? c.s.avg_cost, vat: byId.get(c.s.item_id)?.vat_rate ?? 20 })))
  }

  return (
    <PageShell
      title="Réapprovisionnement"
      icon={Repeat}
      description="Quantités proposées = stock projeté (en stock − réservé + attendu) comparé au point de commande, au minimum et au stock de sécurité."
      error={error?.message}
      actions={
        canBuy && (
          <Button variant="primary" disabled={selected.size === 0} loading={create.isPending} onClick={() => void submit()}>
            Créer une demande d’achat ({selected.size})
          </Button>
        )
      }
    >
      {create.error && <Banner tone="critical">{create.error.message}</Banner>}
      {!isPending && suggestions.length === 0 && <Banner tone="success">Aucun article sous son seuil de réapprovisionnement.</Banner>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-[13px]">
          <thead className="bg-muted">
            <tr>
              <th className="w-10 px-3 py-2" />
              <th className="px-3 text-left font-medium">Article</th>
              <th className="px-3 text-right font-medium">En stock</th>
              <th className="px-3 text-right font-medium">Réservé</th>
              <th className="px-3 text-right font-medium">Attendu</th>
              <th className="px-3 text-right font-medium">Point de commande</th>
              <th className="px-3 text-right font-medium">Suggestion</th>
              <th className="px-3 text-right font-medium">Valeur estimée</th>
              <th className="px-3 text-left font-medium">Niveau</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map(({ s, qty }) => (
              <tr key={s.item_id} className="border-t">
                <td className="px-3 py-2"><input type="checkbox" aria-label={`Sélectionner ${s.sku}`} checked={selected.has(s.item_id)} onChange={() => toggle(s.item_id)} /></td>
                <td className="px-3">{s.sku} — {s.name}</td>
                <td className="px-3 text-right tabular-nums">{formatQty(s.on_hand)}</td>
                <td className="px-3 text-right tabular-nums">{formatQty(s.reserved)}</td>
                <td className="px-3 text-right tabular-nums">{formatQty(s.incoming)}</td>
                <td className="px-3 text-right tabular-nums">{formatQty(s.reorder_point)}</td>
                <td className="px-3 text-right"><Pill tone="info">{formatQty(qty)}</Pill></td>
                <td className="px-3 text-right tabular-nums">{formatMoney(qty * s.avg_cost)}</td>
                <td className="px-3"><StockBadge onHand={s.on_hand} rules={{ minStock: s.min_stock, maxStock: s.max_stock, reorderPoint: s.reorder_point }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
