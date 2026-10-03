'use client'

import { BlockStack, Card, Switch } from '@xco-agency/corex-ui'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../hooks'
import { SettingsShell } from '../settings-shell'
import type { NotificationKey, OrgSettings } from '../types'
import { SaveButton, useSettingsSave } from './use-settings-save'

const ITEMS: { key: NotificationKey; label: string; help: string }[] = [
  { key: 'overdue_payments', label: 'Paiements en retard', help: 'Échéances dépassées (clients et fournisseurs).' },
  { key: 'low_stock', label: 'Stock bas', help: 'Matériaux sous leur seuil d’alerte.' },
  { key: 'missing_receipts', label: 'Justificatifs manquants', help: 'Dépenses sans reçu joint.' },
  { key: 'budget_overrun', label: 'Dépassement de budget', help: 'Centres de coûts ou ordres dépassant le budget prévisionnel.' },
]

function Form({ initial }: { initial: OrgSettings }) {
  const { canEdit, saving, save, markDirty, feedback } = useSettingsSave()
  const [values, setValues] = useState(initial.notifications)
  return (
    <BlockStack gap="base">
      {feedback}
      <Card heading="Alertes dans l’application" gap="base">
        {ITEMS.map((i) => (
          <div key={i.key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{i.label}</p>
              <p className="text-sm text-muted-foreground">{i.help}</p>
            </div>
            <Switch
              label={i.label}
              labelAccessibilityVisibility="exclusive"
              checked={values[i.key]}
              disabled={!canEdit}
              onChange={(checked: boolean) => (markDirty(), setValues((p) => ({ ...p, [i.key]: checked })))}
            />
          </div>
        ))}
      </Card>
      <SaveButton canEdit={canEdit} saving={saving} onClick={() => void save({ notifications: values })} />
    </BlockStack>
  )
}

export function NotificationsPage() {
  const { settings, ready } = useSettings()
  return (
    <SettingsShell title="Notifications" icon={Bell} description="Choisissez les alertes affichées dans la cloche et le tableau de bord.">
      {ready ? <Form initial={settings} /> : <p className="text-sm text-muted-foreground">Chargement…</p>}
    </SettingsShell>
  )
}
