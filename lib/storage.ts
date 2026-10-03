import { createId } from '@paralleldrive/cuid2'
import { requireSupabase } from './supabase'

/** Private bucket. Objects live under `<organization_id>/…` — Storage RLS keys on that first folder. */
export const BUCKET = 'buildo-files'

export const safeFileName = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_')

/** Uploads a file under the organization's folder and returns its storage path. */
export async function uploadOrgFile(organizationId: string, file: File, folder?: string): Promise<string> {
  const path = [organizationId, folder, `${createId()}-${safeFileName(file.name)}`].filter(Boolean).join('/')
  const { error } = await requireSupabase().storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  return path
}

export async function removeStoredFile(path: string): Promise<void> {
  const { error } = await requireSupabase().storage.from(BUCKET).remove([path])
  if (error) throw new Error(error.message)
}

/** Short-lived URL to open a private file. */
export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrl(path, 60)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export const fileLabel = (path: string | null | undefined) => (path ? path.split('/').pop()!.replace(/^[a-z][a-z0-9]{23}-/, '') : '')
