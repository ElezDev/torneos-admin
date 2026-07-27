import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type DataTableFilterOption = {
  label: string
  value: string
}

export type DataTableFilter = {
  id: string
  label: string
  options: DataTableFilterOption[]
  placeholder?: string
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  searchPlaceholder?: string
  searchKeys?: string[]
  filters?: DataTableFilter[]
  emptyMessage?: string
  toolbar?: ReactNode
  initialPageSize?: number
  onRowClick?: (row: TData) => void
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Buscar…',
  searchKeys,
  filters = [],
  emptyMessage = 'Sin resultados',
  toolbar,
  initialPageSize = 10,
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue ?? '')
        .trim()
        .toLowerCase()
      if (!query) return true

      if (searchKeys?.length) {
        const hitKey = searchKeys.some((key) => {
          const value = (row.original as Record<string, unknown>)[key]
          return String(value ?? '')
            .toLowerCase()
            .includes(query)
        })
        if (hitKey) return true
      }

      return row.getAllCells().some((cell) => {
        const rendered = cell.getValue()
        if (rendered == null) return false
        if (typeof rendered === 'object') return JSON.stringify(rendered).toLowerCase().includes(query)
        return String(rendered).toLowerCase().includes(query)
      })
    },
    initialState: {
      pagination: { pageSize: initialPageSize },
    },
  })

  const filterValues = useMemo(() => {
    return Object.fromEntries(
      filters.map((filter) => [
        filter.id,
        String(table.getColumn(filter.id)?.getFilterValue() ?? 'all'),
      ]),
    )
  }, [filters, table, columnFilters])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 px-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Select
              key={filter.id}
              value={filterValues[filter.id] || 'all'}
              onValueChange={(value) =>
                table.getColumn(filter.id)?.setFilterValue(value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder={filter.placeholder ?? filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos · {filter.label}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {toolbar}
        </div>
      </div>

      <div className="overflow-x-auto border-y">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 font-medium hover:text-foreground',
                            sorted ? 'text-foreground' : 'text-muted-foreground',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-3 pb-3 text-xs text-muted-foreground">
        <span>
          {table.getFilteredRowModel().rows.length} de {data.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <span>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
