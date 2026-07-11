"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import type { HeaderMapping } from "@/lib/types";

export function MappingPanel({ mapping }: { mapping: HeaderMapping }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(mapping);
  if (entries.length === 0) return null;
  const mapped = entries.filter(([, field]) => field && field !== "unmapped");
  const ignored = entries.filter(([, field]) => !field || field === "unmapped").map(([col]) => col);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        How the AI mapped your columns ({mapped.length} mapped{ignored.length ? `, ${ignored.length} ignored` : ""})
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {mapped.map(([col, field]) => (
              <div key={col} className="flex items-center gap-2 text-sm">
                <span
                  className="min-w-0 flex-1 truncate rounded bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  title={col}>
                  {col}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate font-medium text-teal-brand" title={field}>{field}</span>
              </div>
            ))}
          </div>
          {ignored.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-400">Ignored columns: {ignored.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
