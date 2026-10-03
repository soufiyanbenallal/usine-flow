'use client'

import {
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  Factory,
  Layers,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Button } from '@xco-agency/corex-ui'

const YEAR = 2026

const modes: { icon: LucideIcon; title: string; subtitle: string; text: string; badge: string }[] = [
  {
    icon: Factory,
    title: 'Mode Usine',
    subtitle: 'Production & Nomenclatures',
    badge: 'Factory',
    text: 'BOM multi-niveaux, gammes d’opérations, postes de travail, ordres de fabrication (OF) et suivi du TRS en temps réel.',
  },
  {
    icon: Wrench,
    title: 'Mode Atelier',
    subtitle: 'Travaux & Maintenance',
    badge: 'Workshop',
    text: 'Gestion des ordres de travail, consommations de matières, heures d’ouvriers et maintenance préventive/curative.',
  },
  {
    icon: Warehouse,
    title: 'Mode Entrepôt',
    subtitle: 'WMS & Traçabilité',
    badge: 'Warehouse',
    text: 'Grand livre des stocks par emplacements (zones, allées, bacs), réceptions, préparations et expéditions rapides.',
  },
]

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Boxes,
    title: 'Gestion des Nomenclatures (BOM)',
    text: 'Composants, matières premières, sous-ensembles et scrap prévisionnel calculés avec précision.',
  },
  {
    icon: TrendingUp,
    title: 'Suivi de Cadence & TRS',
    text: 'Disponibilité, performance et qualité mesurées pour chaque poste de charge et ligne de production.',
  },
  {
    icon: Package,
    title: 'Grand Livre d’Inventaire',
    text: 'Stock disponible, réservé et en transit avec historique complet de chaque mouvement d’entrée/sortie.',
  },
  {
    icon: Wrench,
    title: 'Maintenance Industrielle (GMAO)',
    text: 'Planification des arrêts machines, fiches d’intervention et suivi des pièces de rechange.',
  },
  {
    icon: ShieldCheck,
    title: 'Traçabilité par Lots & Séries',
    text: 'Traçabilité ascendante et descendante depuis la matière première jusqu’au client final.',
  },
  {
    icon: Layers,
    title: 'Passerelle Comptable & Export',
    text: 'Un ERP opérationnel qui exporte des données financières et de valorisation propres pour votre comptable.',
  },
]

const morocco = [
  'Éligible à l’appui de transformation digitale Maroc PME',
  'Conforme aux normes fiscales marocaines (TVA 20 / 14 / 10 / 7 %, montants en MAD)',
  'Mentions légales obligatoires : ICE, IF, RC, Patente, CNSS sur vos bons',
  'Bons de réception, bons de sortie matière et bons de livraison conformes',
  'Exports compatibles avec les logiciels comptables marocains',
]

const steps = [
  {
    n: '1',
    title: 'Configurez votre structure',
    text: 'Définissez vos sites, usines ou entrepôts et saisissez vos informations légales une seule fois.',
  },
  {
    n: '2',
    title: 'Importez vos articles & nomenclatures',
    text: 'Chargez vos matières premières, composants et gammes de fabrication en quelques clics.',
  },
  {
    n: '3',
    title: 'Pilotez vos opérations en temps réel',
    text: 'Lancez vos ordres de travail, suivez la production sur le terrain et gardez le contrôle des stocks.',
  },
]

const faqs = [
  [
    'UsineFlow remplace-t-il mon logiciel comptable ?',
    'Non. UsineFlow est un ERP Opérationnel (Operations OS), axé sur la production, les stocks, l’atelier et la maintenance. Il produit des états valorisés prêts pour votre expert-comptable.',
  ],
  [
    'Peut-on utiliser UsineFlow uniquement pour un entrepôt ou un atelier ?',
    'Absolument. Grâce à ses trois modes d’exploitation modulaires (Usine, Atelier, Entrepôt), vous n’activez que les écrans dont vous avez besoin.',
  ],
  [
    'L’application fonctionne-t-elle sur tablette ou téléphone d’atelier ?',
    'Oui. L’interface est entièrement responsive, ultra-rapide et pensée pour la saisie directe par les opérateurs et magasiniers.',
  ],
  [
    'Mes données industrielles sont-elles sécurisées ?',
    'Chaque entreprise est isolée au niveau de la base de données avec Row Level Security (RLS) et les accès sont strictement régis par rôles.',
  ],
]

function ProductPreview() {
  const orders = [
    ['OF-2026-0042', 'Tôle Découpée 2mm', 'En cours', 'success', '84 %'],
    ['OF-2026-0043', 'Ensemble Mécano-Soudé', 'En cours', 'success', '52 %'],
    ['OF-2026-0044', 'Profilé Aluminium Anodisé', 'Attente Matière', 'warning', '15 %'],
    ['OF-2026-0045', 'Lot Injection Plastique B-12', 'Planifié', 'info', '0 %'],
  ]

  return (
    <div className="mx-auto mt-14 max-w-5xl rounded-2xl bg-[#1a1a1a] p-2 shadow-2xl ring-1 ring-black/10" aria-hidden>
      <div className="grid grid-cols-[150px_1fr] gap-2 sm:grid-cols-[190px_1fr]">
        <div className="hidden space-y-1 p-3 text-[13px] text-white/70 sm:block">
          <Logo dark className="mb-4 [&>span:first-child]:size-6" />
          {['Tableau de bord', 'Ordres de fabrication', 'Nomenclatures (BOM)', 'Stocks & Bacs', 'Postes de charge', 'Maintenance', 'Qualité'].map((l, i) => (
            <div key={l} className={`rounded-md px-2.5 py-1.5 text-xs ${i === 0 ? 'bg-[#303030] font-medium text-white' : ''}`}>
              {l}
            </div>
          ))}
        </div>
        <div className="col-span-2 rounded-xl bg-white p-4 text-left sm:col-span-1 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold">Ordres de fabrication en cours</span>
            <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-white">Nouveau lot / OF</span>
          </div>
          <div className="mb-4 grid grid-cols-3 divide-x rounded-xl border text-xs">
            {[
              ['Rendement Synthétique (TRS)', '88.4 %'],
              ['Cadence journalière', '1 240 pcs'],
              ['Disponibilité machines', '96.2 %'],
            ].map(([k, v]) => (
              <div key={k} className="p-3">
                <div className="font-semibold text-muted-foreground">{k}</div>
                <div className="mt-1 text-sm font-bold text-foreground">{v}</div>
              </div>
            ))}
          </div>
          <div className="space-y-px text-xs">
            {orders.map(([id, n, s, t, p]) => (
              <div key={id} className="flex items-center gap-3 border-b py-2.5">
                <span className="font-mono text-muted-foreground">{id}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{n}</span>
                <span className={`pill pill-${t}`}>{s}</span>
                <span className="w-10 text-right font-medium tabular-nums">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="UsineFlow">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Principal">
            <a href="#modes" className="hover:text-foreground">Modes opérationnels</a>
            <a href="#fonctionnalites" className="hover:text-foreground">Fonctionnalités</a>
            <a href="#maroc" className="hover:text-foreground">Made for Morocco</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="secondary">Connexion</Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary">Essai gratuit</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-5 pt-20 pb-24 text-center">
          <div aria-hidden className="absolute inset-0 -z-10 [background:radial-gradient(50%_40%_at_50%_0%,#3b82f622,transparent),linear-gradient(#0000000a_1px,transparent_1px)_0_0/100%_48px]" />
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <Sparkles className="size-3.5 text-primary" /> L’OS des Opérations Industrielles au Maroc
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            L’OS industriel pour vos usines, ateliers et entrepôts.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
            Fini la lourdeur des vieux ERP. Pilotez vos ordres de travail, stocks par emplacements, nomenclatures (BOM) et maintenance dans une interface moderne, ultra-réactive et taillée pour le terrain.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button variant="primary">
                Démarrer gratuitement <ArrowRight className="size-4 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Accéder à mon espace</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">14 jours d’essai · Déploiement en 1 après-midi · Sans carte bancaire</p>
          <ProductPreview />
        </section>

        {/* 3 Modes Section */}
        <section id="modes" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Trois modes d’exploitation, un seul socle partagé.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              Un entrepôt n’a pas besoin de voir les écrans d’usinage. Un atelier n’a pas besoin d’un MRP lourd. Activez uniquement les modules pertinents pour votre activité.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {modes.map((m) => (
              <div key={m.title} className="flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-xs transition-all hover:border-foreground/40">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <m.icon className="size-5" />
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{m.title}</h3>
                  <p className="text-xs font-medium text-primary">{m.subtitle}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="fonctionnalites" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">L’essentiel pour piloter l’outil de production.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-background p-7">
                <span className="grid size-10 place-items-center rounded-lg bg-secondary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Made for Morocco Section */}
        <section id="maroc" className="scroll-mt-20 bg-[#1a1a1a] px-5 py-20 text-white">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Conçu pour l’industrie au Maroc.</h2>
              <p className="mt-4 max-w-md text-white/70 leading-relaxed">
                Vos normes fiscales, vos identifiants d’entreprise et vos formats d’échange : UsineFlow s’adapte aux exigences des PME et industriels marocains.
              </p>
            </div>
            <ul className="space-y-3">
              {morocco.map((m) => (
                <li key={m} className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" /> {m}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Steps Section */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight text-center">Déploiement simple et rapide.</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-xl border bg-card p-6">
                <span className="grid size-9 place-items-center rounded-full bg-[#1a1a1a] text-sm font-semibold text-white">{s.n}</span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
          <h2 className="text-3xl font-bold tracking-tight text-center">Questions fréquentes</h2>
          <div className="mt-8 divide-y border-y">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-5 pb-20">
          <div className="mx-auto max-w-5xl rounded-3xl bg-[#1a1a1a] px-6 py-16 text-center text-white">
            <CheckCircle2 className="mx-auto size-8 text-primary" />
            <h2 className="mx-auto mt-5 max-w-xl text-3xl font-bold tracking-tight text-balance">
              Passez à la vitesse supérieure dans vos opérations industrielles.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-white/70">
              Rejoignez les usines et ateliers qui optimisent leur production et leurs stocks avec UsineFlow.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup">
                <Button variant="primary">Créer mon espace gratuit</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {YEAR} UsineFlow — L’OS des Opérations Industrielles.</p>
        </div>
      </footer>
    </div>
  )
}
