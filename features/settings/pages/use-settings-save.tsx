'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { useState } from 'react'
import { useOrganization } from '@/features/organization/context'
import { ADMIN_ROLES } from '@/features/organization/types'
import { useUpdateSettings } from '../hooks'
import type { OrgSettings } from '../types'

/** Shared save behaviour of the settings pages that persist into `organizations.settings`. */
export function useSettingsSave() {
  const org = useOrganization()
  const update = useUpdateSettings()
  const [saved, setSaved] = useState(false)
  const canEdit = ADMIN_ROLES.includes(org.role)
  return {
    canEdit,
    saving: update.isPending,
    markDirty: () => setSaved(false),
    save: async (patch: Partial<OrgSettings>) => {
      try {
        await update.mutateAsync(patch)
        setSaved(true)
      } catch {
        /* surfaced by <SaveFeedback> */
      }
    },
    feedback: (
      <>
        {!canEdit && <Banner tone="info">Seuls les propriétaires et administrateurs peuvent modifier ces paramètres.</Banner>}
        {update.error && <Banner tone="critical">{update.error.message}</Banner>}
        {saved && <Banner tone="success">Modifications enregistrées.</Banner>}
      </>
    ),
  }
}

export function SaveButton({ canEdit, saving, onClick }: { canEdit: boolean; saving: boolean; onClick: () => void }) {
  if (!canEdit) return null
  return (
    <div>
      <Button variant="primary" loading={saving} onClick={onClick}>
        Enregistrer
      </Button>
    </div>
  )
}
