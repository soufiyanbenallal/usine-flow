import {
  Home,
  type LucideIcon,
} from 'lucide-react'

export type NavChild = { title: string; path: string; icon?: LucideIcon }
/** A parent page (links to its own list) with related pages nested underneath. */
export type NavItem = { title: string; path: string; icon: LucideIcon; end?: boolean; children?: NavChild[] }

/**
 * UsineFlow Navigation Starter.
 * Additional modules can be enabled per operating mode (Factory, Workshop, Warehouse)
 * as documented in docs/usine-flow-guide.md.
 */
export const mainNav: NavItem[] = [
  { title: 'Tableau de bord', path: '', icon: Home, end: true },
]

/** True when `pathname` (e.g. `/atlas/parametres`) is inside the nav path. */
export function isInside(pathname: string, slug: string, path: string, end = false) {
  const base = path ? `/${slug}/${path}` : `/${slug}`
  return end ? pathname === base : pathname === base || pathname.startsWith(base + '/')
}
