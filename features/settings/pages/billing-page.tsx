'use client'

import { Badge, Button, Card, Tabs } from '@xco-agency/corex-ui'
import { CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useOrgPath } from '@/features/organization/context'
import { useOrganizationDetails } from '@/features/organization/hooks'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatMAD } from '@/lib/format'
import { SettingsShell } from '../settings-shell'
import { trialEnd, trialDaysLeft } from '../billing'

const STATUS_TABS = [
  { id: 'all', label: 'Toutes' },
  { id: 'paid', label: 'Payées' },
  { id: 'open', label: 'Ouvertes' },
  { id: 'failed', label: 'Échouées' },
  { id: 'processing', label: 'En cours' },
  { id: 'refunded', label: 'Remboursées' },
  { id: 'canceled', label: 'Annulées' },
]

export function BillingPage() {
  const href = useOrgPath()
  const { data } = useOrganizationDetails()
  const [tab, setTab] = useState('all')
  const start = data?.created_at
  const end = start ? trialEnd(start) : undefined
  const left = end ? trialDaysLeft(end) : undefined

  return (
    <SettingsShell
      title="Plan et facturation"
      icon={CreditCard}
      wide
      actions={
        <Link href={href('parametres')}>
          <Button variant="secondary">Profil de facturation</Button>
        </Link>
      }
    >
      <Card heading="Période de facturation en cours" gap="base">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {formatDate(start)} – {formatDate(end)}
          </span>
          <Badge tone="info">Essai gratuit{left !== undefined ? ` · ${left} j restants` : ''}</Badge>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total en cours</p>
            <p className="text-3xl font-semibold tracking-tight">{formatMAD(0)}</p>
          </div>
          <Button variant="primary" disabled>
            Ajouter un moyen de paiement
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          La facturation n’est pas encore activée : toutes les fonctionnalités de la version 1 restent accessibles.
        </p>
      </Card>

      <Card heading="Factures précédentes" gap="base">
        <Tabs tabs={STATUS_TABS} value={tab} onChange={setTab} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date d’émission</TableHead>
              <TableHead>N° de facture</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Aucune facture pour le moment.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>0 facture</span>
          <span className="flex gap-1">
            <Button variant="tertiary" disabled accessibilityLabel="Page précédente">
              ‹
            </Button>
            <Button variant="tertiary" disabled accessibilityLabel="Page suivante">
              ›
            </Button>
          </span>
        </div>
      </Card>
    </SettingsShell>
  )
}
