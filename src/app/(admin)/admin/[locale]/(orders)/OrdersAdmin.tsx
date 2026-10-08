"use client";

import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ExpandedState,
} from "@tanstack/react-table";
import { ArrowUpDown, Copy, PackageX } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Input } from "@admin/components/ui/input";
import { Skeleton } from "@admin/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@admin/components/ui/table";
import { PaginationControls } from "./components/PaginationControls";
import { OrderExpandedDetails } from "./components/OrderExpandedDetails";
import { useOrdersAdmin } from "./components/hooks/useOrdersAdmin";
import { normalizeOrderId } from "@admin/utils/normalizeOrderId";
import { OrderStatus, RawOrder, STATUS_BADGE, STATUS_FLOW } from "./components/type";

export default function OrdersAdmin() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const token =
    typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const {
    orders,
    page,
    limit,
    loading,
    fetchError,
    totalPages,
    totalOrders,
    setPage,
    copy,
    changeStatus,
  } = useOrdersAdmin(token, t, normalizeOrderId(search));

  const columns = useMemo<ColumnDef<RawOrder>[]>(
    () => [
      {
        id: "expand",
        size: 40,
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => row.toggleExpanded()}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
            aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          >
            <span className="text-xs text-muted-foreground">
              {row.getIsExpanded() ? "▲" : "▼"}
            </span>
          </button>
        ),
      },
      {
        id: "number",
        size: 48,
        header: "#",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {row.index + 1 + (page - 1) * limit}
          </span>
        ),
      },
      {
        id: "orderId",
        header: t("order_id"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 group">
            <span className="font-mono text-xs font-medium">
              {row.original.orderNumber
                ? `#${row.original.orderNumber}`
                : row.original.id.slice(0, 8)}
            </span>
            <button
              type="button"
              onClick={() => copy(row.original.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title={t("copy")}
            >
              <Copy className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ),
      },
      {
        id: "customer",
        header: t("name"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[140px] block">
            {row.original.user?.email ?? t("no_email")}
          </span>
        ),
      },
      {
        id: "items",
        header: t("items_short"),
        cell: ({ row }) => {
          const items = row.original.foodOrderItems ?? row.original.items ?? [];
          return <span className="text-sm tabular-nums">{items.length}</span>;
        },
      },
      {
        accessorKey: "totalPrice",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("amount")}
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-sm tabular-nums">
            ₮{(row.original.totalPrice ?? 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => {
          const status = row.original.status ?? "PENDING";
          return (
            <span
              className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_BADGE[status]}`}
            >
              {t(`order_status.${status}`)}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("date")}
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString()
              : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("change_status"),
        cell: ({ row }) => {
          const status = row.original.status ?? "PENDING";
          const nextStatuses = STATUS_FLOW[status];
          if (!nextStatuses.length) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <select
              value={status}
              onChange={(e) =>
                changeStatus(row.original.id, e.target.value as OrderStatus)
              }
              className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground"
            >
              <option value={status}>{t(`order_status.${status}`)}</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {t(`order_status.${s}`)}
                </option>
              ))}
            </select>
          );
        },
      },
    ],
    [t, copy, changeStatus, page, limit]
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-background text-foreground px-4 py-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("orders")}</h1>
        <div className="text-sm text-muted-foreground">
          {t("page_of", { page, total: totalPages })}
        </div>
      </div>

      {/* Search */}
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("search_order_placeholder")}
          className="h-11 w-full md:max-w-md"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
            className="h-11 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("clear")}
          </button>

          <div className="text-sm text-muted-foreground">
            {search
              ? t("found_count", { count: totalOrders })
              : t("total_count", { count: totalOrders })}
          </div>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4">
          {fetchError}
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <PackageX className="w-10 h-10 opacity-40" />
          <p className="text-sm">
            {search ? t("no_orders_found") : t("orders_empty")}
          </p>
        </div>
      )}

      {/* Data table */}
      {!loading && orders.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/40 hover:bg-muted/40"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow className="group">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="p-0 bg-muted/20"
                      >
                        <OrderExpandedDetails
                          order={row.original}
                          expanded={true}
                          items={
                            row.original.foodOrderItems ??
                            row.original.items ??
                            []
                          }
                          t={t}
                          copy={copy}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <PaginationControls
        loading={loading}
        hasData={totalOrders > 0}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        t={t}
      />
    </div>
  );
}
