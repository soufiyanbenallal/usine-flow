'use client'

import { Button, SearchField } from '@xco-agency/corex-ui'
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useMemo, useRef, type ReactNode } from 'react'
import type { CrudHooks } from '@/features/_core/crud-hooks'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const features = tableFeatures({})
const EMPTY: never[] = []

export type ServerColumn<Row> = {
  key: string
  label: string
  align?: 'right'
  /** Database column used for sorting (omit = not sortable). */
  sortKey?: string
  width?: number
  render: (row: Row) => ReactNode
}

export type ServerFilter = { key: string; label: string; options: { value: string; label: string }[] }

type Props<Row extends { id: string }> = {
  hooks: CrudHooks<Row, Record<string, unknown>, Record<string, unknown>>
  columns: ServerColumn<Row>[]
  /** Columns searched with `ilike`. */
  searchColumns?: string[]
  filters?: ServerFilter[]
  defaultSort?: { key: string; ascending?: boolean }
  /** Fixed equality filters (e.g. a parent id). */
  fixedFilters?: Record<string, string | undefined>
  onOpen?: (row: Row) => void
  empty?: ReactNode
  height?: number
}

const PAGE_SIZES = [25, 50, 100]

/**
 * Server-side paginated, sortable, filterable table (state lives in the URL via nuqs).
 * Rows are fetched per page (range + exact count) and virtualized with TanStack Virtual: safe for ledgers with millions of rows.
 */
export function ServerTable<Row extends { id: string }>({ hooks, columns, searchColumns, filters = [], defaultSort, fixedFilters, onOpen, empty, height = 560 }: Props<Row>) {
  const t = useT()
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [size, setSize] = useQueryState('size', parseAsInteger.withDefault(50))
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault(defaultSort?.key ?? ''))
  const [dir, setDir] = useQueryState('dir', parseAsString.withDefault(defaultSort?.ascending ? 'asc' : 'desc'))
  const [f1, setF1] = useQueryState('f1', parseAsString.withDefault(''))
  const [f2, setF2] = useQueryState('f2', parseAsString.withDefault(''))
  const filterState = [
    { value: f1, set: setF1 },
    { value: f2, set: setF2 },
  ]

  const query = useMemo(
    () => ({
      page,
      pageSize: size,
      search,
      searchColumns,
      orderBy: sort || undefined,
      ascending: dir === 'asc',
      filters: {
        ...Object.fromEntries(filters.map((f, i) => [f.key, filterState[i]?.value || undefined])),
        ...fixedFilters,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, size, search, sort, dir, f1, f2, searchColumns, fixedFilters, filters.length],
  )
  const result = hooks.usePage(query)
  const rows = result.data?.rows ?? (EMPTY as Row[])
  const total = result.data?.total ?? 0
  const pages = Math.max(Math.ceil(total / size), 1)

  const helper = useMemo(() => createColumnHelper<typeof features, Row>(), [])
  const columnDefs = useMemo(
    () => columns.map((c) => helper.display({ id: c.key, header: c.label, cell: ({ row }: { row: { original: Row } }) => c.render(row.original) })),
    [columns, helper],
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useTable({ features, columns: columnDefs as any, data: rows })
  const tableRows = table.getRowModel().rows

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({ count: tableRows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 44, overscan: 8 })
  const items = virtualizer.getVirtualItems()
  const padTop = items.length > 0 ? items[0]!.start : 0
  const padBottom = items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0
  const colSpan = columns.length

  const toggleSort = (key: string) => {
    if (sort === key) void setDir(dir === 'asc' ? 'desc' : 'asc')
    else {
      void setSort(key)
      void setDir('asc')
    }
    void setPage(1)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-xs">
        {searchColumns && (
          <div className="min-w-56 flex-1">
            <SearchField label={t('Rechercher')} labelAccessibilityVisibility="exclusive" value={search} onDebouncedChange={(v) => { void setSearch(v); void setPage(1) }} />
          </div>
        )}
        {filters.slice(0, 2).map((f, i) => (
          <select
            key={f.key}
            aria-label={f.label}
            value={filterState[i]!.value}
            onChange={(e) => {
              void filterState[i]!.set(e.target.value)
              void setPage(1)
            }}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-[13px]"
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        <select aria-label="Taille de page" value={size} onChange={(e) => { void setSize(Number(e.target.value)); void setPage(1) }} className="h-8 rounded-lg border border-input bg-transparent px-2 text-[13px]">
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>
      </div>

      <div ref={scrollRef} className="overflow-auto rounded-xl border bg-card" style={{ maxHeight: height }}>
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ minWidth: c.width ?? 120 }} className={cn('h-10 px-3 text-left font-medium', c.align === 'right' && 'text-right')}>
                  {c.sortKey ? (
                    <button type="button" onClick={() => toggleSort(c.sortKey!)} className="inline-flex items-center gap-1 hover:underline">
                      {c.label}
                      {sort === c.sortKey && (dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.isPending && (
              <tr>
                <td colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                  {t('Chargement…')}
                </td>
              </tr>
            )}
            {!result.isPending && tableRows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                  {empty ?? t('Aucun résultat.')}
                </td>
              </tr>
            )}
            {padTop > 0 && <tr style={{ height: padTop }} />}
            {items.map((item) => {
              const row = tableRows[item.index]!
              return (
                <tr key={row.id} data-index={item.index} ref={virtualizer.measureElement} className={cn('border-t', onOpen && 'cursor-pointer hover:bg-muted/50')} onClick={() => onOpen?.(row.original as Row)}>
                  {row.getAllCells().map((cell, i) => (
                    <td key={cell.id} className={cn('px-3 py-2.5', columns[i]?.align === 'right' && 'text-right tabular-nums')}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              )
            })}
            {padBottom > 0 && <tr style={{ height: padBottom }} />}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span>
          {total.toLocaleString('fr-MA')} {t('lignes')}
          {result.isFetching && ' · …'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => void setPage(page - 1)} accessibilityLabel="Page précédente">
            <ChevronLeft className="size-3.5" />
          </Button>
          <span>
            {page} / {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => void setPage(page + 1)} accessibilityLabel="Page suivante">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
