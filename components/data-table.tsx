'use client'

import { ArrowDownUp, Columns3, Search, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Button, Checkbox, EmptyState, Popover, PopoverContent, PopoverTrigger } from '@xco-agency/corex-ui'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type DataTableColumn<Row> = {
  key: string
  label: string
  align?: 'right'
  value: (row: Row) => string | number
  render?: (row: Row) => ReactNode
}

export type DataTableFilter<Row> = {
  label: string
  options: { label: string; value: string }[]
  getValue: (row: Row) => string
}

export type DataTableProps<Row extends { id: string }> = {
  title: string
  singular: string
  columns: DataTableColumn<Row>[]
  rows: Row[]
  loading?: boolean
  addLabel?: string
  filter?: DataTableFilter<Row>
  onOpen?: (row: Row) => void
  onAdd?: () => void
  onVisibleChange?: (rows: Row[]) => void
}

/** Pure presentation table with search, filter, sort and selection. */
export function DataTable<Row extends { id: string }>({
  title,
  singular,
  columns,
  rows,
  loading = false,
  addLabel,
  filter: filterConfig,
  onOpen,
  onAdd,
  onVisibleChange,
}: DataTableProps<Row>) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [descending, setDescending] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const shown = useMemo(() => columns.filter((c, i) => i === 0 || !hidden.has(c.key)), [columns, hidden])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const first = columns[0]
    const out = rows.filter((row) => {
      if (filter && filterConfig && filterConfig.getValue(row) !== filter) return false
      return !q || columns.some((c) => String(c.value(row)).toLowerCase().includes(q))
    })
    if (first) {
      out.sort((a, b) => String(first.value(a)).localeCompare(String(first.value(b)), 'fr', { numeric: true }))
    }
    return descending ? out.reverse() : out
  }, [columns, rows, query, filter, filterConfig, descending])

  // Inform parent of visible subset (for CSV exports, etc.)
  onVisibleChange?.(visible)

  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visible.map((r) => r.id)))
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const filterLabel = filterConfig?.options.find((o) => o.value === filter)?.label

  if (!loading && rows.length === 0) {
    return (
      <EmptyState heading={`Aucun ${singular} pour l’instant`} action={onAdd && addLabel ? { content: addLabel, onAction: onAdd } : undefined}>
        <p>{onAdd ? 'Commencez par en ajouter un.' : 'Les données apparaîtront ici.'}</p>
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-xs">
        <span className="rounded-md bg-secondary px-2 py-1 text-[13px] font-medium">Tous</span>
        <Search className="ml-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rechercher dans ${title.toLowerCase()}`}
          aria-label={`Rechercher dans ${title.toLowerCase()}`}
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {filter && (
          <button type="button" onClick={() => setFilter(null)} className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-900">
            {filterLabel} <X className="size-3" aria-hidden />
          </button>
        )}
        {filterConfig && (
          <Popover>
            <PopoverTrigger>
              <Button variant="tertiary" icon="filter">
                {filterConfig.label}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="flex min-w-44 flex-col gap-1 p-2">
                {filterConfig.options.map((o) => (
                  <Button key={o.value} variant={o.value === filter ? 'primary' : 'tertiary'} onClick={() => setFilter(o.value === filter ? null : o.value)}>
                    {o.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Popover>
          <PopoverTrigger>
            <button type="button" aria-label="Colonnes" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary">
              <Columns3 className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex min-w-48 flex-col gap-2 p-3">
              <p className="text-xs font-medium text-muted-foreground">Colonnes affichées</p>
              {columns.map((c, i) => (
                <Checkbox
                  key={c.key}
                  label={c.label}
                  disabled={i === 0}
                  checked={i === 0 || !hidden.has(c.key)}
                  onChange={() =>
                    setHidden((prev) => {
                      const next = new Set(prev)
                      if (!next.delete(c.key)) next.add(c.key)
                      return next
                    })
                  }
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button type="button" aria-label="Inverser le tri" onClick={() => setDescending((d) => !d)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary">
          <ArrowDownUp className="size-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-0 bg-muted hover:bg-muted [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
              <TableHead className="w-10">
                <Checkbox label="Tout sélectionner" labelAccessibilityVisibility="exclusive" checked={allSelected} onChange={toggleAll} />
              </TableHead>
              {shown.map((c) => (
                <TableHead key={c.key} className={cn('h-10 text-[13px] font-medium text-foreground', c.align === 'right' && 'text-right')}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i} className="h-14">
                  <TableCell colSpan={shown.length + 1}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading &&
              visible.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selected.has(row.id) ? 'selected' : undefined}
                  className={cn('h-14', onOpen && 'cursor-pointer')}
                  onClick={() => onOpen?.(row)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox label={`Sélectionner ${String(columns[0]?.value(row) ?? '')}`} labelAccessibilityVisibility="exclusive" checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                  </TableCell>
                  {shown.map((c, i) => (
                    <TableCell key={c.key} className={cn('text-[13px]', i === 0 && 'font-medium', c.align === 'right' && 'text-right tabular-nums')}>
                      {c.render ? c.render(row) : c.value(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={shown.length + 1} className="h-32 text-center text-sm text-muted-foreground">
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="py-4 text-center text-[13px] font-medium">{selected.size > 0 ? `${selected.size} sélectionné(s)` : `${visible.length} ${title.toLowerCase()}`}</p>
    </div>
  )
}
