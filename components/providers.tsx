'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { useState, type ReactNode } from 'react'
import { OrganizationProvider } from '@/features/organization/context'
import { AuthProvider } from '@/lib/auth'
import { I18nProvider } from '@/lib/i18n'
import { PwaRegister } from './pwa-register'
import { Telemetry } from './telemetry'
import { TooltipProvider } from './ui/tooltip'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }),
  )

  return (
    <NuqsAdapter>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <OrganizationProvider>
                {children}
                <Telemetry />
                <PwaRegister />
              </OrganizationProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </I18nProvider>
    </NuqsAdapter>
  )
}
