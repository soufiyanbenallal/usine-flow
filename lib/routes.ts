/** Slugs that must never be used as an organization slug (top-level routes). Mirrors `public.is_reserved_slug` in SQL. */
export const RESERVED_SLUGS = [
  'app', 'api', 'admin', 'login', 'signup', 'logout', 'forgot-password', 'reset-password', 'auth',
  'settings', 'parametres', 'dashboard', 'help', 'support', 'pricing', 'blog', 'docs', 'legal',
  'privacy', 'terms', 'static', 'assets', 'public', '_next', 'favicon', 'robots', 'sitemap', 'buildo', 'usineflow', 'usine-flow', 'www',
] as const

/** `/<org-slug>/<path>` — e.g. orgPath('atlas', 'chantiers') → '/atlas/chantiers'. */
export const orgPath = (slug: string, path = '') => (path ? `/${slug}/${path.replace(/^\//, '')}` : `/${slug}`)
