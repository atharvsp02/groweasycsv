import { describe, it, expect, vi } from "vitest";
import { extractBatches } from "@/lib/extractor";
import type { LLMProvider } from "@/lib/llm";
import type { RawCSVRow } from "@/lib/types";

function mockLLM(handler: (prompt: string) => unknown): LLMProvider {
  const generateJson = vi.fn(
    (_p: string, schema: { parse: (v: unknown) => unknown }) => Promise.resolve(schema.parse(handler(_p))),
  ) as LLMProvider["generateJson"];
  return { generateJson };
}

const rows: RawCSVRow[] = [
  { Name: "Jo", Email: "jo@x.com" },
  { Name: "NoContact" },
];

describe("extractBatches", () => {
  it("validates records and reports skips", async () => {
    const llm = mockLLM(() => ({
      records: [{ name: "Jo", email: "jo@x.com" }],
      skipped: [{ rowIndex: 1, reason: "no contact" }],
    }));
    const seen: number[] = [];
    const result = await extractBatches(llm, rows, { Name: "name", Email: "email" },
      { batchSize: 20, concurrency: 2, maxRetries: 1 },
      (u) => seen.push(u.batchIndex));
    expect(result.importedCount).toBe(1);
    expect(result.imported[0].email).toBe("jo@x.com");
    expect(result.skippedCount).toBe(1);
    expect(seen.length).toBeGreaterThan(0);
  });

  it("marks a permanently failing batch's rows as skipped", async () => {
    const llm: LLMProvider = { generateJson: vi.fn(async () => { throw new Error("boom"); }) };
    const result = await extractBatches(llm, rows, {},
      { batchSize: 20, concurrency: 1, maxRetries: 2 }, () => {});
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
    expect(result.skipped[0].reason).toMatch(/processing failed/i);
  });

  it("post-validates: LLM record with no contact is skipped even if LLM returned it", async () => {
    const llm = mockLLM(() => ({ records: [{ name: "Ghost" }], skipped: [] }));
    const result = await extractBatches(llm, [{ Name: "Ghost" }], {},
      { batchSize: 20, concurrency: 1, maxRetries: 1 }, () => {});
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it("reports global rowIndex for llm-declared skips across batches", async () => {
    const rows: RawCSVRow[] = [
      { Name: "Alpha", Email: "a@x.com" },
      { Name: "Bravo", Email: "b@x.com" },
      { Name: "Charlie" },
    ];
    const llm = mockLLM((prompt: string) => {
      if (prompt.includes("Charlie")) {
        return { records: [], skipped: [{ rowIndex: 0, reason: "no contact" }] };
      }
      return { records: [{ name: "Alpha", email: "a@x.com" }, { name: "Bravo", email: "b@x.com" }], skipped: [] };
    });
    const result = await extractBatches(llm, rows, {}, { batchSize: 2, concurrency: 1, maxRetries: 1 }, () => {});
    expect(result.skippedCount).toBe(1);
    expect(result.skipped[0].rowIndex).toBe(2);
    expect(result.skipped[0].raw).toEqual({ Name: "Charlie" });
    expect(result.importedCount).toBe(2);
  });

  it("uses each record's own rowIndex for code-validation skips when the LLM omits a row", async () => {
    const rows3: RawCSVRow[] = [
      { Name: "A", Email: "a@x.com" },
      { Name: "NoContact" },
      { Name: "C" },
    ];
    const llm = mockLLM(() => ({
      records: [
        { rowIndex: 0, name: "A", email: "a@x.com" },
        { rowIndex: 2, name: "C" },
      ],
      skipped: [{ rowIndex: 1, reason: "no contact" }],
    }));
    const result = await extractBatches(llm, rows3, {},
      { batchSize: 20, concurrency: 1, maxRetries: 1 }, () => {});
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(2);
    const codeSkip = result.skipped.find((s) => s.reason !== "no contact");
    expect(codeSkip).toBeDefined();
    expect(codeSkip!.rowIndex).toBe(2);
    expect(codeSkip!.raw).toEqual({ Name: "C" });
  });

  it("never counts a row as both imported and skipped (imported + skipped == total)", async () => {
    const rows3: RawCSVRow[] = [
      { Name: "Al", Email: "al@x.com" },
      { Name: "Bo", Email: "bo@x.com" },
      { Name: "Cy", Email: "cy@x.com" },
    ];
    const llm = mockLLM(() => ({
      records: [
        { rowIndex: 0, name: "Al", email: "al@x.com" },
        { rowIndex: 1, name: "Bo", email: "bo@x.com" },
        { rowIndex: 2, name: "Cy", email: "cy@x.com" },
      ],
      skipped: [{ rowIndex: 1, reason: "duplicate declared skip" }],
    }));
    const result = await extractBatches(llm, rows3, {},
      { batchSize: 20, concurrency: 1, maxRetries: 1 }, () => {});
    expect(result.importedCount + result.skippedCount).toBe(3);
    expect(result.importedCount).toBe(3);
    expect(result.skippedCount).toBe(0);
  });

  it("marks rows the AI never returned as skipped", async () => {
    const rows3: RawCSVRow[] = [
      { Name: "One", Email: "one@x.com" },
      { Name: "Two", Email: "two@x.com" },
      { Name: "Three", Email: "three@x.com" },
    ];
    const llm = mockLLM(() => ({
      records: [{ rowIndex: 0, name: "One", email: "one@x.com" }],
      skipped: [],
    }));
    const result = await extractBatches(llm, rows3, {},
      { batchSize: 20, concurrency: 1, maxRetries: 1 }, () => {});
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(2);
    expect(result.importedCount + result.skippedCount).toBe(3);
  });
});
