'use client'

import { Banner, BlockStack, Button, Card, TextField } from '@xco-agency/corex-ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { SettingsShell } from '@/features/settings/settings-shell'
import { RESERVED_SLUGS, orgPath } from '@/lib/routes'
import { useOrganization } from './context'
import { useOrganizationDetails, useUpdateOrganization } from './hooks'
import { ADMIN_ROLES, type OrganizationDetails, type OrganizationPatch } from './types'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
type Form = Record<keyof OrganizationPatch, string>
const FIELDS: { name: keyof OrganizationPatch; label: string; help?: string }[] = [
  { name: 'name', label: 'Nom de l’entreprise' },
  { name: 'legal_form', label: 'Forme juridique', help: 'SARL, SA, auto-entrepreneur…' },
  { name: 'ice', label: 'ICE' },
  { name: 'if_number', label: 'Identifiant fiscal (IF)' },
  { name: 'rc', label: 'Registre de commerce (RC)' },
  { name: 'patente', label: 'Patente' },
  { name: 'cnss', label: 'N° CNSS' },
  { name: 'address', label: 'Adresse' },
  { name: 'city', label: 'Ville' },
  { name: 'phone', label: 'Téléphone' },
  { name: 'email', label: 'E-mail' },
]

const toForm = (d: OrganizationDetails): Form => ({ ...(Object.fromEntries(FIELDS.map((f) => [f.name, d[f.name] ?? ''])) as Form), slug: d.slug })

function SettingsForm({ details }: { details: OrganizationDetails }) {
  const router = useRouter()
  const org = useOrganization()
  const update = useUpdateOrganization()
  const [form, setForm] = useState<Form>(() => toForm(details))
  const [slugError, setSlugError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const canEdit = ADMIN_ROLES.includes(org.role)

  const set = (name: keyof Form) => (v: string) => {
    setSaved(false)
    setForm((p) => ({ ...p, [name]: v }))
  }

  const save = async () => {
    const slug = form.slug!.trim().toLowerCase()
    const invalid =
      !SLUG_RE.test(slug) || slug.length < 3 || slug.length > 40
        ? 'Minuscules, chiffres et tirets uniquement (3 à 40 caractères).'
        : (RESERVED_SLUGS as readonly string[]).includes(slug)
          ? 'Ce nom est réservé.'
          : undefined
    setSlugError(invalid)
    if (invalid || !form.name!.trim()) return
    const patch = Object.fromEntries(FIELDS.map((f) => [f.name, form[f.name]!.trim() || null])) as OrganizationPatch
    patch.name = form.name!.trim()
    patch.slug = slug
    try {
      const next = await update.mutateAsync(patch)
      setSaved(true)
      if (next.slug !== org.slug) router.replace(orgPath(next.slug, 'parametres'))
    } catch (e) {
      if ((e as Error).message.includes('existe déjà')) setSlugError('Cette adresse est déjà utilisée.')
    }
  }

  return (
    <BlockStack gap="base">
      {!canEdit && <Banner tone="info">Seuls les propriétaires et administrateurs peuvent modifier ces informations.</Banner>}
      {update.error && !slugError && <Banner tone="critical">{update.error.message}</Banner>}
      {saved && <Banner tone="success">Modifications enregistrées.</Banner>}
      <Card heading="Informations légales" gap="base">
        {FIELDS.map((f) => (
          <TextField key={f.name} label={f.label} value={form[f.name] ?? ''} onChange={set(f.name)} helpText={f.help} disabled={!canEdit} />
        ))}
      </Card>
      <Card heading="Adresse de votre espace" gap="base">
        <TextField
          label="Identifiant dans l’URL"
          prefix="buildo.ma/"
          value={form.slug ?? ''}
          onChange={set('slug')}
          error={slugError}
          helpText="Changer cet identifiant change l’adresse de toutes vos pages."
          disabled={!canEdit}
        />
      </Card>
      {canEdit && (
        <div>
          <Button variant="primary" loading={update.isPending} onClick={save}>
            Enregistrer
          </Button>
        </div>
      )}
    </BlockStack>
  )
}

export function SettingsPage() {
  const { data, isPending, error } = useOrganizationDetails()
  return (
    <SettingsShell title="Entreprise" icon={Building2} description="Informations légales affichées sur vos documents.">
      {error && <Banner tone="critical">{error.message}</Banner>}
      {isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {data && <SettingsForm details={data} />}
    </SettingsShell>
  )
}
