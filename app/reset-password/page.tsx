'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm, passwordSchema, PasswordField, useFormStatus, validate } from '@/components/auth-form'
import { AuthLayout } from '@/layouts/auth-layout'
import { supabase } from '@/lib/supabase'

/** Reached from the recovery e-mail: Supabase has already exchanged the link for a session. */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string>()
  const status = useFormStatus()

  const submit = async () => {
    status.setError(null)
    const { data, errors } = validate(passwordSchema, password)
    setPasswordError(errors._)
    if (!data) return
    if (!supabase) return status.setError('Supabase n’est pas configuré.')
    status.setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: data })
    status.setBusy(false)
    if (error) return status.setError(error.message)
    router.push('/login')
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un mot de passe d’au moins 8 caractères.">
      <AuthForm onSubmit={submit} submitLabel="Mettre à jour" busy={status.busy} error={status.error}>
        <PasswordField label="Nouveau mot de passe" autoComplete="new-password" value={password} onChange={setPassword} error={passwordError} />
      </AuthForm>
    </AuthLayout>
  )
}
