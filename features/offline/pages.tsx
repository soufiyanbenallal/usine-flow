'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { CloudOff } from 'lucide-react'
import { useState } from 'react'
import { PageShell, Panel } from '@/components/page-shell'
import { Pill } from '../_core/pill'
import { formatDateTime } from '@/lib/format'
import { useAutoSync } from './hooks'
import { removeOp } from './queue'

const TYPE_LABEL: Record<string, string> = { count_line: 'Comptage', pick_confirm: 'Préparation', task_complete: 'Tâche d’entrepôt', production_report: 'Déclaration de production', breakdown: 'Panne' }

export function OfflinePage() {
  const { online, ops, sync, syncing } = useAutoSync()
  const [result, setResult] = useState<string | null>(null)
  const run = async () => {
    const r = await sync()
    setResult(`${r.applied} appliquée(s), ${r.rejected} rejetée(s), ${r.remaining} restante(s).`)
  }
  return (
    <PageShell title="Mode hors-ligne" icon={CloudOff} description="Les comptages, préparations, tâches et déclarations saisis sans connexion sont mis en file d’attente sur cet appareil, puis synchronisés sans doublon."
      actions={<Button variant="primary" loading={syncing} disabled={!online || ops.length === 0} onClick={() => void run()}>Synchroniser maintenant</Button>}>
      <Banner tone={online ? 'success' : 'warning'}>{online ? 'Connexion active.' : 'Vous êtes hors ligne : vos saisies sont enregistrées localement.'}</Banner>
      {result && <Banner tone="info">{result}</Banner>}
      <Panel title={`File d’attente (${ops.length})`}>
        <ul className="divide-y text-[13px]">
          {ops.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
              <Pill tone={o.status === 'rejected' ? 'critical' : 'warning'}>{o.status === 'rejected' ? 'Rejetée' : 'En attente'}</Pill>
              <span className="font-medium">{TYPE_LABEL[o.type] ?? o.type}</span><span className="text-muted-foreground">{o.label}</span>
              <span className="text-muted-foreground">{formatDateTime(o.createdAt)}</span>
              {o.error && <span className="text-red-700">{o.error}</span>}
              <span className="ml-auto"><Button variant="secondary" onClick={() => void removeOp(o.id)}>Abandonner</Button></span>
            </li>
          ))}
        </ul>
        {ops.length === 0 && <p className="text-[13px] text-muted-foreground">Rien en attente.</p>}
      </Panel>
    </PageShell>
  )
}
