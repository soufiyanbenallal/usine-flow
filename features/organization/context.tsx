"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { orgPath } from "@/lib/routes";
import { organizationService } from "./service";
import { WRITE_ROLES, type Organization } from "./types";

type OrganizationState = {
  /** `undefined` while loading, `null` when the user has none. */
  organization: Organization | null | undefined;
};

const OrganizationContext = createContext<OrganizationState | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  const userId = auth?.user.id;
  const query = useQuery({
    queryKey: ["organization", userId],
    enabled: !!userId,
    queryFn: () => organizationService.getForUser(userId!),
  });
  useEffect(() => {
    if (query.error) {
      console.error(
        "[OrganizationProvider] Failed to fetch organization for user:",
        query.error,
      );
    }
  }, [query.error]);

  const value = useMemo<OrganizationState>(
    () => ({
      organization: !userId
        ? null
        : query.isPending
          ? undefined
          : (query.data ?? null),
    }),
    [userId, query.isPending, query.data],
  );
  return <OrganizationContext value={value}>{children}</OrganizationContext>;
}

/** Nullable organization state — for guards and auth pages. */
export function useOrganizationState() {
  const ctx = useContext(OrganizationContext);
  if (!ctx)
    throw new Error(
      "useOrganizationState must be used inside <OrganizationProvider>",
    );
  return ctx.organization;
}

/** The current organization. Only valid under `app/[org]` where the layout guarantees it. */
export function useOrganization(): Organization {
  const org = useOrganizationState();
  if (!org) throw new Error("useOrganization: no organization loaded");
  return org;
}

export const useCanWrite = () => WRITE_ROLES.includes(useOrganization().role);

/** Builds `/<org-slug>/<path>` for the current organization. */
export function useOrgPath() {
  const { slug } = useOrganization();
  return (path = "") => orgPath(slug, path);
}
