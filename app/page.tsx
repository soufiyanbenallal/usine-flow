'use client'

import { useState } from 'react'
import { Header } from '@/components/landing/header'
import { Hero } from '@/components/landing/hero'
import { TrustStrip } from '@/components/landing/trust-strip'
import { ProblemSection } from '@/components/landing/problem-section'
import { PlatformOverview } from '@/components/landing/platform-overview'
import { ConnectedOperations } from '@/components/landing/connected-operations'
import { ProductionSection } from '@/components/landing/production-section'
import { Traceability } from '@/components/landing/traceability'
import { Profitability } from '@/components/landing/profitability'
import { RoleExperience } from '@/components/landing/role-experience'
import { MobileOperations } from '@/components/landing/mobile-operations'
import { AISection } from '@/components/landing/ai-section'
import { MoroccoSection } from '@/components/landing/morocco-section'
import { FinalCTA } from '@/components/landing/final-cta'
import { Footer } from '@/components/landing/footer'
import { DemoModal } from '@/components/landing/demo-modal'

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false)

  const handleOpenDemo = () => {
    setDemoModalOpen(true)
  }

  const handleCloseDemo = () => {
    setDemoModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#171918] selection:bg-emerald-100 selection:text-emerald-950 antialiased">
      {/* 1. Header (Sticky with blur backdrop on scroll) */}
      <Header onOpenDemo={handleOpenDemo} />

      <main id="top">
        {/* 2. Hero Section + Hero Dashboard & Floating Cards */}
        <Hero onOpenDemo={handleOpenDemo} />

        {/* 3. Social Proof / Trust Strip */}
        <TrustStrip />

        {/* 4. Problem (The old way vs Connected) */}
        <ProblemSection />

        {/* 5. The Platform (8 modular capabilities) */}
        <PlatformOverview />

        {/* 6. Connected Operations (Pipeline & cross-functional badges) */}
        <ConnectedOperations />

        {/* 7. Factory & Warehouse Split (Production floor board + Live synced WMS) */}
        <ProductionSection />

        {/* 8. Traceability (Supplier lot -> OF -> Finished lot -> Delivery) */}
        <Traceability />

        {/* 9. Management Visibility & Profitability (Actual vs standard cost & KPIs) */}
        <Profitability />

        {/* 10. Built around the work (Owner, Production, Warehouse, Quality, Maintenance, Operator) */}
        <RoleExperience />

        {/* 11. On the Shop Floor (PWA phone mockup & Barcode scanner card) */}
        <MobileOperations />

        {/* 12. Intelligence (Grounded industrial AI insights) */}
        <AISection />

        {/* 13. Morocco & Multi-Site (Casablanca, Fès, Meknès, Tangier live monitor) */}
        <MoroccoSection />

        {/* 14. Final CTA (Start free / Book a demo) */}
        <FinalCTA onOpenDemo={handleOpenDemo} />
      </main>

      {/* 15. Footer */}
      <Footer />

      {/* Interactive Demo Modal */}
      <DemoModal isOpen={demoModalOpen} onClose={handleCloseDemo} />
    </div>
  )
}
