'use client'

import { useState } from 'react'
import { X, CheckCircle2, Calendar, Building2, Mail, User, Phone, ArrowRight, ShieldCheck } from 'lucide-react'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    size: '10-50',
    primaryInterest: 'production',
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const handleReset = () => {
    setSubmitted(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-black/10">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-[#0f7a7c]/10 text-[#0f7a7c]">
              <Calendar className="size-4" />
            </span>
            <span className="text-sm font-semibold text-zinc-900">Demander une démonstration</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#0f7a7c]/10 text-[#0f7a7c] mb-4">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900">Demande confirmée</h3>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              Merci <span className="font-semibold text-zinc-900">{formData.name}</span>. Un spécialiste des opérations industrielles prendra contact avec vous d&apos;ici 2 heures pour organiser votre session personnalisée.
            </p>
            <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-left text-xs text-zinc-600">
              <div className="font-medium text-zinc-900 mb-1">Détails de la session :</div>
              <div>• Entreprise : {formData.company || 'Non renseigné'}</div>
              <div>• Focus : {formData.primaryInterest === 'production' ? 'Production & Nomenclatures (BOM)' : formData.primaryInterest === 'warehouse' ? 'Entrepôt & Stocks (WMS)' : 'Maintenance & Qualité'}</div>
              <div>• Démonstration en direct avec vos cas d&apos;usage réels</div>
            </div>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink py-2.5 text-sm font-medium text-white hover:bg-ink-3 transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <h2 id="demo-modal-title" className="text-lg font-bold text-zinc-900">
                Découvrez UsineFlow en action
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                30 minutes avec un ingénieur d&apos;application pour évaluer l&apos;adéquation avec votre usine ou entrepôt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nom et Prénom *
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 size-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Karim Bennani"
                    className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f7a7c] focus:ring-1 focus:ring-[#0f7a7c] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Entreprise / Usine *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 size-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Atlas Métal Industries"
                    className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f7a7c] focus:ring-1 focus:ring-[#0f7a7c] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Email professionnel *
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 size-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="karim@atlasmetal.ma"
                    className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f7a7c] focus:ring-1 focus:ring-[#0f7a7c] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Téléphone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 size-4 text-zinc-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+212 6 00 00 00 00"
                    className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f7a7c] focus:ring-1 focus:ring-[#0f7a7c] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Taille de l&apos;équipe
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#0f7a7c] focus:ring-1 focus:ring-[#0f7a7c] outline-none"
                >
                  <option value="1-10">1 à 10 personnes (Atelier)</option>
                  <option value="10-50">10 à 50 personnes (PME Usine)</option>
                  <option value="50-200">50 à 200 personnes (Site industriel)</option>
                  <option value="200+">200+ personnes (Multi-sites)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Priorité principale
                </label>
                <select
                  value={formData.primaryInterest}
                  onChange={(e) => setFormData({ ...formData, primaryInterest: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#0f7a7c] focus:ring-1 focus:ring-[#0f7a7c] outline-none"
                >
                  <option value="production">Production & Nomenclatures (BOM)</option>
                  <option value="warehouse">Stocks, Bacs & WMS</option>
                  <option value="quality">Traçabilité & Qualité</option>
                  <option value="maintenance">GMAO & Maintenance machines</option>
                  <option value="all">Opérations complètes</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-ink-3 transition-colors"
              >
                Planifier ma démonstration gratuite
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 pt-1">
              <ShieldCheck className="size-3.5 text-[#0f7a7c]" />
              <span>Données strictement confidentielles • Sans engagement commercial</span>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
