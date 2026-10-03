'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import { attachmentsService } from './service'
import type { Attachment, AttachmentKind } from './types'

export const attachmentHooks = createCrudHooks('attachments', attachmentsService)

export function useEntityAttachments(entityType: string, entityId: string | undefined) {
  const org = useOrganization()
  return useQuery<Attachment[], Error>({
    queryKey: [...featureKey(org.id, 'attachments'), 'entity', entityType, entityId],
    queryFn: () => attachmentsService.forEntity(org.id, entityType, entityId!),
    enabled: !!entityId,
  })
}

export function useUploadAttachment() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<Attachment, Error, { file: File; entityType: string; entityId?: string | null; kind: AttachmentKind; expiresOn?: string | null; notes?: string | null }>({
    mutationFn: ({ file, ...meta }) => attachmentsService.upload(org.id, file, meta),
    onSuccess: () => client.invalidateQueries({ queryKey: featureKey(org.id, 'attachments') }),
  })
}

export function useRemoveAttachment() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, Attachment>({
    mutationFn: (att) => attachmentsService.removeWithFile(att),
    onSuccess: () => client.invalidateQueries({ queryKey: featureKey(org.id, 'attachments') }),
  })
}
