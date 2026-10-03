'use client'

import {
  Factory,
  Layers,
  Package,
  Settings,
  Sliders,
  Wrench,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { Banner, Button } from '@xco-agency/corex-ui'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/page-header'
import { StatStrip } from '@/components/stat-strip'
import { useWeeklyCadence } from '@/features/dashboard/hooks'
import { defaultOperationalStats } from '@/features/dashboard/metrics'
import { useOrganization, useOrgPath } from '@/features/organization/context'
import { useAuth } from '@/lib/auth'

const legendText = (v: string) => <span style={{ color: '#303030' }}>{v}</span>
const axis = { fontSize: 12, fill: '#6b6b6b' }

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const { auth } = useAuth()
  const organization = useOrganization()
  const href = useOrgPath()
  const cadence = useWeeklyCadence()
  const stats = defaultOperationalStats()

  const first = auth?.user.fullName.split(' ')[0] ?? 'Gestionnaire'
  const weeklyData = cadence.data ?? []

  return (
    <>
      <PageHeader title="Tableau de bord industriel" icon={Factory}>
        <Link href={href('parametres')}>
          <Button variant="secondary">
            <span className="inline-flex items-center gap-1.5">
              <Settings className="size-3.5" /> Paramètres
            </span>
          </Button>
        </Link>
        <Link href={href('parametres/preferences')}>
          <Button variant="primary">
            <span className="inline-flex items-center gap-1.5">
              <Sliders className="size-3.5" /> Configurer l’usine
            </span>
          </Button>
        </Link>
      </PageHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-24 sm:px-5">
        <p className="text-[13px] text-muted-foreground">
          Bonjour {first}, voici la vue d’ensemble de votre système d’exploitation industriel pour{' '}
          <strong className="text-foreground">{organization.name}</strong>.
        </p>

        <StatStrip
          stats={[
            {
              label: 'Sites & installations',
              value: String(stats.activeFacilities),
              hint: 'Opérationnel',
            },
            {
              label: 'Ordres de fabrication (OF)',
              value: String(stats.activeWorkOrders),
              hint: 'Prêt pour lancement',
            },
            {
              label: 'Taux de Rendement (TRS)',
              value: `${stats.oeePercent} %`,
              hint: 'Objectif : 85 %',
            },
            {
              label: 'Alertes actives',
              value: String(stats.activeAlerts),
              hint: 'Aucune anomalie',
            },
          ]}
        />

        {/* Operating Modes Cards as outlined in usine-flow-guide.md */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 transition-all hover:border-foreground/30">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Factory className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Mode Usine</h3>
                <p className="text-xs text-muted-foreground">Production & Nomenclatures</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Gestion des BOM multi-niveaux, gammes d’opérations, postes de charge et suivi de cadence d’atelier.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 transition-all hover:border-foreground/30">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Wrench className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Mode Atelier</h3>
                <p className="text-xs text-muted-foreground">Travaux & Maintenance</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Ordres de travaux sur mesure, suivi de la main-d’œuvre, maintenance préventive et fiches d’intervention.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 transition-all hover:border-foreground/30">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Package className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Mode Entrepôt</h3>
                <p className="text-xs text-muted-foreground">WMS & Stock Ledger</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Grand livre des stocks, gestion multi-zones, adressage des bacs, réceptions et préparation d’expédition.
            </p>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Cadence de production hebdomadaire (Unités produites vs Objectif)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#ebebeb" />
                  <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f7f7f7' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                  <Bar dataKey="production" name="Produit" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Objectif" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="État du système et initialisation">
            <div className="flex h-64 flex-col justify-between rounded-lg border border-dashed p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  Espace de travail opérationnel
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  L’environnement UsineFlow est initialisé. Vous pouvez configurer les identifiants légaux marocains (ICE, IF, RC, CNSS), inviter des collaborateurs et définir vos unités de mesure dans les paramètres.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs">
                <span className="font-semibold text-foreground">Prochaine étape :</span>{' '}
                <span className="text-muted-foreground">
                  Création du catalogue d’articles (Matières premières, Composants, Produits finis) et définition des centres de charge.
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
