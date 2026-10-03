import { Pill, type Tone } from './pill'

export type StatusMeta = { label: string; tone: Tone }

/** One shared vocabulary for document / workflow statuses across modules (labels are French source strings, see lib/i18n). */
export const STATUS: Record<string, StatusMeta> = {
  // documents
  draft: { label: 'Brouillon', tone: 'neutral' },
  pending_approval: { label: 'En approbation', tone: 'warning' },
  approved: { label: 'Approuvé', tone: 'info' },
  posted: { label: 'Comptabilisé', tone: 'success' },
  reversed: { label: 'Contre-passé', tone: 'critical' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
  completed: { label: 'Terminé', tone: 'success' },
  closed: { label: 'Clôturé', tone: 'neutral' },
  converted: { label: 'Converti', tone: 'success' },
  // purchasing / sales flow
  sent: { label: 'Envoyé', tone: 'info' },
  quoted: { label: 'Chiffré', tone: 'info' },
  awarded: { label: 'Attribué', tone: 'success' },
  ordered: { label: 'Commandé', tone: 'info' },
  partially_received: { label: 'Partiellement reçu', tone: 'warning' },
  received: { label: 'Reçu', tone: 'success' },
  accepted: { label: 'Accepté', tone: 'success' },
  rejected: { label: 'Refusé', tone: 'critical' },
  expired: { label: 'Expiré', tone: 'critical' },
  confirmed: { label: 'Confirmé', tone: 'info' },
  partially_delivered: { label: 'Partiellement livré', tone: 'warning' },
  delivered: { label: 'Livré', tone: 'success' },
  invoiced: { label: 'Facturé', tone: 'success' },
  unpaid: { label: 'Non payé', tone: 'critical' },
  partial: { label: 'Partiel', tone: 'warning' },
  paid: { label: 'Payé', tone: 'success' },
  // production & shop floor
  planned: { label: 'Planifié', tone: 'neutral' },
  released: { label: 'Lancé', tone: 'info' },
  in_progress: { label: 'En cours', tone: 'info' },
  paused: { label: 'En pause', tone: 'warning' },
  running: { label: 'En marche', tone: 'success' },
  stopped: { label: 'À l’arrêt', tone: 'critical' },
  standby: { label: 'En attente', tone: 'neutral' },
  pending: { label: 'En attente', tone: 'neutral' },
  done: { label: 'Terminé', tone: 'success' },
  skipped: { label: 'Ignoré', tone: 'neutral' },
  // generic
  open: { label: 'Ouvert', tone: 'info' },
  assigned: { label: 'Assigné', tone: 'info' },
  active: { label: 'Actif', tone: 'success' },
  obsolete: { label: 'Obsolète', tone: 'neutral' },
  retired: { label: 'Retiré', tone: 'neutral' },
  inactive: { label: 'Inactif', tone: 'neutral' },
  // quality
  passed: { label: 'Conforme', tone: 'success' },
  failed: { label: 'Non conforme', tone: 'critical' },
  accepted_with_deviation: { label: 'Accepté avec dérogation', tone: 'warning' },
  investigating: { label: 'Analyse', tone: 'warning' },
  contained: { label: 'Contenu', tone: 'info' },
  verified: { label: 'Vérifié', tone: 'success' },
  quarantine: { label: 'Quarantaine', tone: 'warning' },
  blocked: { label: 'Bloqué', tone: 'critical' },
  available: { label: 'Disponible', tone: 'success' },
  notified: { label: 'Notifié', tone: 'info' },
  // picking / dispatch
  picking: { label: 'Préparation', tone: 'info' },
  picked: { label: 'Préparé', tone: 'success' },
  packed: { label: 'Emballé', tone: 'info' },
  loaded: { label: 'Chargé', tone: 'info' },
  dispatched: { label: 'Expédié', tone: 'success' },
  // approvals
  waiting: { label: 'À venir', tone: 'neutral' },
  // workforce
  present: { label: 'Présent', tone: 'success' },
  absent: { label: 'Absent', tone: 'critical' },
  late: { label: 'En retard', tone: 'warning' },
  leave: { label: 'Congé', tone: 'info' },
  requested: { label: 'Demandé', tone: 'warning' },
  on_leave: { label: 'En congé', tone: 'info' },
}

export const statusMeta = (value: string | null | undefined): StatusMeta => STATUS[value ?? ''] ?? { label: value ?? '—', tone: 'neutral' }

export function Status({ value }: { value: string | null | undefined }) {
  const m = statusMeta(value)
  return <Pill tone={m.tone}>{m.label}</Pill>
}

export const statusOptions = (values: string[]) => values.map((v) => ({ value: v, label: statusMeta(v).label }))
