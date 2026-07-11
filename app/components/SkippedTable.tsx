"use client";
import type { SkippedRow } from "@/lib/types";

export function SkippedTable({ rows }: { rows: SkippedRow[] }) {
  if (rows.length === 0) return null;
  const dataCols = Array.from(new Set(rows.flatMap((r) => Object.keys(r.raw))));
  const template = `70px ${dataCols.map(() => "minmax(140px, 1fr)").join(" ")} minmax(220px, 1.4fr)`;
  const minWidth = 70 + dataCols.length * 140 + 220;

  return (
    <div className="overflow-auto max-h-[40vh] rounded-lg border border-gray-200 dark:border-gray-800">
      <div style={{ minWidth }}>
        <div
          className="sticky top-0 z-10 grid border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
          style={{ gridTemplateColumns: template }}>
          <div className="truncate px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-400">ROW</div>
          {dataCols.map((c) => (
            <div key={c} className="truncate px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-400">{c}</div>
          ))}
          <div className="truncate px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-400">REASON</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid items-center border-b border-gray-100 dark:border-gray-800" style={{ gridTemplateColumns: template }}>
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{r.rowIndex}</div>
            {dataCols.map((c) => (
              <div key={c} className="truncate px-3 py-2 text-sm text-gray-700 dark:text-gray-200" title={r.raw[c] ?? ""}>{r.raw[c] ? r.raw[c] : "-"}</div>
            ))}
            <div className="truncate px-3 py-2 text-sm text-amber-700 dark:text-amber-300" title={r.reason}>{r.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
