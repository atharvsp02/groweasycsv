import Papa from "papaparse";
import { CRM_FIELDS, type CRMRecord, type SkippedRow } from "@/lib/types";

export function recordsToCsv(records: CRMRecord[]): string {
  return Papa.unparse(
    { fields: CRM_FIELDS as string[], data: records.map((r) => CRM_FIELDS.map((f) => r[f] ?? "")) },
    { newline: "\n" },
  );
}

export function recordsToJson(records: CRMRecord[]): string {
  return JSON.stringify(records, null, 2);
}

export function skippedToCsv(rows: SkippedRow[]): string {
  const dataCols = Array.from(new Set(rows.flatMap((r) => Object.keys(r.raw))));
  const fields = ["row_index", ...dataCols, "skip_reason"];
  const data = rows.map((r) => [String(r.rowIndex), ...dataCols.map((c) => r.raw[c] ?? ""), r.reason]);
  return Papa.unparse({ fields, data }, { newline: "\n" });
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadRecordsCsv(records: CRMRecord[]): void {
  downloadText("groweasy_leads.csv", recordsToCsv(records), "text/csv");
}

export function downloadRecordsJson(records: CRMRecord[]): void {
  downloadText("groweasy_leads.json", recordsToJson(records), "application/json");
}

export function downloadSkippedCsv(rows: SkippedRow[]): void {
  downloadText("groweasy_skipped.csv", skippedToCsv(rows), "text/csv");
}
