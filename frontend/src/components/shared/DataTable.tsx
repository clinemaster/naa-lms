"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  /** Stable id for the column (used as the React key). */
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  /** Extra classes for this column's cells (header and body). */
  className?: string;
  /** Emphasise the cell text (e.g. the row's name or title). */
  primary?: boolean;
  /** Right-align and lay out several action buttons side by side. */
  actions?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  getRowKey: (row: T) => React.Key;
  isLoading?: boolean;
  /** Prepend an "S/No" column numbering the rows from 1. */
  numbered?: boolean;
  /** Message shown inside the table when there are no rows. */
  emptyMessage?: React.ReactNode;
  /** Replaces the whole table when there are no rows (e.g. an EmptyState). */
  emptyState?: React.ReactNode;
  /** Number of placeholder rows while loading. */
  loadingRows?: number;
  className?: string;
}

/**
 * The standard table for the app. Every list of records (users, courses, …)
 * should render through this so headers, spacing, the S/No column, loading
 * and empty states look the same everywhere.
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  numbered = false,
  emptyMessage = "Nothing to show yet.",
  emptyState,
  loadingRows = 5,
  className,
}: DataTableProps<T>) {
  const rows = data ?? [];
  if (!isLoading && rows.length === 0 && emptyState) return <>{emptyState}</>;

  const columnCount = columns.length + (numbered ? 1 : 0);
  const cellClass = (col: DataTableColumn<T>) =>
    cn(col.primary && "font-medium", col.actions && "ui-table-actions", col.className);

  return (
    <Table containerClassName={className} aria-busy={isLoading || undefined}>
      <TableHeader>
        <TableRow>
          {numbered && <TableHead className="ui-table-index">S/No</TableHead>}
          {columns.map((col) => (
            <TableHead key={col.key} className={cn(col.actions && "ui-table-actions", col.className)}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: loadingRows }).map((_, i) => (
            <TableRow key={`loading-${i}`} className="ui-loading-delay">
              {Array.from({ length: columnCount }).map((__, j) => (
                <TableCell key={j}>
                  <Skeleton className={cn("h-4", j === 0 && numbered ? "w-6" : "w-24")} />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="ui-table-empty">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, index) => (
            <TableRow key={getRowKey(row)}>
              {numbered && <TableCell className="ui-table-index">{index + 1}</TableCell>}
              {columns.map((col) => (
                <TableCell key={col.key} className={cellClass(col)}>
                  {col.actions ? <div className="ui-table-actions-group">{col.cell(row, index)}</div> : col.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
