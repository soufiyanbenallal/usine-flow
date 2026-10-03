export type AttachmentKind = 'document' | 'certificate' | 'image' | 'technical' | 'invoice' | 'photo' | 'other'

export type Attachment = {
  id: string
  organization_id: string
  entity_type: string
  entity_id: string | null
  kind: AttachmentKind
  name: string
  path: string
  mime: string | null
  size_bytes: number | null
  expires_on: string | null
  notes: string | null
  created_at: string
  created_by: string | null
}

export const KIND_LABELS: Record<AttachmentKind, string> = {
  document: 'Document', certificate: 'Certificat', image: 'Image', technical: 'Fiche technique', invoice: 'Facture', photo: 'Photo', other: 'Autre',
}
export const kindOptions = (Object.keys(KIND_LABELS) as AttachmentKind[]).map((value) => ({ value, label: KIND_LABELS[value] }))

export const formatBytes = (n: number | null | undefined) => {
  if (!n) return '—'
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  return `${(n / 1024 / 1024).toFixed(1)} Mo`
}
