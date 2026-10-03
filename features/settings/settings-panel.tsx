"use client";

import { ChevronLeft, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "cn";
import { useOrganization, useOrgPath } from "../organization/context";
import { ROLE_LABELS } from "../organization/types";
import { useAuth } from "@/lib/auth";
import { filterSettingsNav, isSettingsItemActive } from "./nav";

const initials = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** Second navigation (Shopify-style): slides in next to the collapsed main rail while on /parametres/*. */
export function SettingsPanel({
  open,
  pathname,
}: {
  open: boolean;
  pathname: string;
}) {
  const org = useOrganization();
  const { auth } = useAuth();
  const href = useOrgPath();
  const [query, setQuery] = useState("");
  const groups = filterSettingsNav(query);

  return (
    <aside
      aria-label="Navigation des paramètres"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out md:block",
        open ? "w-64" : "w-0",
      )}
    >
      <div
        className={cn(
          "flex h-svh w-64 flex-col gap-3 border-l border-sidebar-border bg-sidebar text-sidebar-foreground py-1 pl-1 pr-1 transition-all duration-300 ease-in-out",
          open
            ? "translate-x-0 opacity-100 delay-100"
            : "-translate-x-6 opacity-0",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          <Link
            href={href()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[15px] font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> Paramètres
          </Link>

          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-foreground/50"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher un paramètre"
              className="h-8 w-full rounded-lg border border-sidebar-border bg-sidebar-accent/50 pl-8 pr-2 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none transition-colors focus-visible:border-sidebar-ring focus-visible:ring-2 focus-visible:ring-sidebar-ring/30"
            />
          </label>

          <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-md border border-sidebar-border bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {initials(org.name)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {org.name}
              </span>
              <span className="block truncate text-xs text-sidebar-foreground/60">
                {ROLE_LABELS[org.role]}
              </span>
            </span>
          </div>

          <nav className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1">
            {groups.length === 0 && (
              <p className="px-2 py-3 text-sm text-sidebar-foreground/60">
                Aucun résultat.
              </p>
            )}
            {groups.map((g, i) => (
              <div key={g.label ?? i} className="space-y-px">
                {g.label && (
                  <p className="px-2 pb-1 pt-1 text-xs font-medium text-sidebar-foreground/60">
                    {g.label}
                  </p>
                )}
                {g.items.map((item) => {
                  const active = isSettingsItemActive(
                    pathname,
                    org.slug,
                    item.path,
                  );
                  return (
                    <Link
                      key={item.path}
                      href={href(item.path)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />{" "}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {initials(auth?.user.fullName ?? "")}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {auth?.user.fullName}
              </span>
              <span className="block truncate text-xs text-sidebar-foreground/60">
                {auth?.user.email}
              </span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Small screens have no second rail: a scrollable pill row replaces it. */
export function SettingsMobileNav({ pathname }: { pathname: string }) {
  const org = useOrganization();
  const href = useOrgPath();
  return (
    <nav
      aria-label="Paramètres"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:hidden"
    >
      {filterSettingsNav("")
        .flatMap((g) => g.items)
        .map((item) => {
          const active = isSettingsItemActive(pathname, org.slug, item.path);
          return (
            <Link
              key={item.path}
              href={href(item.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-sm",
                active ? "bg-foreground text-background" : "",
              )}
            >
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
