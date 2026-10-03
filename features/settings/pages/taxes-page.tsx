'use client'

import { BlockStack, Card, Select } from '@xco-agency/corex-ui'
import { Percent } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../hooks'
import { SettingsShell } from '../settings-shell'
import { VAT_RATES, type OrgSettings } from '../types'
import { SaveButton, useSettingsSave } from './use-settings-save'

const options = VAT_RATES.map((r) => ({ value: String(r), label: `${r} %` }))

function Form({ initial }: { initial: OrgSettings }) {
  const { canEdit, saving, save, markDirty, feedback } = useSettingsSave()
  const [vat, setVat] = useState(String(initial.vat_default))
  return (
    <BlockStack gap="base">
      {feedback}
      <Card heading="TVA par défaut" gap="base">
        <Select
          label="Taux appliqué aux nouveaux bons de commande"
          value={vat}
          options={options}
          onChange={(v) => (markDirty(), setVat(v))}
          disabled={!canEdit}
        />
        <p className="text-sm text-muted-foreground">
          Taux marocains en vigueur : 20 % (normal), 14 % (transport, énergie), 10 % (restauration, hôtellerie), 7 % (eau,
          produits de base) et 0 % (exonéré). Chaque bon de commande peut utiliser un taux différent.
        </p>
      </Card>
      <SaveButton canEdit={canEdit} saving={saving} onClick={() => void save({ vat_default: Number(vat) })} />
    </BlockStack>
  )
}

export function TaxesPage() {
  const { settings, ready } = useSettings()
  return (
    <SettingsShell title="Taxes et TVA" icon={Percent}>
      {ready ? <Form initial={settings} /> : <p className="text-sm text-muted-foreground">Chargement…</p>}
    </SettingsShell>
  )
}
