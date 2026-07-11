import { describe, it, expect } from "vitest";
import { recordsToCsv, recordsToJson, skippedToCsv } from "@/lib/export";
import { CRM_FIELDS, type CRMRecord, type SkippedRow } from "@/lib/types";

function makeRecord(overrides: Partial<CRMRecord>): CRMRecord {
  const base = Object.fromEntries(CRM_FIELDS.map((f) => [f, ""])) as unknown as CRMRecord;
  return { ...base, ...overrides };
}

describe("recordsToCsv", () => {
  it("emits the 15 header columns in exact order", () => {
    const csv = recordsToCsv([makeRecord({ name: "Jo" })]);
    expect(csv.split("\n")[0]).toBe(CRM_FIELDS.join(","));
  });

  it("quotes fields containing commas or quotes and keeps one row per record", () => {
    const csv = recordsToCsv([makeRecord({ name: "Doe, John", crm_note: 'say "hi"' })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"Doe, John"');
    expect(lines[1]).toContain('"say ""hi"""');
  });

  it("does not reintroduce raw newlines from already-escaped notes", () => {
    const csv = recordsToCsv([makeRecord({ name: "A", email: "a@x.com", crm_note: "line1\\nline2" })]);
    expect(csv.split("\n")).toHaveLength(2);
  });
});

describe("recordsToJson", () => {
  it("produces valid JSON of the records", () => {
    const parsed = JSON.parse(recordsToJson([makeRecord({ name: "Jo", email: "jo@x.com" })]));
    expect(parsed[0].name).toBe("Jo");
    expect(parsed[0].email).toBe("jo@x.com");
  });
});

describe("skippedToCsv", () => {
  it("includes row_index, the raw columns, and skip_reason", () => {
    const rows: SkippedRow[] = [
      { rowIndex: 3, reason: "no contact", raw: { Name: "Ghost", City: "Pune" } },
    ];
    const csv = skippedToCsv(rows);
    const header = csv.split("\n")[0];
    expect(header).toBe("row_index,Name,City,skip_reason");
    expect(csv.split("\n")[1]).toBe("3,Ghost,Pune,no contact");
  });
});
