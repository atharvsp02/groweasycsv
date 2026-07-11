"use client";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import type { CRMRecord, SkippedRow, HeaderMapping } from "@/lib/types";

export interface ImportHandlers {
  onMapping: (m: { total: number; totalBatches: number; mapping: HeaderMapping }) => void;
  onBatch: (u: { batchIndex: number; totalBatches: number; imported: CRMRecord[]; skipped: SkippedRow[] }) => void;
  onDone: (d: { total: number; importedCount: number; skippedCount: number }) => void;
  onError: (message: string) => void;
}

export async function runImport(csvText: string, h: ImportHandlers): Promise<void> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csvText,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    h.onError(body.error ?? "Request failed");
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      const event = lines.find((l) => l.startsWith("event: "))?.slice(7).trim();
      const dataLine = lines.find((l) => l.startsWith("data: "))?.slice(6);
      if (!event || !dataLine) continue;
      let data;
      try {
        data = JSON.parse(dataLine);
      } catch {
        continue;
      }
      if (event === "header-mapping") h.onMapping(data);
      else if (event === "batch") h.onBatch(data);
      else if (event === "done") h.onDone(data);
      else if (event === "error") h.onError(data.message);
    }
  }
}

export function ImportProgress(
  { batchIndex, totalBatches, imported, skipped }:
  { batchIndex: number; totalBatches: number; imported: number; skipped: number },
) {
  const analyzing = batchIndex === 0;
  const pct = totalBatches ? Math.round((batchIndex / totalBatches) * 100) : 0;
  const label = analyzing
    ? "Analyzing columns and extracting leads..."
    : `Processing batch ${batchIndex} of ${totalBatches}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-200">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-teal-brand" />
          {label}
        </span>
        {!analyzing && <span>{pct}%</span>}
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
        {analyzing ? (
          <motion.div
            className="absolute top-0 h-2 w-1/3 rounded bg-gradient-to-r from-coral to-coral-2"
            animate={{ left: ["-33%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
          />
        ) : (
          <motion.div
            className="h-2 rounded bg-gradient-to-r from-coral to-coral-2"
            animate={{ width: `${pct}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        )}
      </div>
      <div className="flex gap-4 text-sm">
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" /> {imported} imported
        </span>
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> {skipped} skipped
        </span>
      </div>
    </div>
  );
}
