"use client";

import {
  Bell,
  Boxes,
  ChevronDownIcon,
  ChevronUpIcon,
  Compass,
  CornerDownLeft,
  CornerDownLeftIcon,
  CreditCard,
  FileText,
  Globe,
  Home,
  Percent,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Transition } from "@xco-agency/corex-ui";
import { cn } from "cn";
import { useOrgPath } from "../organization/context";
import {
  groupByKind,
  KIND_ORDER,
  searchItems,
  type SearchItem,
  type SearchKind,
} from "./index";
import { useSearchIndex, navigationItems } from "./use-search-index";

type Ctx = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
};

const PaletteContext = createContext<Ctx>({
  open: () => {},
  close: () => {},
  toggle: () => {},
  isOpen: false,
});

export const useCommandPalette = () => useContext(PaletteContext);

export const KIND_LABELS: Record<
  SearchKind,
  { singular: string; plural: string; icon: LucideIcon }
> = {
  Navigation: { singular: "Navigation", plural: "Navigation", icon: Compass },
  Paramètres: {
    singular: "Paramètre",
    plural: "Paramètres",
    icon: SettingsIcon,
  },
};

/** Sleek, minimalist keycap badge matching modern Shopify Spotlight design */
function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-[4px] border border-black/10 bg-[#f4f4f4] px-1.5 text-[11px] font-medium text-neutral-600 shadow-[0_1px_1px_rgba(0,0,0,0.03)] select-none leading-none",
        "dark:border-white/10 dark:bg-white/[0.08] dark:text-neutral-300 dark:shadow-none",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Status pill matching Shopify Polaris design tokens */
function StatusPill({
  status,
  tone = "neutral",
}: {
  status: string;
  tone?: SearchItem["statusTone"];
}) {
  const toneClasses = {
    success:
      "bg-[#affebf] text-[#014b40] dark:bg-[#014b40]/45 dark:text-[#affebf]",
    warning:
      "bg-[#ffd79d] text-[#5e4200] dark:bg-[#5e4200]/45 dark:text-[#ffd79d]",
    critical:
      "bg-[#fed1d7] text-[#8e0b21] dark:bg-[#8e0b21]/45 dark:text-[#fed1d7]",
    info: "bg-[#b4e7ff] text-[#003856] dark:bg-[#003856]/45 dark:text-[#b4e7ff]",
    neutral:
      "bg-[#e3e3e3] text-[#303030] dark:bg-white/12 dark:text-neutral-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold tracking-tight shrink-0 leading-none",
        toneClasses[tone] ?? toneClasses.neutral,
      )}
    >
      {status}
    </span>
  );
}

/** Owns the open state and the ⌘K / Ctrl+K shortcut; uses Transition from corex-ui. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ open, close, toggle, isOpen }),
    [open, close, toggle, isOpen],
  );

  return (
    <PaletteContext value={value}>
      {children}
      <CommandPaletteModal isOpen={isOpen} onClose={close} />
    </PaletteContext>
  );
}

function CommandPaletteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!mounted || (!isOpen && !rendered)) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[8vh] sm:p-4 sm:pt-[10vh]">
      {/* Backdrop overlay */}
      <Transition
        show={isOpen}
        variant="fade"
        duration={180}
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
      >
        <div
          className="absolute inset-0 cursor-pointer"
          onMouseDown={onClose}
        />
      </Transition>

      {/* Modal card dialog: clean, light-themed canvas matching Shopify Spotlight */}
      <Transition
        show={isOpen}
        variant="pop"
        duration={200}
        reverse
        onExited={() => {
          if (!isOpen) setRendered(false);
        }}
        className="relative z-10 w-full max-w-2xl"
      >
        <CommandPaletteContent onClose={onClose} />
      </Transition>
    </div>,
    document.body,
  );
}

function CommandPaletteContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const href = useOrgPath();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchKind | null>(null);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // On-demand search query hook with pagination and zero initial Supabase queries
  const { items, loading, loadingMore, hasMore, loadMore } = useSearchIndex(
    query,
    activeFilter,
  );

  // Filter and group current items
  const results = useMemo(() => {
    if (activeFilter) {
      return items.filter((i) => i.kind === activeFilter);
    }
    return items;
  }, [items, activeFilter]);

  const groups = useMemo(() => groupByKind(results), [results]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Category counts across current search results (matching Screenshot 1: Settings 19, Navigation 1, Products 1)
  const categoryCounts = useMemo(() => {
    if (!query.trim() || activeFilter) return [];
    const map = new Map<SearchKind, number>();
    for (const item of items) {
      map.set(item.kind, (map.get(item.kind) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([kind, count]) => ({
      kind,
      label: KIND_LABELS[kind]?.plural ?? kind,
      count,
    }));
  }, [items, query, activeFilter]);

  // Quick navigation suggestions when nothing is typed and no filter is active (0 DB calls)
  const suggestions = useMemo(() => {
    if (query.trim() || activeFilter) return [];
    return navigationItems.slice(0, 9);
  }, [query, activeFilter]);

  const displayedItems = flat.length > 0 ? flat : suggestions;

  // Infinite scroll: trigger loadMore when user scrolls near the bottom
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
        if (hasMore && !loading && !loadingMore) {
          loadMore();
        }
      }
    },
    [hasMore, loading, loadingMore, loadMore],
  );

  // Scroll active item into view
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, displayedItems]);

  // Reset selected index on filter/query changes
  useEffect(() => {
    setActive(0);
  }, [query, activeFilter]);

  const go = (item: SearchItem | undefined) => {
    if (!item) return;
    onClose();
    router.push(href(item.path));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "Backspace" && !query && activeFilter) {
      e.preventDefault();
      setActiveFilter(null);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, displayedItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(displayedItems[active]);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white text-[#1a1a1a] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-[#1c1c1c] dark:text-[#f3f3f3]"
    >
      {/* Search Header Bar (Light, Minimalist, matching Screenshots 1, 2 & 3) */}
      <div className="relative flex items-center gap-2.5 border-b border-black/[0.07] px-4 py-3 dark:border-white/[0.08]">
        <Search
          className="size-4.5 text-neutral-400 dark:text-neutral-500 shrink-0"
          aria-hidden
        />

        {/* Active Filter Chip inside the input (matching Screenshot 2: [Apps ✕], Screenshot 3: [Products ✕]) */}
        {activeFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800 transition-all dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 shrink-0">
            <span>{KIND_LABELS[activeFilter]?.plural ?? activeFilter}</span>
            <button
              type="button"
              onClick={() => {
                setActiveFilter(null);
                inputRef.current?.focus();
              }}
              title="Supprimer le filtre"
              className="rounded p-0.5 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <X className="size-3 text-neutral-500 hover:text-neutral-900 dark:hover:text-white" />
            </button>
          </span>
        )}

        {/* Search Input Field */}
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            activeFilter
              ? `Rechercher dans ${KIND_LABELS[activeFilter]?.plural.toLowerCase()}…`
              : "Rechercher..."
          }
          aria-label="Rechercher"
          role="combobox"
          aria-expanded
          aria-controls="palette-results"
          className="h-8 flex-1 bg-transparent text-[14px] text-[#1a1a1a] outline-none placeholder:text-neutral-400 dark:text-[#f3f3f3] dark:placeholder:text-neutral-500"
        />

        {/* Clear query button when text is typed */}
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            title="Effacer la recherche"
            className="flex size-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}

        {/* Filter Sliders Toggle Button on the far right */}
        <button
          type="button"
          onClick={() => setShowFilterPicker((prev) => !prev)}
          title="Filtrer par catégorie"
          aria-label="Filtrer par catégorie"
          className={cn(
            "flex size-7.5 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer",
            showFilterPicker || activeFilter
              ? "border-neutral-300 bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              : "border-transparent text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
        </button>
      </div>

      {/* Category Filter Pills Row (matching Screenshot 1: Settings 19, Navigation 1, Products 1) */}
      {query.trim().length > 0 &&
        categoryCounts.length > 1 &&
        !activeFilter && (
          <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-[#fafafa] px-3.5 py-2 overflow-x-auto dark:border-white/[0.06] dark:bg-[#181818]">
            {categoryCounts.map((cat) => (
              <button
                key={cat.kind}
                type="button"
                onClick={() => setActiveFilter(cat.kind)}
                className="flex items-center gap-1.5 rounded-lg bg-[#f1f1f1] px-2.5 py-1 text-xs font-medium text-[#303030] hover:bg-[#e8e8e8] transition-colors cursor-pointer shrink-0 dark:bg-white/[0.08] dark:text-neutral-200 dark:hover:bg-white/12"
              >
                <span>{cat.label}</span>
                <span className="text-[11px] opacity-65 font-normal">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        )}

      {/* Full Category Filter Drawer (when SlidersHorizontal button is clicked) */}
      {showFilterPicker && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-black/[0.06] bg-[#fafafa] px-4 py-2.5 dark:border-white/[0.06] dark:bg-[#181818] animate-in slide-in-from-top-1 duration-150">
          <span className="text-[11px] font-medium text-neutral-500 mr-1 dark:text-neutral-400">
            Filtrer par :
          </span>
          <button
            type="button"
            onClick={() => {
              setActiveFilter(null);
              setShowFilterPicker(false);
              inputRef.current?.focus();
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              activeFilter === null
                ? "bg-[#e3e3e3] text-[#303030] dark:bg-white/15 dark:text-white"
                : "text-[#616161] hover:bg-[#f1f1f1] dark:text-[#999999] dark:hover:bg-white/[0.05]",
            )}
          >
            Tous
          </button>
          {KIND_ORDER.map((kind) => {
            const meta = KIND_LABELS[kind];
            const isSelected = activeFilter === kind;
            const Icon = meta?.icon ?? Compass;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setActiveFilter(isSelected ? null : kind);
                  setShowFilterPicker(false);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[#e3e3e3] text-[#303030] dark:bg-white/15 dark:text-white"
                    : "text-[#616161] hover:bg-[#f1f1f1] dark:text-[#999999] dark:hover:bg-white/[0.05]",
                )}
              >
                <Icon className="size-3 text-neutral-500 dark:text-neutral-400" />
                <span>{meta?.plural ?? kind}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Results / Suggestions Body */}
      <div
        ref={listRef}
        id="palette-results"
        role="listbox"
        onScroll={handleScroll}
        className="max-h-[52vh] min-h-[160px] overflow-y-auto p-2"
      >
        {/* Loading state matching screenshot: "Searching your store..." */}
        {loading && flat.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 select-none">
            <span className="text-sm font-normal text-neutral-400 dark:text-neutral-500 animate-pulse">
              Recherche dans votre espace…
            </span>
          </div>
        )}

        {/* Empty query & No filter: show quick suggestions */}
        {!query.trim() && !activeFilter && !loading && (
          <div className="space-y-3 pb-1">
            <div className="px-3 pt-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between dark:text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-amber-500" />
                Accès rapide & Navigation
              </span>
              <span className="text-[10px] text-neutral-400 font-normal dark:text-neutral-500">
                Suggestions
              </span>
            </div>
            <div className="space-y-0.5">
              {suggestions.map((item, idx) => {
                const selected = idx === active;
                const Icon =
                  item.icon ?? KIND_LABELS[item.kind]?.icon ?? Compass;
                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => go(item)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-75 select-none",
                      selected
                        ? "bg-[#f1f1f1] text-[#1a1a1a] dark:bg-white/[0.08] dark:text-white"
                        : "text-[#1a1a1a] hover:bg-[#f7f7f7] dark:text-[#f3f3f3] dark:hover:bg-white/[0.04]",
                    )}
                  >
                    {/* Item-specific icon */}
                    <Icon className="size-4.5 text-neutral-500 shrink-0 dark:text-neutral-400" />

                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[13.5px] text-[#202223] dark:text-[#f3f3f3] truncate">
                        {item.label}
                      </div>
                      {item.hint && (
                        <div className="text-xs text-[#616161] truncate font-normal mt-0.5 dark:text-[#999999]">
                          {item.hint}
                        </div>
                      )}
                    </div>

                    <CornerDownLeft
                      className={cn(
                        "size-3.5 shrink-0 text-neutral-400 transition-opacity",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results grouped by category */}
        {flat.length > 0 &&
          groups.map((group) => {
            const meta = KIND_LABELS[group.kind];
            return (
              <div key={group.kind} className="pb-3 last:pb-1">
                {/* Header (e.g. Navigation (1), Paramètres (6)) */}
                <div className="px-3.5 py-1 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase flex items-center justify-between dark:text-neutral-400">
                  <span>
                    {meta?.plural ?? group.kind} ({group.items.length})
                  </span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {group.items.map((item) => {
                    const idx = flat.indexOf(item);
                    const selected = idx === active;
                    const Icon = item.icon ?? meta?.icon ?? Compass;
                    return (
                      <div
                        key={item.id}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => go(item)}
                        className={cn(
                          "group flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-75 select-none",
                          selected
                            ? "bg-[#f1f1f1] text-[#1a1a1a] dark:bg-white/[0.08] dark:text-white"
                            : "text-[#1a1a1a] hover:bg-[#f7f7f7] dark:text-[#f3f3f3] dark:hover:bg-white/[0.04]",
                        )}
                      >
                        {/* Outlined, minimalist icon */}
                        <Icon className="size-4.5 text-neutral-500 shrink-0 dark:text-neutral-400" />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[13.5px] text-[#202223] dark:text-[#f3f3f3] truncate">
                              {item.label}
                            </span>
                            {item.status && (
                              <StatusPill
                                status={item.status}
                                tone={item.statusTone}
                              />
                            )}
                          </div>
                          {item.hint && (
                            <div className="text-xs text-[#616161] truncate font-normal mt-0.5 dark:text-[#999999]">
                              {item.hint}
                            </div>
                          )}
                        </div>

                        {item.metric && (
                          <span className="shrink-0 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            {item.metric}
                          </span>
                        )}

                        <CornerDownLeft
                          className={cn(
                            "size-3.5 shrink-0 text-neutral-400 transition-opacity",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {/* Load more spinner on scroll */}
        {loadingMore && (
          <div className="flex items-center justify-center py-3 text-xs text-neutral-400">
            <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent mr-2" />
            <span>Chargement…</span>
          </div>
        )}

        {/* Empty state: No results found */}
        {query.trim() && !loading && flat.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-2 dark:bg-white/[0.06]">
              <Search className="size-5" />
            </div>
            <p className="text-sm font-medium text-[#1a1a1a] dark:text-[#f3f3f3]">
              Aucun résultat pour « {query.trim()} »
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {activeFilter
                ? "Essayez de retirer le filtre de catégorie ou d’élargir vos termes de recherche."
                : "Vérifiez l’orthographe ou effectuez une recherche plus générale."}
            </p>
            {activeFilter && (
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="mt-3 text-xs text-neutral-700 font-medium hover:underline cursor-pointer dark:text-neutral-200"
              >
                Supprimer le filtre {KIND_LABELS[activeFilter]?.singular}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Bar (matching Screenshot 1: Open ↵) */}
      <div className="flex items-center justify-between border-t border-black/[0.07] bg-[#fafafa] px-4 py-2.5 text-xs text-neutral-500 dark:border-white/[0.08] dark:bg-[#181818] dark:text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Kbd className="p-1">
              <ChevronUpIcon className="size-3" />
            </Kbd>
            <Kbd className="p-1">
              <ChevronDownIcon className="size-3" />
            </Kbd>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 ml-1">
              Naviguer
            </span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Kbd>esc</Kbd>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 ml-1">
              Fermer
            </span>
          </span>
          {activeFilter && (
            <span className="hidden md:inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
              <Kbd>⌫</Kbd>
              <span className="text-[11px] ml-1">Retirer filtre</span>
            </span>
          )}
        </div>

        {/* Right side: Ouvrir ↵ */}
        <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-200">
          <span className="text-[11.5px]">Ouvrir</span>
          <Kbd>
            <CornerDownLeftIcon className="size-3" />
          </Kbd>
        </div>
      </div>
    </div>
  );
}
