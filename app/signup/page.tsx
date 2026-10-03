'use client'

import { Suspense, useEffect, useState } from 'react'
import { Banner } from '@xco-agency/corex-ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { AuthForm, EmailField, emailSchema, passwordSchema, PasswordField, TextField, useFormStatus, validate, type FieldErrors } from '@/components/auth-form'
import { GoogleButton, OrDivider } from '@/components/oauth-buttons'
import { SupabaseNotice } from '@/components/supabase-notice'
import { AuthLayout } from '@/layouts/auth-layout'
import { useOrganizationState } from '@/features/organization/context'
import { membersService } from '@/features/members/service'
import { ROLE_LABELS } from '@/features/organization/types'
import { useAuth } from '@/lib/auth'
import { orgPath } from '@/lib/routes'
import { supabase } from '@/lib/supabase'

const baseSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom requis'),
  company: z.string().trim(),
  email: emailSchema,
  password: passwordSchema,
})
const companySchema = baseSchema.extend({ company: z.string().trim().min(2, 'Nom de l’entreprise requis') })
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const params = useSearchParams()
  const token = params.get('invite')
  const inviteToken = token && UUID_RE.test(token) ? token : null
  const { auth, signOut } = useAuth()
  const organization = useOrganizationState()
  const router = useRouter()
  const [values, setValues] = useState({ fullName: '', company: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const status = useFormStatus()
  // Invitation: the invitee joins an existing organization (the DB trigger checks token + e-mail).
  const invite = useQuery({ queryKey: ['invitation', inviteToken], enabled: !!inviteToken && !!supabase, queryFn: () => membersService.previewInvitation(inviteToken!) })
  const invitation = invite.data
  const email = invitation?.email ?? values.email
  const set = (key: keyof typeof values) => (v: string) => setValues((p) => ({ ...p, [key]: v }))

  useEffect(() => {
    if (auth && organization) {
      router.replace(orgPath(organization.slug))
    }
  }, [auth, organization, router])

  if (auth) {
    if (organization === undefined) {
      return (
        <div className="grid min-h-screen place-items-center bg-sidebar text-sm text-muted-foreground">
          Chargement de votre espace…
        </div>
      )
    }
    if (organization === null) {
      return (
        <AuthLayout
          title="Aucune organisation"
          subtitle={`Connecté en tant que ${auth.user.email}`}
          footer={null}
        >
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            <p>
              Votre compte est déjà connecté, mais aucune organisation n’y est associée.
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Se déconnecter
            </button>
          </div>
        </AuthLayout>
      )
    }
    return (
      <div className="grid min-h-screen place-items-center bg-sidebar text-sm text-muted-foreground">
        Redirection vers votre organisation…
      </div>
    )
  }

  const submit = async () => {
    status.setError(null)
    const { data, errors } = validate(inviteToken ? baseSchema : companySchema, { ...values, email })
    if (inviteToken && !invitation) return status.setError('Cette invitation est invalide, expirée ou déjà utilisée.')
    setErrors(errors)
    if (!data) return
    if (!supabase) return status.setError('Supabase n’est pas configuré.')
    status.setBusy(true)
    // full_name / company_name end up in raw_user_meta_data; the on_auth_user_created trigger
    // reads them to create the profile + first organization (see supabase/migrations).
    const { data: res, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: inviteToken ? { full_name: data.fullName, invite_token: inviteToken } : { full_name: data.fullName, company_name: data.company }, emailRedirectTo: `${window.location.origin}/login` },
    })
    status.setBusy(false)
    if (error) return status.setError(error.message)
    if (res.session) return // redirected to /<org-slug> by the effect above
    status.setInfo('Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.')
  }

  return (
    <AuthLayout
      title={inviteToken ? 'Rejoignez votre équipe' : 'Créez votre compte UsineFlow'}
      subtitle={inviteToken ? 'Créez votre compte pour accéder à l’espace de votre entreprise.' : '14 jours d’essai, sans carte bancaire.'}
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Se connecter
          </Link>
        </>
      }
    >
      <SupabaseNotice />
      {inviteToken && invite.isPending && <p className="mb-4 text-sm text-muted-foreground">Vérification de l’invitation…</p>}
      {inviteToken && !invite.isPending && !invitation && (
        <div className="mb-4">
          <Banner tone="critical">Cette invitation est invalide, expirée ou déjà utilisée. Demandez-en une nouvelle à votre administrateur.</Banner>
        </div>
      )}
      {invitation && (
        <div className="mb-4">
          <Banner tone="info">
            Vous rejoignez <strong>{invitation.organization_name}</strong> en tant que <strong>{ROLE_LABELS[invitation.role]}</strong>.
          </Banner>
        </div>
      )}
      <AuthForm onSubmit={submit} submitLabel="Créer mon compte" busy={status.busy} error={status.error} info={status.info}>
        <TextField label="Nom complet" autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} />
        {!inviteToken && <TextField label="Entreprise" autoComplete="organization" value={values.company} onChange={set('company')} error={errors.company} />}
        <EmailField label="Adresse e-mail" autoComplete="email" value={email} onChange={set('email')} error={errors.email} disabled={!!invitation} />
        <PasswordField label="Mot de passe" autoComplete="new-password" value={values.password} onChange={set('password')} error={errors.password} details="8 caractères minimum" />
      </AuthForm>
      <OrDivider />
      <GoogleButton onError={status.setError} />
      <p className="mt-4 text-center text-xs text-muted-foreground">En créant un compte, vous acceptez les conditions d’utilisation et la politique de confidentialité.</p>
    </AuthLayout>
  )
}
