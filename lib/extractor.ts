import { z } from "zod";
import type { LLMProvider } from "@/lib/llm";
import { buildExtractionPrompt } from "@/lib/prompts";
import { validateAndNormalizeRecord } from "@/lib/validate";
import type {
  RawCSVRow, HeaderMapping, CRMRecord, SkippedRow, ImportResult, RawExtractedRecord,
} from "@/lib/types";

export interface ExtractOpts { batchSize: number; concurrency: number; maxRetries: number; }
export interface BatchUpdate {
  batchIndex: number; totalBatches: number; imported: CRMRecord[]; skipped: SkippedRow[];
}

const recordEnvelopeSchema = z.object({ rowIndex: z.number().optional() }).passthrough();

const batchSchema = z.object({
  records: z.array(recordEnvelopeSchema).default([]),
  skipped: z.array(z.object({ rowIndex: z.number(), reason: z.string() })).default([]),
});

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return m.includes("429") || m.includes("RESOURCE_EXHAUSTED") || /rate.?limit|quota/i.test(m);
}

async function runBatch(
  llm: LLMProvider, batchRows: RawCSVRow[], globalOffset: number,
  mapping: HeaderMapping, maxRetries: number,
): Promise<{ imported: CRMRecord[]; skipped: SkippedRow[] }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const out = await llm.generateJson(buildExtractionPrompt(batchRows, mapping), batchSchema);
      const fieldsByIndex = new Map<number, RawExtractedRecord>();
      out.records.forEach((rec, i) => {
        const { rowIndex, ...fields } = rec;
        const ri = typeof rowIndex === "number" ? rowIndex : i;
        if (ri >= 0 && ri < batchRows.length && !fieldsByIndex.has(ri)) {
          fieldsByIndex.set(ri, fields as RawExtractedRecord);
        }
      });
      const reasonByIndex = new Map<number, string>();
      for (const s of out.skipped) {
        if (s.rowIndex >= 0 && s.rowIndex < batchRows.length && !reasonByIndex.has(s.rowIndex)) {
          reasonByIndex.set(s.rowIndex, s.reason);
        }
      }
      const imported: CRMRecord[] = [];
      const skipped: SkippedRow[] = [];
      for (let i = 0; i < batchRows.length; i++) {
        const globalIndex = globalOffset + i;
        const raw = batchRows[i] ?? {};
        const fields = fieldsByIndex.get(i);
        if (fields) {
          try {
            const res = validateAndNormalizeRecord(fields, globalIndex);
            if (res.ok) { imported.push(res.record); continue; }
            skipped.push({ rowIndex: globalIndex, reason: res.reason, raw });
            continue;
          } catch {
            skipped.push({ rowIndex: globalIndex, reason: "malformed AI output", raw });
            continue;
          }
        }
        skipped.push({ rowIndex: globalIndex, reason: reasonByIndex.get(i) ?? "no record returned by AI", raw });
      }
      return { imported, skipped };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const base = isRateLimit(err) ? 4000 : 500;
        await sleep(Math.min(base * 2 ** attempt, 30000));
      }
    }
  }
  void lastErr;
  return {
    imported: [],
    skipped: batchRows.map((raw, i) => ({
      rowIndex: globalOffset + i, reason: "processing failed", raw,
    })),
  };
}

export async function extractBatches(
  llm: LLMProvider, rows: RawCSVRow[], mapping: HeaderMapping,
  opts: ExtractOpts, onBatch: (u: BatchUpdate) => void,
): Promise<ImportResult> {
  const size = Math.max(1, opts.batchSize);
  const batches = chunk(rows, size);
  const imported: CRMRecord[] = [];
  const skipped: SkippedRow[] = [];
  let nextBatch = 0;

  async function worker() {
    while (true) {
      const idx = nextBatch++;
      if (idx >= batches.length) return;
      const offset = idx * size;
      const res = await runBatch(llm, batches[idx], offset, mapping, opts.maxRetries);
      imported.push(...res.imported);
      skipped.push(...res.skipped);
      onBatch({ batchIndex: idx + 1, totalBatches: batches.length, imported: res.imported, skipped: res.skipped });
    }
  }

  const workers = Array.from({ length: Math.min(opts.concurrency, batches.length) }, () => worker());
  await Promise.all(workers);

  return {
    total: rows.length,
    imported, skipped,
    importedCount: imported.length,
    skippedCount: skipped.length,
  };
}
