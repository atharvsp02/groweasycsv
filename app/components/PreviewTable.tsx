"use client";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { RawCSVRow } from "@/lib/types";

const MIN_COL = 150;

export function PreviewTable({ rows, headers }: { rows: RawCSVRow[]; headers: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 41,
    overscan: 12,
  });
  const template = `repeat(${Math.max(headers.length, 1)}, minmax(${MIN_COL}px, 1fr))`;
  const minWidth = Math.max(headers.length * MIN_COL, MIN_COL);

  return (
    <div ref={parentRef} className="overflow-auto max-h-[45vh] rounded-lg border border-gray-200 dark:border-gray-800">
      <div style={{ minWidth }}>
        <div
          className="sticky top-0 z-10 grid border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
          style={{ gridTemplateColumns: template }}>
          {headers.map((h) => (
            <div key={h} className="truncate px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-400">
              {h}
            </div>
          ))}
        </div>
        <div style={{ height: v.getTotalSize(), position: "relative" }}>
          {v.getVirtualItems().map((vi) => {
            const row = rows[vi.index];
            return (
              <div
                key={vi.index}
                className="absolute left-0 right-0 grid items-center border-b border-gray-100 dark:border-gray-800"
                style={{ top: 0, transform: `translateY(${vi.start}px)`, height: vi.size, gridTemplateColumns: template }}>
                {headers.map((h) => (
                  <div key={h} className="truncate px-3 py-2 text-gray-700 dark:text-gray-200" title={row[h] ?? ""}>{row[h] ?? ""}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
