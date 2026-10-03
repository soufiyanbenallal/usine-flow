'use client'

import { BlockStack, Card, NumberField, TextField } from '@xco-agency/corex-ui'
import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../hooks'
import { SettingsShell } from '../settings-shell'
import type { OrgSettings } from '../types'
import { SaveButton, useSettingsSave } from './use-settings-save'

function Form({ initial }: { initial: OrgSettings }) {
  const { canEdit, saving, save, markDirty, feedback } = useSettingsSave()
  const [prefix, setPrefix] = useState(initial.po_prefix)
  const [retention, setRetention] = useState(String(initial.retention_default))
  const [errors, setErrors] = useState<{ prefix?: string; retention?: string }>({})

  const submit = () => {
    const ret = Number(retention)
    const next = {
      prefix: /^[A-Za-z0-9]{1,8}$/.test(prefix) ? undefined : '1 à 8 lettres ou chiffres.',
      retention: Number.isFinite(ret) && ret >= 0 && ret <= 100 ? undefined : 'Entre 0 et 100 %.',
    }
    setErrors(next)
    if (next.prefix || next.retention) return
    void save({ po_prefix: prefix.toUpperCase(), retention_default: ret })
  }

  return (
    <BlockStack gap="base">
      {feedback}
      <Card heading="Achats" gap="base">
        <TextField
          label="Préfixe des bons de commande"
          value={prefix}
          onChange={(v) => (markDirty(), setPrefix(v))}
          error={errors.prefix}
          helpText={`Exemple : ${(prefix || 'BC').toUpperCase()}-2026-0001`}
          disabled={!canEdit}
        />
      </Card>
      <Card heading="Sous-traitance" gap="base">
        <NumberField
          label="Retenue de garantie par défaut (%)"
          value={retention}
          onChange={(v) => (markDirty(), setRetention(v))}
          error={errors.retention}
          helpText="Proposée à la création d’un nouveau sous-traitant."
          disabled={!canEdit}
        />
      </Card>
      <SaveButton canEdit={canEdit} saving={saving} onClick={submit} />
    </BlockStack>
  )
}

export function PreferencesPage() {
  const { settings, ready } = useSettings()
  return (
    <SettingsShell title="Préférences" icon={SlidersHorizontal} description="Valeurs proposées par défaut dans vos formulaires.">
      {ready ? <Form initial={settings} /> : <p className="text-sm text-muted-foreground">Chargement…</p>}
    </SettingsShell>
  )
}
