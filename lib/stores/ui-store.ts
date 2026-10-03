import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  sidebarCollapsed: boolean
  paletteOpen: boolean
  density: 'comfortable' | 'compact'
  collapsedGroups: Record<string, boolean>
  toggleSidebar: () => void
  setPaletteOpen: (open: boolean) => void
  setDensity: (d: 'comfortable' | 'compact') => void
  toggleGroup: (group: string) => void
}

/** Purely client-side UI state (server state lives in TanStack Query, URL state in nuqs). */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      paletteOpen: false,
      density: 'comfortable',
      collapsedGroups: {},
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setDensity: (density) => set({ density }),
      toggleGroup: (group) => set((s) => ({ collapsedGroups: { ...s.collapsedGroups, [group]: !s.collapsedGroups[group] } })),
    }),
    { name: 'usineflow.ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, density: s.density, collapsedGroups: s.collapsedGroups }) },
  ),
)
