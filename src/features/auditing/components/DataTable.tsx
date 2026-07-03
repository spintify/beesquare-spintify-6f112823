import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  width?: string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  highlightRow?: (row: T) => boolean;
}

export function DataTable<T>({ rows, columns, rowKey, pageSize = 10, onRowClick, empty, highlightRow }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      return av > bv ? dir : av < bv ? -dir : 0;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pages - 1);
  const view = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-blue-100/70 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gradient-to-b from-blue-50/80 to-white/60 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-wide text-blue-900/70">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-2.5 font-semibold", c.className)} style={c.width ? { width: c.width } : undefined}>
                  <button
                    type="button"
                    disabled={!c.sortValue}
                    onClick={() =>
                      setSort((prev) =>
                        !c.sortValue
                          ? prev
                          : prev?.key === c.key
                            ? { key: c.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                            : { key: c.key, dir: "asc" },
                      )
                    }
                    className={cn("inline-flex items-center gap-1", c.sortValue && "hover:text-blue-700")}
                  >
                    {c.header}
                    {c.sortValue && <ArrowUpDown className="h-3 w-3 opacity-60" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {empty ?? "No records"}
                </td>
              </tr>
            )}
            {view.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-t border-blue-50 transition-colors hover:bg-blue-50/60",
                  onRowClick && "cursor-pointer",
                  highlightRow?.(row) && "bg-rose-50/50 hover:bg-rose-50",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-2.5 align-middle", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-blue-100/70 px-4 py-2 text-xs text-muted-foreground">
          <span>
            Page {clampedPage + 1} of {pages} • {sorted.length} records
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, clampedPage - 1))} disabled={clampedPage === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(pages - 1, clampedPage + 1))}
              disabled={clampedPage >= pages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
