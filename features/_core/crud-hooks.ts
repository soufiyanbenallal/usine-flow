'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '@/features/organization/context'
import type { CrudService } from './crud-service'

export type CrudHooks<Row, Insert, Update> = {
  useList: () => ReturnType<typeof useQuery<Row[], Error>>
  useCreate: () => ReturnType<typeof useMutation<Row, Error, Insert>>
  useCreateMany: () => ReturnType<typeof useMutation<number, Error, Insert[]>>
  useUpdate: () => ReturnType<typeof useMutation<Row, Error, { id: string; patch: Update }>>
  useRemove: () => ReturnType<typeof useMutation<void, Error, string>>
}

/** Query key shared by every query of a feature, scoped by organization. */
export const featureKey = (organizationId: string, feature: string) => ['org', organizationId, feature] as const

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
    useList() {
      const org = useOrganization()
      return useQuery<Row[], Error>({ queryKey: featureKey(org.id, feature), queryFn: () => service.list(org.id) })
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
