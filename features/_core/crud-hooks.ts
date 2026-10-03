'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '@/features/organization/context'
import type { Page, PageQuery } from '@/lib/rpc'
import type { CrudService } from './crud-service'

export type CrudHooks<Row, Insert, Update> = {
  feature: string
  useList: () => ReturnType<typeof useQuery<Row[], Error>>
  usePage: (query: PageQuery) => ReturnType<typeof useQuery<Page<Row>, Error>>
  useOne: (id: string | undefined) => ReturnType<typeof useQuery<Row | null, Error>>
  useListBy: (column: string, value: string | undefined) => ReturnType<typeof useQuery<Row[], Error>>
  useCreate: () => ReturnType<typeof useMutation<Row, Error, Insert>>
  useCreateMany: () => ReturnType<typeof useMutation<number, Error, Insert[]>>
  useUpdate: () => ReturnType<typeof useMutation<Row, Error, { id: string; patch: Update }>>
  useRemove: () => ReturnType<typeof useMutation<void, Error, string>>
}

/** Query key shared by every query of a feature, scoped by organization. */
export const featureKey = (organizationId: string, feature: string) => ['org', organizationId, feature] as const

/** Invalidates the given features of the current organization (use after an RPC that touches several tables). */
export function useInvalidateFeatures() {
  const org = useOrganization()
  const client = useQueryClient()
  return (...features: string[]) => Promise.all(features.map((f) => client.invalidateQueries({ queryKey: featureKey(org.id, f) })))
}

/** TanStack Query hooks for a CRUD service. Any mutation invalidates the whole feature (and `related` features). */
export function createCrudHooks<Row, Insert, Update>(
  feature: string,
  service: CrudService<Row, Insert, Update>,
  related: string[] = [],
): CrudHooks<Row, Insert, Update> {
  function useInvalidate() {
    const org = useOrganization()
    const client = useQueryClient()
    return () => Promise.all([feature, ...related].map((f) => client.invalidateQueries({ queryKey: featureKey(org.id, f) })))
  }

  return {
    feature,
    useList() {
      const org = useOrganization()
      return useQuery<Row[], Error>({ queryKey: featureKey(org.id, feature), queryFn: () => service.list(org.id) })
    },
    usePage(query) {
      const org = useOrganization()
      return useQuery<Page<Row>, Error>({
        queryKey: [...featureKey(org.id, feature), 'page', query],
        queryFn: () => service.page(org.id, query),
        placeholderData: keepPreviousData,
      })
    },
    useOne(id) {
      const org = useOrganization()
      return useQuery<Row | null, Error>({ queryKey: [...featureKey(org.id, feature), 'one', id], queryFn: () => service.get(id!), enabled: !!id })
    },
    useListBy(column, value) {
      const org = useOrganization()
      return useQuery<Row[], Error>({
        queryKey: [...featureKey(org.id, feature), 'by', column, value],
        queryFn: () => service.listBy(org.id, column, value!),
        enabled: !!value,
      })
    },
    useCreate() {
      const org = useOrganization()
      const invalidate = useInvalidate()
      return useMutation<Row, Error, Insert>({ mutationFn: (input) => service.create(org.id, input), onSuccess: invalidate })
    },
    useCreateMany() {
      const org = useOrganization()
      const invalidate = useInvalidate()
      return useMutation<number, Error, Insert[]>({ mutationFn: (inputs) => service.createMany(org.id, inputs), onSuccess: invalidate })
    },
    useUpdate() {
      const invalidate = useInvalidate()
      return useMutation<Row, Error, { id: string; patch: Update }>({ mutationFn: ({ id, patch }) => service.update(id, patch), onSuccess: invalidate })
    },
    useRemove() {
      const invalidate = useInvalidate()
      return useMutation<void, Error, string>({ mutationFn: (id) => service.remove(id), onSuccess: invalidate })
    },
  }
}

/** Typed `useMutation` around an RPC. `features` are invalidated on success (all stock-moving RPCs also touch the ledger). */
export function useRpcMutation<Args, Result = unknown>(call: (args: Args) => Promise<Result>, features: string[]) {
  const invalidate = useInvalidateFeatures()
  return useMutation<Result, Error, Args>({ mutationFn: call, onSuccess: () => invalidate(...features) })
}
