'use client'

import { Banner, Button, EmailField, PasswordField, TextField } from '@xco-agency/corex-ui'
import { useState, type FormEvent, type ReactNode } from 'react'
import { z } from 'zod'

export const emailSchema = z.string().trim().email('Adresse e-mail invalide')
export const passwordSchema = z.string().min(8, 'Au moins 8 caractères')

export type FieldErrors = Record<string, string | undefined>

/** Validates `values` against `schema`; returns the first error per field. */
export function validate<T extends z.ZodType>(schema: T, values: unknown): { data?: z.infer<T>; errors: FieldErrors } {
  const result = schema.safeParse(values)
  if (result.success) return { data: result.data, errors: {} }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_')
    errors[key] ??= issue.message
  }
  return { errors }
}

export function useFormStatus() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  return { busy, setBusy, error, setError, info, setInfo }
}

type FormProps = {
  onSubmit: () => void | Promise<void>
  submitLabel: string
  busy: boolean
  error: string | null
  info?: string | null
  children: ReactNode
}

export function AuthForm({ onSubmit, submitLabel, busy, error, info, children }: FormProps) {
  const handle = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit()
  }
  return (
    <form onSubmit={handle} noValidate className="flex flex-col gap-4">
      {error && <Banner tone="critical">{error}</Banner>}
      {info && <Banner tone="success">{info}</Banner>}
      {children}
      <Button variant="primary" submit loading={busy} inlineSize="fill">
        {submitLabel}
      </Button>
    </form>
  )
}

export { Button, EmailField, PasswordField, TextField }
