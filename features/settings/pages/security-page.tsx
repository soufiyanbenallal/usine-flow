'use client'

import { Banner, BlockStack, Button, Card, PasswordField, TextField } from '@xco-agency/corex-ui'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { SettingsShell } from '../settings-shell'

type Notice = { tone: 'success' | 'critical'; text: string } | null

function ProfileCard() {
  const { auth } = useAuth()
  const [name, setName] = useState(auth?.user.fullName === auth?.user.email ? '' : (auth?.user.fullName ?? ''))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const save = async () => {
    if (!supabase || !auth) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    if (!error) await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', auth.user.id)
    setBusy(false)
    setNotice(error ? { tone: 'critical', text: error.message } : { tone: 'success', text: 'Profil mis à jour.' })
  }

  return (
    <Card heading="Profil" gap="base">
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      <TextField label="Nom complet" value={name} onChange={setName} />
      <TextField label="E-mail" value={auth?.user.email ?? ''} disabled onChange={() => {}} />
      <div>
        <Button variant="primary" loading={busy} onClick={save}>
          Enregistrer
        </Button>
      </div>
    </Card>
  )
}

function PasswordCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<Notice>(null)

  const save = async () => {
    setNotice(null)
    if (password.length < 8) return setError('8 caractères minimum.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    setError(undefined)
    if (!supabase) return
    setBusy(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (e) return setNotice({ tone: 'critical', text: e.message })
    setPassword('')
    setConfirm('')
    setNotice({ tone: 'success', text: 'Mot de passe modifié.' })
  }

  return (
    <Card heading="Mot de passe" gap="base">
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      <PasswordField label="Nouveau mot de passe" value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordField label="Confirmer" value={confirm} onChange={setConfirm} error={error} autoComplete="new-password" />
      <div>
        <Button variant="primary" loading={busy} onClick={save}>
          Modifier le mot de passe
        </Button>
      </div>
    </Card>
  )
}

function SessionsCard() {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const signOutOthers = async () => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    setBusy(false)
    setNotice(error ? { tone: 'critical', text: error.message } : { tone: 'success', text: 'Les autres appareils ont été déconnectés.' })
  }
  return (
    <Card heading="Sessions" gap="base">
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      <p className="text-sm text-muted-foreground">Déconnectez tous les autres appareils où votre compte est ouvert.</p>
      <div>
        <Button variant="secondary" loading={busy} onClick={signOutOthers}>
          Déconnecter les autres appareils
        </Button>
      </div>
    </Card>
  )
}

export function SecurityPage() {
  return (
    <SettingsShell title="Sécurité" icon={ShieldCheck}>
      <BlockStack gap="base">
        <ProfileCard />
        <PasswordCard />
        <SessionsCard />
      </BlockStack>
    </SettingsShell>
  )
}
