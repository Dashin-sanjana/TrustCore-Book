"use client";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Search, ArrowUpDown, Inbox } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function DataTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [filter, setFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  // TanStack Table owns mutable state; keep this component outside compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: columns.map((c) => ({ accessorKey: c.key, header: c.label })),
    state: { globalFilter: filter, sorting },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  if (!rows.length)
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-accent text-primary">
          <Inbox size={24} />
        </span>
        <h2 className="text-lg font-semibold">{emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative m-4 max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-3.5 text-muted-foreground"
        />
        <Input
          aria-label="Search records"
          className="pl-9"
          placeholder="Search records…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-5 py-4">
                    <button
                      className="flex items-center gap-2"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <ArrowUpDown size={12} />
                      <span className="sr-only">
                        Sort {String(header.column.columnDef.header)}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-5 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!table.getRowModel().rows.length && (
          <p
            role="status"
            className="p-8 text-center text-sm text-muted-foreground"
          >
            No matching records.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {Math.max(1, table.getPageCount())}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
