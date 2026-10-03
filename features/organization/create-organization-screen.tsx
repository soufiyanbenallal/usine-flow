'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Banner, Button, TextField } from '@xco-agency/corex-ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { useAuth } from '@/lib/auth'
import { orgPath } from '@/lib/routes'
import { organizationService } from './service'

/** Shown to a signed-in user who has no organization (e.g. removed from a team): create one to continue. */
export function CreateOrganizationScreen() {
  const { auth, signOut } = useAuth()
  const client = useQueryClient()
  const router = useRouter()
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async () => {
    const name = company.trim()
    if (name.length < 2) return setError('Saisissez le nom de votre entreprise.')
    setBusy(true)
    setError(undefined)
    try {
      const slug = await organizationService.create(name)
      await client.invalidateQueries({ queryKey: ['organization', auth?.user.id] })
      router.replace(orgPath(slug))
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        <Logo />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Créez votre espace de travail</h1>
          <p className="text-sm text-muted-foreground">
            Ce compte n’est rattaché à aucune entreprise. Donnez un nom à la vôtre pour commencer ; vous compléterez ses informations légales dans les paramètres.
          </p>
        </div>
        {error && <Banner tone="critical">{error}</Banner>}
        <TextField label="Nom de l’entreprise" value={company} onChange={setCompany} placeholder="Ex. Atlas Industrie" autoComplete="organization" />
        <div className="flex items-center justify-between gap-3">
          <Button variant="tertiary" onClick={() => signOut().then(() => router.replace('/login'))}>
            Se déconnecter
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            Créer l’espace
          </Button>
        </div>
      </div>
    </div>
  )
}
