'use client'

import { useState } from 'react'
import { MotionConfig } from 'motion/react'
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

/*
 * Bands alternate in pairs so the page reads as one rhythm:
 * dark (hero) → light (problem, platform) → dark (flow, floor) → light (trace, cost)
 * → dark (teams, mobile) → light (AI, Morocco) → dark (CTA, footer).
 */
export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const openDemo = () => setDemoOpen(true)

  return (
    <MotionConfig reducedMotion="user">
      <div className="lp-root min-h-screen bg-ink antialiased selection:bg-flow-blue/25">
        <Header onOpenDemo={openDemo} />

        <main>
          <Hero onOpenDemo={openDemo} />
          <TrustStrip />

          <ProblemSection />
          <PlatformOverview />

          <ConnectedOperations />
          <ProductionSection />

          <Traceability />
          <Profitability />

          <RoleExperience />
          <MobileOperations />

          <AISection />
          <MoroccoSection />

          <FinalCTA onOpenDemo={openDemo} />
        </main>

        <Footer />
        <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
      </div>
    </MotionConfig>
  )
}
