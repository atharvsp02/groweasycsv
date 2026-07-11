import { describe, it, expect } from "vitest";
import {
  escapeNewlines, extractEmails, extractPhones,
  coerceCrmStatus, coerceDataSource, normalizeDate,
  validateAndNormalizeRecord,
} from "@/lib/validate";

describe("escapeNewlines", () => {
  it("replaces raw newlines with literal backslash-n", () => {
    expect(escapeNewlines("a\nb\r\nc")).toBe("a\\nb\\nc");
    expect(escapeNewlines("plain")).toBe("plain");
  });
});

describe("extractEmails", () => {
  it("pulls multiple emails from a messy string", () => {
    expect(extractEmails("a@x.com; b@y.co , junk")).toEqual(["a@x.com", "b@y.co"]);
  });
  it("returns empty for no email", () => {
    expect(extractEmails("no email here")).toEqual([]);
  });
});

describe("extractPhones", () => {
  it("splits country code from a +91 number", () => {
    expect(extractPhones("+919876543210")).toEqual([
      { countryCode: "+91", number: "9876543210" },
    ]);
  });
  it("returns number with blank country code when no +", () => {
    expect(extractPhones("9876543210")).toEqual([
      { countryCode: "", number: "9876543210" },
    ]);
  });
  it("finds multiple numbers", () => {
    const r = extractPhones("9876543210 / 9123456780");
    expect(r).toHaveLength(2);
  });
  it("ignores short non-phone digit noise", () => {
    expect(extractPhones("apt 12")).toEqual([]);
  });
  it("splits country code from a number without a leading +", () => {
    expect(extractPhones("919876543210")).toEqual([
      { countryCode: "+91", number: "9876543210" },
    ]);
  });
  it("strips a leading zero without inferring a country code", () => {
    expect(extractPhones("09876543210")).toEqual([
      { countryCode: "", number: "9876543210" },
    ]);
  });
});

describe("coerceCrmStatus / coerceDataSource", () => {
  it("accepts exact enum values", () => {
    expect(coerceCrmStatus("SALE_DONE")).toBe("SALE_DONE");
    expect(coerceDataSource("eden_park")).toBe("eden_park");
  });
  it("normalizes case", () => {
    expect(coerceCrmStatus("sale_done")).toBe("SALE_DONE");
    expect(coerceDataSource("Eden_Park")).toBe("eden_park");
  });
  it("blanks invented values", () => {
    expect(coerceCrmStatus("HOT_LEAD")).toBe("");
    expect(coerceDataSource("random_source")).toBe("");
  });
});

describe("normalizeDate", () => {
  it("passes through an ISO datetime", () => {
    expect(normalizeDate("2026-05-13 14:20:48")).not.toBe("");
    expect(new Date(normalizeDate("2026-05-13 14:20:48")).toString()).not.toBe("Invalid Date");
  });
  it("reparses a d/m/y date", () => {
    const out = normalizeDate("13/05/2026");
    expect(new Date(out).toString()).not.toBe("Invalid Date");
  });
  it("blanks an unparseable string", () => {
    expect(normalizeDate("not a date")).toBe("");
  });
});

describe("validateAndNormalizeRecord", () => {
  it("keeps first email, appends the rest to crm_note", () => {
    const out = validateAndNormalizeRecord(
      { email: "a@x.com, b@y.com", name: "Jo" }, 0);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.record.email).toBe("a@x.com");
      expect(out.record.crm_note).toContain("b@y.com");
    }
  });
  it("keeps first mobile, appends the rest to crm_note", () => {
    const out = validateAndNormalizeRecord(
      { mobile_without_country_code: "9876543210, 9123456780" }, 0);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.record.mobile_without_country_code).toBe("9876543210");
      expect(out.record.crm_note).toContain("9123456780");
    }
  });
  it("splits country code out of a combined mobile", () => {
    const out = validateAndNormalizeRecord(
      { mobile_without_country_code: "+919876543210" }, 0);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.record.country_code).toBe("+91");
      expect(out.record.mobile_without_country_code).toBe("9876543210");
    }
  });
  it("skips a record with neither email nor mobile", () => {
    const out = validateAndNormalizeRecord({ name: "No Contact" }, 7);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/email|mobile/i);
  });
  it("escapes embedded newlines so record stays one CSV row", () => {
    const out = validateAndNormalizeRecord(
      { email: "a@x.com", crm_note: "line1\nline2", description: "d1\r\nd2" }, 0);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.record.crm_note).not.toMatch(/[\r\n]/);
      expect(out.record.description).not.toMatch(/[\r\n]/);
      expect(out.record.crm_note).toContain("\\n");
    }
  });
  it("blanks an invalid crm_status and data_source", () => {
    const out = validateAndNormalizeRecord(
      { email: "a@x.com", crm_status: "MAYBE", data_source: "facebook" }, 0);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.record.crm_status).toBe("");
      expect(out.record.data_source).toBe("");
    }
  });
  it("blanks an unparseable created_at", () => {
    const out = validateAndNormalizeRecord(
      { email: "a@x.com", created_at: "someday" }, 0);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.record.created_at).toBe("");
  });
});
