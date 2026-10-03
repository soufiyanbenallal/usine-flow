'use client'

import { BlockStack, Card, Select, TextField } from '@xco-agency/corex-ui'
import { Globe } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../hooks'
import { SettingsShell } from '../settings-shell'
import type { OrgSettings } from '../types'
import { SaveButton, useSettingsSave } from './use-settings-save'

const LOCALES = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية (bientôt)' },
  { value: 'en', label: 'English (bientôt)' },
]

function Form({ initial }: { initial: OrgSettings }) {
  const { canEdit, saving, save, markDirty, feedback } = useSettingsSave()
  const [locale, setLocale] = useState<string>(initial.locale)
  return (
    <BlockStack gap="base">
      {feedback}
      <Card heading="Langue" gap="base">
        <Select
          label="Langue de l’interface"
          value={locale}
          options={LOCALES}
          onChange={(v) => (markDirty(), setLocale(v))}
          disabled={!canEdit}
          helpText="Le français est la seule langue disponible pour le moment."
        />
      </Card>
      <Card heading="Région" gap="base">
        <TextField label="Devise" value="Dirham marocain (MAD)" disabled onChange={() => {}} />
        <TextField label="Fuseau horaire" value="Africa/Casablanca" disabled onChange={() => {}} />
      </Card>
      <SaveButton canEdit={canEdit} saving={saving} onClick={() => void save({ locale: locale as OrgSettings['locale'] })} />
    </BlockStack>
  )
}

export function RegionPage() {
  const { settings, ready } = useSettings()
  return (
    <SettingsShell title="Langue et région" icon={Globe}>
      {ready ? <Form initial={settings} /> : <p className="text-sm text-muted-foreground">Chargement…</p>}
    </SettingsShell>
  )
}
