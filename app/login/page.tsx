'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { AuthForm, EmailField, emailSchema, PasswordField, useFormStatus, validate, type FieldErrors } from '@/components/auth-form'
import { GoogleButton, OrDivider } from '@/components/oauth-buttons'
import { SupabaseNotice } from '@/components/supabase-notice'
import { AuthLayout } from '@/layouts/auth-layout'
import { useOrganizationState } from '@/features/organization/context'
import { useAuth } from '@/lib/auth'
import { orgPath } from '@/lib/routes'
import { supabase } from '@/lib/supabase'

const schema = z.object({ email: emailSchema, password: z.string().min(1, 'Mot de passe requis') })

export default function LoginPage() {
  const { auth, signOut } = useAuth()
  const organization = useOrganizationState()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const status = useFormStatus()

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
              Votre compte est bien connecté, mais aucune organisation n’y est associée.
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
    const { data, errors } = validate(schema, { email, password })
    setErrors(errors)
    if (!data) return
    if (!supabase) return status.setError('Supabase n’est pas configuré.')
    status.setBusy(true)
    const { error } = await supabase.auth.signInWithPassword(data)
    status.setBusy(false)
    if (error) return status.setError(error.message === 'Invalid login credentials' ? 'E-mail ou mot de passe incorrect.' : error.message)
    // The effect above redirects to /<org-slug> once the organization is loaded.
  }

  return (
    <AuthLayout
      title="Content de vous revoir"
      subtitle="Connectez-vous pour piloter vos opérations industrielles."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Créer un compte
          </Link>
        </>
      }
    >
      <SupabaseNotice />
      <AuthForm onSubmit={submit} submitLabel="Se connecter" busy={status.busy} error={status.error}>
        <EmailField label="Adresse e-mail" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
        <PasswordField label="Mot de passe" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
        <Link href="/forgot-password" className="-mt-1 self-end text-[13px] text-muted-foreground underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
      </AuthForm>
      <OrDivider />
      <GoogleButton onError={status.setError} />
    </AuthLayout>
  )
}
