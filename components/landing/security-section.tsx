'use client'

import {
  ShieldCheck,
  Lock,
  Database,
  History,
  HardDriveDownload,
  KeyRound
} from 'lucide-react'

export function SecuritySection() {
  const cards = [
    {
      title: 'Role-based access',
      desc: 'Permissions granulaires par utilisateur, par site et par type de document pour protéger vos secrets de fabrication.',
      icon: Lock,
    },
    {
      title: 'Multi-tenant isolation',
      desc: 'Cloisonnement strict au niveau de la base de données (Row Level Security - RLS). Aucune fuite possible entre organisations.',
      icon: Database,
    },
    {
      title: 'Audit trails',
      desc: 'Journal d’audit infalsifiable consignant chaque ajustement de stock, déclaration d’atelier ou clôture d’ordre.',
      icon: History,
    },
    {
      title: 'Encrypted storage',
      desc: 'Chiffrement complet en transit (TLS 1.3) et au repos (AES-256) pour tous vos plans techniques et rapports.',
      icon: ShieldCheck,
    },
    {
      title: 'Continuous backups',
      desc: 'Sauvegardes automatisées quotidiennes et archivage géo-redondant avec restauration à la seconde (PITR).',
      icon: HardDriveDownload,
    },
    {
      title: 'Secure authentication',
      desc: 'Sessions chiffrées, gestion des mots de passe avec hachage robuste et protection contre les attaques par force brute.',
      icon: KeyRound,
    },
  ]

  return (
    <section id="security" className="scroll-mt-14 py-24 sm:py-36 bg-zinc-50/30 border-b border-zinc-150/70">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            Sécurité & Données
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-medium tracking-tight text-zinc-950">
            Your operational data stays under control.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-500 font-normal leading-relaxed">
            Vos nomenclatures, coûts de revient et fiches clients sont protégés selon les plus hauts standards de résilience.
          </p>
        </div>

        {/* 6 Compact Cards */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <div
                key={c.title}
                className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-zinc-300 transition-all text-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="size-4 text-[#008060]" />
                  <h3 className="font-semibold text-zinc-900 text-xs">{c.title}</h3>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  {c.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
