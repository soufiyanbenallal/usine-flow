'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Bell,
  Building2,
  CreditCard,
  Globe,
  Home,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import type { SearchItem, SearchKind } from './index'
import { searchItems } from './index'
import { useOrganizationState } from '../organization/context'
import { DATA_TABLE_CONFIGS, searchAllTables, searchSingleTable } from './search-api'

/** Main application navigation entries with dedicated icons and rich search metadata */
const navigationItems: SearchItem[] = [
  {
    id: 'nav:dashboard',
    kind: 'Navigation',
    label: 'Tableau de bord',
    hint: "Vue d'ensemble des opérations industrielles, cadence et TRS",
    keywords: 'accueil stats kpi métriques chiffres indicateurs synthèse production atelier usine',
    icon: Home,
    path: '',
  },
]

/** Settings configuration pages with specific icons and search keywords */
const settingsItems: SearchItem[] = [
  {
    id: 'settings:general',
    kind: 'Paramètres',
    label: 'Entreprise',
    hint: 'Raison sociale, identifiants légaux (ICE, RC, Patente), adresse et logo',
    keywords: 'ice rc patente cnss adresse logo raison sociale profil organisation usine société',
    icon: Building2,
    path: 'parametres',
  },
  {
    id: 'settings:utilisateurs',
    kind: 'Paramètres',
    label: 'Utilisateurs & Équipe',
    hint: 'Gestion des membres, invitations, rôles (admin, responsable de site, opérateur)',
    keywords: 'membres invitations roles permissions acces equipe collegues operateurs',
    icon: Users,
    path: 'parametres/utilisateurs',
  },
  {
    id: 'settings:preferences',
    kind: 'Paramètres',
    label: 'Préférences générales',
    hint: 'Numérotation des documents, préfixe de commande, paramètres par défaut',
    keywords: 'bon de commande prefixe reference numerotation format reglages',
    icon: SlidersHorizontal,
    path: 'parametres/preferences',
  },
  {
    id: 'settings:taxes',
    kind: 'Paramètres',
    label: 'Taxes et TVA',
    hint: 'Taux de TVA applicables (20%, 14%, 10%, 7%), exonérations et mentions fiscales',
    keywords: 'tva taxes taux 20% fiscalite exoneration impots maroc',
    icon: Percent,
    path: 'parametres/taxes',
  },
  {
    id: 'settings:notifications',
    kind: 'Paramètres',
    label: 'Notifications',
    hint: 'Alertes par email et push pour ordres en retard, stocks bas et maintenance',
    keywords: 'alertes notifications email push retards depassement stock maintenance',
    icon: Bell,
    path: 'parametres/notifications',
  },
  {
    id: 'settings:region',
    kind: 'Paramètres',
    label: 'Langue et région',
    hint: 'Devise par défaut (MAD), format des nombres, dates et fuseau horaire',
    keywords: 'devise mad dirham maroc fuseau horaire langue fr',
    icon: Globe,
    path: 'parametres/region',
  },
  {
    id: 'settings:facturation',
    kind: 'Paramètres',
    label: 'Plan et facturation',
    hint: 'Formule d’abonnement UsineFlow, méthode de paiement et factures de service',
    keywords: 'abonnement factures paiement cb formule plan tarif',
    icon: CreditCard,
    path: 'parametres/facturation',
  },
  {
    id: 'settings:securite',
    kind: 'Paramètres',
    label: 'Sécurité du compte',
    hint: 'Mot de passe, authentification à deux facteurs et sessions actives',
    keywords: 'mot de passe securite session 2fa double facteur protection',
    icon: ShieldCheck,
    path: 'parametres/securite',
  },
]

export { navigationItems, settingsItems }

export function useSearchIndex(query: string, activeFilter: SearchKind | null) {
  const org = useOrganizationState()
  const orgId = org?.id

  const staticItems = useMemo(() => [...navigationItems, ...settingsItems], [])

  const localMatches = useMemo(() => {
    if (activeFilter === 'Navigation') {
      return query.trim() ? searchItems(navigationItems, query, 30) : navigationItems
    }
    if (activeFilter === 'Paramètres') {
      return query.trim() ? searchItems(settingsItems, query, 30) : settingsItems
    }
    if (activeFilter !== null) {
      return []
    }
    return query.trim() ? searchItems(staticItems, query, 20) : []
  }, [query, activeFilter, staticItems])

  const [dbItems, setDbItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!orgId || activeFilter === 'Navigation' || activeFilter === 'Paramètres') {
      setDbItems([])
      setLoading(false)
      setHasMore(false)
      setOffset(0)
      return
    }

    if (!query.trim() && !activeFilter) {
      setDbItems([])
      setLoading(false)
      setHasMore(false)
      setOffset(0)
      return
    }

    const currentReq = ++requestIdRef.current
    setLoading(true)

    const delay = query.trim() ? 200 : 0
    const timer = setTimeout(async () => {
      try {
        if (activeFilter && DATA_TABLE_CONFIGS[activeFilter]) {
          const result = await searchSingleTable(
            DATA_TABLE_CONFIGS[activeFilter]!,
            orgId,
            query,
            20,
            0,
          )
          if (requestIdRef.current === currentReq) {
            setDbItems(result.items)
            setHasMore(result.hasMore)
            setOffset(0)
          }
        } else if (!activeFilter && query.trim()) {
          const result = await searchAllTables(orgId, query, 5, 0)
          if (requestIdRef.current === currentReq) {
            setDbItems(result.items)
            setHasMore(result.hasMore)
            setOffset(0)
          }
        }
      } catch (err) {
        console.warn('[useSearchIndex] Search failed:', err)
        if (requestIdRef.current === currentReq) {
          setDbItems([])
          setHasMore(false)
        }
      } finally {
        if (requestIdRef.current === currentReq) {
          setLoading(false)
        }
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [query, activeFilter, orgId])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore || !orgId) return

    const isSingleTable = activeFilter && DATA_TABLE_CONFIGS[activeFilter]
    const pageSize = isSingleTable ? 20 : 5
    const nextOffset = offset + pageSize

    setLoadingMore(true)
    try {
      if (isSingleTable) {
        const result = await searchSingleTable(
          DATA_TABLE_CONFIGS[activeFilter]!,
          orgId,
          query,
          20,
          nextOffset,
        )
        setDbItems((prev) => [...prev, ...result.items])
        setHasMore(result.hasMore)
        setOffset(nextOffset)
      } else if (!activeFilter && query.trim()) {
        const result = await searchAllTables(orgId, query, 5, nextOffset)
        setDbItems((prev) => [...prev, ...result.items])
        setHasMore(result.hasMore)
        setOffset(nextOffset)
      }
    } catch (err) {
      console.warn('[useSearchIndex] Load more failed:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loading, loadingMore, orgId, activeFilter, query, offset])

  const items = useMemo(() => {
    return [...localMatches, ...dbItems]
  }, [localMatches, dbItems])

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  }
}
