"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AssistantPanel } from "@/components/assistant-panel";
import { CommandPaletteProvider } from "@/features/search/command-palette";
import { SettingsPanel } from "@/features/settings/settings-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CreateOrganizationScreen } from "@/features/organization/create-organization-screen";
import { useOrganizationState } from "@/features/organization/context";
import { useAuth } from "@/lib/auth";
import { Transition } from "@xco-agency/corex-ui";
import { cn } from "cn";
import { orgPath } from "@/lib/routes";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { auth, loading } = useAuth();
  const organization = useOrganizationState();
  const router = useRouter();
  const pathname = usePathname();
  const { org: slug } = useParams<{ org: string }>();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // In settings the main nav collapses to its icon rail and the settings panel takes over as second nav.
  const settingsMode = pathname.startsWith(`/${slug}/parametres`);

  useEffect(() => {
    if (loading || (auth && organization === undefined)) return;
    if (!auth) {
      router.replace("/login");
      return;
    }
    // Each user has a single organization: any other slug is rewritten to their own,
    // keeping the sub-page (stale bookmarks, renamed slugs, typos).
    if (organization && organization.slug !== slug) {
      const rest = pathname.split("/").slice(2).join("/");
      router.replace(orgPath(organization.slug, rest));
    }
  }, [loading, auth, organization, slug, pathname, router]);

  if (loading || (auth && organization === undefined))
    return (
      <div className="grid min-h-svh place-items-center bg-[#1a1a1a] text-sm text-white/60">
        Chargement…
      </div>
    );
  if (auth && organization === null) return <CreateOrganizationScreen />;
  if (!auth || organization?.slug !== slug) return null;

  return (
    <TooltipProvider>
      <CommandPaletteProvider>
      <SidebarProvider
        open={sidebarOpen && !settingsMode}
        onOpenChange={(next) => {
          if (!settingsMode) setSidebarOpen(next);
        }}
      >
        <AppSidebar />
        <SettingsPanel open={settingsMode} pathname={pathname} />
        <SidebarInset className="min-w-0 overflow-hidden">
          <div className="relative flex min-h-0 flex-1 flex-col">
            {children}
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className={cn(
                "fixed bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-full border bg-card px-5 py-3 text-sm text-muted-foreground shadow-lg transition-all duration-300 hover:shadow-xl md:flex",
                assistantOpen
                  ? "pointer-events-none opacity-0 translate-y-4 scale-95"
                  : "opacity-100 translate-y-0 scale-100",
              )}
            >
              <Sparkles className="size-4 text-brand" /> Demander à UsineFlow…
            </button>
          </div>
        </SidebarInset>
        <div
          className={cn(
            "hidden h-[calc(100vh-8px)] transition-[width,padding] duration-300 ease-in-out lg:flex overflow-hidden shrink-0",
            assistantOpen ? "w-95 py-1 pr-1" : "w-0 p-0",
          )}
        >
          <Transition
            variant="scale-up"
            reverse
            show={assistantOpen}
            duration={300}
            className="h-full w-95"
          >
            <AssistantPanel onClose={() => setAssistantOpen(false)} />
          </Transition>
        </div>
      </SidebarProvider>
      </CommandPaletteProvider>
    </TooltipProvider>
  );
}
