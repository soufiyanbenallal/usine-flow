"use client";

import {
  ChevronRight,
  ChevronsUpDown,
  Globe,
  LogOut,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo, LogoMark } from "@/components/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCommandPalette } from "@/features/search/command-palette";
import { NotificationsBell } from "@/features/alerts/notifications-bell";
import { useOrganization, useOrgPath } from "@/features/organization/context";
import { useAuth } from "@/lib/auth";
import { useEnabledModules } from "@/features/organization/modules";
import { LOCALES, useI18n, useT } from "@/lib/i18n";
import { groupNav, isInside, visibleNav } from "@/lib/nav";
import { useUiStore } from "@/lib/stores/ui-store";
import { Avatar, Text } from "@xco-agency/corex-ui";

/** Navigation grouped by section, filtered by the organization's enabled modules and the user's permissions. */
function NavTree() {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const { slug } = useOrganization();
  const href = useOrgPath();
  const t = useT();
  const enabled = useEnabledModules();
  const collapsed = useUiStore((s) => s.collapsedGroups);
  const toggleGroup = useUiStore((s) => s.toggleGroup);
  const close = () => isMobile && setOpenMobile(false);
  const groups = groupNav(visibleNav(enabled));

  return (
    <>
      {groups.map(({ group, items }) => (
        <SidebarGroup key={group}>
          {group !== "Aperçu" && (
            <SidebarGroupLabel
              render={
                <button type="button" onClick={() => toggleGroup(group)} aria-expanded={!collapsed[group]} className="w-full cursor-pointer justify-between">
                  <span>{t(group)}</span>
                  <ChevronRight className={`size-3 transition-transform rtl:rotate-180 ${collapsed[group] ? "" : "rotate-90 rtl:rotate-90"}`} />
                </button>
              }
            />
          )}
          {!collapsed[group] && (
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => {
                const selfActive = isInside(pathname, slug, item.path, item.end);
                const childActive = item.children?.some((c) => isInside(pathname, slug, c.path));
                const expanded = !!item.children && (selfActive || childActive);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      render={
                        <Link href={href(item.path)} onClick={close}>
                          <item.icon />
                          <Text>{t(item.title)}</Text>
                        </Link>
                      }
                      isActive={selfActive && !childActive}
                      tooltip={t(item.title)}
                    />
                    {expanded && (
                      <SidebarMenuSub className="mx-0 px-0 gap-0.5 relative">
                        {item.children!.map((child) => (
                          <SidebarMenuSubItem key={child.path}>
                            <SidebarMenuSubButton
                              render={
                                <Link href={href(child.path)} onClick={close}>
                                  <Text>{t(child.title)}</Text>
                                </Link>
                              }
                              isActive={isInside(pathname, slug, child.path)}
                              className="h-8 pl-8 rtl:pr-8 rtl:pl-2"
                            />
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          )}
        </SidebarGroup>
      ))}
    </>
  );
}
function CommandPalette({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  return (
    <button
      onClick={onOpen}
      className="flex h-8 w-full items-center rounded-md hover:from-[#252525] pr-2 pl-2 soft-inset soft-inset-border group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center cursor-pointer transition-colors"
      title="Rechercher (⌘K)"
      aria-label="Rechercher"
    >
      <Search className="size-4 shrink-0 text-sidebar-foreground/70" />

      <div className="flex-1 opacity-70 flex leading-none ml-2 group-data-[collapsible=icon]:hidden">
        <Text>{t("Rechercher")}</Text>
      </div>

      <div className="relative z-10 flex items-center gap-1 group-data-[collapsible=icon]:hidden">
        <kbd className="inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-[4px] border border-white/10 bg-white/10 px-1 text-[11px] font-medium text-white/70 shadow-xs select-none">
          ⌘
        </kbd>
        <kbd className="inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-[4px] border border-white/10 bg-white/10 px-1 text-[10px] font-medium text-white/70 shadow-xs select-none">
          K
        </kbd>
      </div>
    </button>
  );
}
export function AppSidebar() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const { auth, signOut } = useAuth();
  const organization = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const href = useOrgPath();
  const { open: openSearch } = useCommandPalette();
  const { toggleSidebar } = useSidebar();
  const settingsActive = isInside(pathname, organization.slug, "parametres");

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-3 px-2 pt-3">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          {/* Expanded mode: full logo */}
          <div className="flex items-center group-data-[collapsible=icon]:hidden">
            <Logo />
          </div>

          {/* Expanded mode: collapse trigger */}
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />

          {/* Collapsed mode: logo mark with expand icon overlay on hover */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={toggleSidebar}
                  title="Agrandir la barre latérale"
                  aria-label="Agrandir la barre latérale"
                  className="group/logo relative hidden size-7.5 items-center justify-center rounded-md outline-none group-data-[collapsible=icon]:flex hover:bg-sidebar-accent cursor-pointer transition-colors"
                >
                  <span className="flex items-center justify-center transition-opacity duration-150 group-hover/logo:opacity-0">
                    <LogoMark />
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center rounded-md text-sidebar-foreground opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100">
                    <PanelLeftOpen className="size-4.5" />
                  </span>
                </button>
              }
            />
            <TooltipContent side="right">
              Agrandir la barre latérale
            </TooltipContent>
          </Tooltip>
        </div>
        <CommandPalette onOpen={openSearch} />
      </SidebarHeader>

      <SidebarContent>
        <NavTree />
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link href={href("parametres")}>
                  <Settings />
                  <span>{t("Paramètres")}</span>
                </Link>
              }
              isActive={settingsActive}
              tooltip={t("Paramètres")}
              className="h-8 text-[14px]"
            />
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-sm p-0.5 text-left text-sm outline-none hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden">
              <Avatar initials={organization.name} size="small"></Avatar>
              <span className="truncate font-medium">{organization.name}</span>
              <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">
                  {auth?.user.fullName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {auth?.user.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(href("parametres"))}>
                <Settings /> {t("Paramètres")}
              </DropdownMenuItem>
              {LOCALES.map((l) => (
                <DropdownMenuItem key={l.value} onClick={() => setLocale(l.value)}>
                  <Globe /> {l.label}
                  {l.value === locale && <span className="ms-auto text-xs">✓</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                <LogOut /> {t("Se déconnecter")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NotificationsBell />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
