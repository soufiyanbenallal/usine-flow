'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthForm, EmailField, emailSchema, useFormStatus, validate } from '@/components/auth-form'
import { AuthLayout } from '@/layouts/auth-layout'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const status = useFormStatus()

  const submit = async () => {
    status.setError(null)
    const { data, errors } = validate(emailSchema, email)
    setEmailError(errors._)
    if (!data) return
    if (!supabase) return status.setError('Supabase n’est pas configuré.')
    status.setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data, { redirectTo: `${window.location.origin}/reset-password` })
    status.setBusy(false)
    if (error) return status.setError(error.message)
    status.setInfo('Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.')
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Nous vous envoyons un lien pour en choisir un nouveau."
      footer={
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Retour à la connexion
        </Link>
      }
    >
      <AuthForm onSubmit={submit} submitLabel="Envoyer le lien" busy={status.busy} error={status.error} info={status.info}>
        <EmailField label="Adresse e-mail" autoComplete="email" value={email} onChange={setEmail} error={emailError} />
      </AuthForm>
    </AuthLayout>
  )
}
