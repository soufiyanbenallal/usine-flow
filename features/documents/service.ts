import { toUserError } from '@/lib/errors'
import { removeStoredFile, signedUrl, uploadOrgFile } from '@/lib/storage'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { Attachment, AttachmentKind } from './types'

const crud = createCrudService<Attachment, Record<string, unknown>, Record<string, unknown>>('attachments')

export const attachmentsService = {
  ...crud,
  async forEntity(organizationId: string, entityType: string, entityId: string): Promise<Attachment[]> {
    const { data, error } = await requireSupabase()
      .from('attachments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
    if (error) throw toUserError(error)
    return (data ?? []) as Attachment[]
  },
  /** Uploads to the private bucket (`<org>/<folder>/…`) and records the attachment. */
  async upload(organizationId: string, file: File, meta: { entityType: string; entityId?: string | null; kind: AttachmentKind; expiresOn?: string | null; notes?: string | null }): Promise<Attachment> {
    const path = await uploadOrgFile(organizationId, file, meta.entityType)
    try {
      return await crud.create(organizationId, {
        entity_type: meta.entityType, entity_id: meta.entityId ?? null, kind: meta.kind, name: file.name, path, mime: file.type || null,
        size_bytes: file.size, expires_on: meta.expiresOn ?? null, notes: meta.notes ?? null,
      })
    } catch (e) {
      await removeStoredFile(path).catch(() => {})
      throw e
    }
  },
  async removeWithFile(att: Attachment): Promise<void> {
    await crud.remove(att.id)
    await removeStoredFile(att.path).catch(() => {})
  },
  open: signedUrl,
}
