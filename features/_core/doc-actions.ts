import { rpc } from '@/lib/rpc'
import type { Permission } from '@/lib/permissions'
import type { DocAction, DocHeader } from './document-detail'

/** Workflow button: draft → submitted (→ approval engine decides: approved or pending_approval). */
export const submitAction = <H extends DocHeader>(docType: string, permission?: Permission): DocAction<H> => ({
  key: 'submit', label: 'Soumettre', tone: 'primary', permission,
  visible: (h) => h.status === 'draft',
  run: (h) => rpc('submit_document', { p_type: docType, p_id: h.id }),
})

/** Cancels a document that has not been posted yet (posted ones are reversed instead). */
export const cancelAction = <H extends DocHeader>(docType: string, permission?: Permission): DocAction<H> => ({
  key: 'cancel', label: 'Annuler le document', tone: 'critical', reasonLabel: 'Motif d’annulation', permission,
  visible: (h) => ['draft', 'pending_approval', 'approved'].includes(h.status),
  run: (h, reason) => rpc('cancel_document', { p_type: docType, p_id: h.id, p_reason: reason ?? null }),
})

/** Reverses a posted document (contre-passation): stock movements are compensated, the ledger stays immutable. */
export const reverseAction = <H extends DocHeader>(docType: string, permission?: Permission): DocAction<H> => ({
  key: 'reverse', label: 'Contre-passer', tone: 'critical', reasonLabel: 'Motif de la contre-passation', permission,
  visible: (h) => h.status === 'posted',
  run: (h, reason) => rpc('reverse_document', { p_type: docType, p_id: h.id, p_reason: reason }),
})

/** Calls a posting RPC taking the document id as `p_id` (or the given argument name). */
export const rpcAction = <H extends DocHeader>(opts: {
  key: string
  label: string
  fn: string
  visible: (h: H) => boolean
  tone?: 'primary' | 'secondary' | 'critical'
  confirm?: string
  permission?: Permission
  arg?: string
  extra?: (h: H) => Record<string, unknown>
  after?: (result: unknown, go: (path: string) => void) => void
}): DocAction<H> => ({
  after: opts.after,
  key: opts.key, label: opts.label, tone: opts.tone, confirm: opts.confirm, permission: opts.permission, visible: opts.visible,
  run: (h) => rpc(opts.fn, { [opts.arg ?? 'p_id']: h.id, ...(opts.extra?.(h) ?? {}) }),
})
