'use client'

import { Banner, Button, EmailField, Select } from '@xco-agency/corex-ui'
import { Users } from 'lucide-react'
import { useState } from 'react'
import { SettingsShell } from '@/features/settings/settings-shell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pill } from '../_core/pill'
import { useOrganization } from '@/features/organization/context'
import { ADMIN_ROLES, ASSIGNABLE_ROLES, ROLE_LABELS, type OrgRole } from '../organization/types'
import { useAuth } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { useChangeRole, useInvitations, useInvite, useMembers, useRemoveMember, useRevokeInvitation } from './hooks'
import { inviteLink } from './service'

const roleOptions = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))

export function MembersPage() {
  const org = useOrganization()
  const { auth } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(org.role)
  const members = useMembers()
  const invitations = useInvitations(isAdmin)
  const invite = useInvite()
  const revoke = useRevokeInvitation()
  const changeRole = useChangeRole()
  const remove = useRemoveMember()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('site_manager')
  const [copied, setCopied] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string>()

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(inviteLink(token))
    setCopied(token)
  }
  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setEmailError('Adresse e-mail invalide')
    setEmailError(undefined)
    try {
      const created = await invite.mutateAsync({ email, role })
      setEmail('')
      setFresh(created.token)
      await copy(created.token).catch(() => {})
    } catch {
      /* shown below */
    }
  }
  const error = members.error ?? invitations.error ?? invite.error ?? revoke.error ?? changeRole.error ?? remove.error

  return (
    <SettingsShell title="Utilisateurs" icon={Users} wide>
      <div className="space-y-6">
        {error && <Banner tone="critical">{error.message}</Banner>}

        {isAdmin && (
          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Inviter un collaborateur</h2>
            <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
              <EmailField label="Adresse e-mail" value={email} onChange={setEmail} error={emailError} />
              <Select label="Rôle" value={role} options={roleOptions} onChange={(v) => setRole(v as OrgRole)} />
              <Button variant="primary" loading={invite.isPending} onClick={submit}>
                Créer l’invitation
              </Button>
            </div>
            {fresh && (
              <Banner tone="success">
                Invitation créée{copied === fresh ? ' — lien copié dans le presse-papiers' : ''}. Envoyez ce lien à la personne (valable 7 jours) : <code className="break-all">{inviteLink(fresh)}</code>
              </Banner>
            )}
          </section>
        )}

        {isAdmin && (invitations.data ?? []).length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Invitations en attente</h2>
            <Table>
              <TableBody>
                {(invitations.data ?? []).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-[13px] font-medium">{i.email}</TableCell>
                    <TableCell className="text-[13px]">{ROLE_LABELS[i.role]}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">Expire le {formatDate(i.expires_at.slice(0, 10))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="tertiary" onClick={() => copy(i.token)}>
                        {copied === i.token ? 'Copié ✓' : 'Copier le lien'}
                      </Button>
                      <Button variant="tertiary" tone="critical" onClick={() => revoke.mutate(i.id)}>
                        Révoquer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Membres</h2>
          <Table>
            <TableHeader>
              <TableRow className="border-0 bg-muted hover:bg-muted">
                <TableHead className="text-[13px] text-foreground">Nom</TableHead>
                <TableHead className="text-[13px] text-foreground">E-mail</TableHead>
                <TableHead className="text-[13px] text-foreground">Rôle</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members.data ?? []).map((m) => {
                const isSelf = m.user_id === auth?.user.id
                const editable = isAdmin && !isSelf && m.role !== 'owner'
                return (
                  <TableRow key={m.user_id} className="h-14">
                    <TableCell className="text-[13px] font-medium">
                      {m.full_name || '—'} {isSelf && <span className="text-muted-foreground">(vous)</span>}
                    </TableCell>
                    <TableCell className="text-[13px]">{m.email ?? '—'}</TableCell>
                    <TableCell className="min-w-52 text-[13px]">
                      {editable ? (
                        <Select label="Rôle" labelAccessibilityVisibility="exclusive" value={m.role} options={roleOptions} onChange={(v) => changeRole.mutate({ userId: m.user_id, role: v as OrgRole })} />
                      ) : (
                        <Pill tone={m.role === 'owner' ? 'info' : 'neutral'}>{ROLE_LABELS[m.role]}</Pill>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editable && (
                        <Button variant="tertiary" tone="critical" loading={remove.isPending && remove.variables === m.user_id} onClick={() => remove.mutate(m.user_id)}>
                          Retirer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </section>
      </div>
    </SettingsShell>
  )
}
