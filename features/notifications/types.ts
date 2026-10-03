export type Notification = {
  id: string
  organization_id: string
  user_id: string
  event_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export type NotificationPreference = { organization_id: string; user_id: string; event_type: string; in_app: boolean; email: boolean; whatsapp: boolean; push: boolean }

/** Business events users can subscribe to (guide §25). */
export const EVENT_TYPES: { value: string; label: string }[] = [
  { value: 'inventory.low_stock', label: 'Stock bas' },
  { value: 'purchase.received', label: 'Achat réceptionné' },
  { value: 'production.delayed', label: 'Production en retard' },
  { value: 'machine.breakdown', label: 'Panne machine' },
  { value: 'quality.inspection.failed', label: 'Échec qualité' },
  { value: 'quality.recall', label: 'Rappel de lot' },
  { value: 'approval.pending', label: 'Approbation requise' },
  { value: 'sales.order.ready', label: 'Commande client prête' },
  { value: 'finance.payment.overdue', label: 'Paiement en retard' },
  { value: 'maintenance.due', label: 'Maintenance à planifier' },
  { value: 'mrp.shortage', label: 'Rupture prévue (MRP)' },
]
export const CHANNELS = [
  { key: 'in_app', label: 'Application' },
  { key: 'email', label: 'E-mail' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'push', label: 'Push' },
] as const
export type ChannelKey = (typeof CHANNELS)[number]['key']
