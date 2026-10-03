'use client'

import { Button } from '@xco-agency/corex-ui'
import { CheckCircle2, Circle, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PageShell, Panel } from '@/components/page-shell'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { useOrgPath, useOrganization } from '../organization/context'

type Step = { id: string; title: string; description: string; path: string; table: string; min?: number; filter?: [string, string] }
const STEPS: Step[] = [
  { id: 'sites', title: 'Créer vos sites', description: 'Usine, atelier, entrepôt ou bureau.', path: 'parametres/sites', table: 'sites' },
  { id: 'warehouse', title: 'Configurer l’entrepôt et ses emplacements', description: 'Un entrepôt par défaut existe ; ajoutez zones et emplacements.', path: 'entrepot/emplacements', table: 'locations', min: 2 },
  { id: 'items', title: 'Importer ou créer vos articles', description: 'Matières premières, produits finis, consommables.', path: 'catalogue/articles', table: 'items' },
  { id: 'partners', title: 'Ajouter clients et fournisseurs', description: 'Avec conditions de paiement et limite de crédit.', path: 'catalogue/partenaires', table: 'partners' },
  { id: 'opening', title: 'Charger le stock d’ouverture', description: 'Import de l’inventaire de départ.', path: 'import', table: 'stock_adjustments', filter: ['kind', 'opening'] },
  { id: 'bom', title: 'Définir vos nomenclatures (BOM)', description: 'Composants, rendement et pertes.', path: 'production/nomenclatures', table: 'boms' },
  { id: 'workcenters', title: 'Déclarer vos postes de charge', description: 'Capacité et coûts horaires.', path: 'production/postes', table: 'work_centers' },
  { id: 'assets', title: 'Enregistrer vos équipements', description: 'Pour la maintenance préventive et le TRS.', path: 'maintenance/equipements', table: 'assets' },
  { id: 'employees', title: 'Ajouter vos employés', description: 'Opérateurs, horaires et coûts.', path: 'equipe/employes', table: 'employees' },
  { id: 'approvals', title: 'Définir vos politiques d’approbation', description: 'Seuils et circuits de validation.', path: 'parametres/approbations', table: 'approval_policies' },
]

export function OnboardingPage() {
  const org = useOrganization()
  const href = useOrgPath()
  const progress = useQuery({
    queryKey: ['org', org.id, 'onboarding'],
    queryFn: async () => {
      const db = requireSupabase()
      const entries = await Promise.all(STEPS.map(async (s) => {
        let q = db.from(s.table).select('*', { count: 'exact', head: true }).eq('organization_id', org.id)
        if (s.filter) q = q.eq(s.filter[0], s.filter[1])
        const { count, error } = await q
        if (error) throw toUserError(error)
        return [s.id, (count ?? 0) >= (s.min ?? 1)] as const
      }))
      return Object.fromEntries(entries) as Record<string, boolean>
    },
  })
  const done = STEPS.filter((s) => progress.data?.[s.id]).length
  return (
    <PageShell title="Démarrage" icon={Rocket} description="Les étapes pour mettre UsineFlow en service dans votre organisation." error={progress.error?.message}>
      <Panel title={`Progression : ${done} / ${STEPS.length}`}>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-foreground transition-all" style={{ width: `${(100 * done) / STEPS.length}%` }} /></div>
        <ul className="divide-y">
          {STEPS.map((s) => {
            const ok = progress.data?.[s.id]
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                {ok ? <CheckCircle2 className="size-5 text-green-700" /> : <Circle className="size-5 text-muted-foreground" />}
                <div className="min-w-0 flex-1"><div className="text-sm font-medium">{s.title}</div><div className="text-xs text-muted-foreground">{s.description}</div></div>
                <Link href={href(s.path)}><Button variant={ok ? 'secondary' : 'primary'}>{ok ? 'Revoir' : 'Commencer'}</Button></Link>
              </li>
            )
          })}
        </ul>
      </Panel>
      <Panel title="Mode d’exploitation">
        <p className="text-[13px] text-muted-foreground">Usine, atelier ou entrepôt : activez les modules adaptés à votre activité.</p>
        <div className="mt-3"><Link href={href('parametres/modules')}><Button variant="secondary">Choisir les modules</Button></Link></div>
      </Panel>
    </PageShell>
  )
}
