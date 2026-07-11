import Papa from "papaparse";
import type { RawCSVRow } from "@/lib/types";

export function parseCsv(text: string): { rows: RawCSVRow[]; headers: string[] } {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { rows: [], headers: [] };
  const result = Papa.parse<RawCSVRow>(trimmed, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields?.map((f) => f.trim()) ?? [];
  const rows = (result.data ?? []).filter(
    (r) => Object.values(r).some((v) => (v ?? "").toString().trim() !== ""),
  );
  return { rows, headers };
}
