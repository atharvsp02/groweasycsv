import { z } from "zod";
import { parse as parseDate, isValid } from "date-fns";
import {
  CRM_STATUSES, DATA_SOURCES, CRM_FIELDS,
  type CrmStatus, type DataSource, type CRMRecord,
  type RawExtractedRecord, type ValidationOutcome,
} from "@/lib/types";

const EMAIL_RE = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/g;

export function escapeNewlines(s: string): string {
  return s.replace(/\r\n|\r|\n/g, "\\n");
}

export function extractEmails(s: string): string[] {
  if (!s) return [];
  return (s.match(EMAIL_RE) ?? []).map((e) => e.trim());
}

export function extractPhones(s: string): { countryCode: string; number: string }[] {
  if (!s) return [];
  const matches = s.match(PHONE_RE) ?? [];
  const out: { countryCode: string; number: string }[] = [];
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8) continue;
    if (digits.length > 10) {
      const number = digits.slice(-10);
      const ccDigits = digits.slice(0, -10).replace(/^0+/, "");
      const countryCode = ccDigits ? "+" + ccDigits : "";
      out.push({ countryCode, number });
    } else {
      out.push({ countryCode: "", number: digits });
    }
  }
  return out;
}

export function coerceCrmStatus(s: string): CrmStatus | "" {
  const up = (s ?? "").trim().toUpperCase();
  return (CRM_STATUSES as readonly string[]).includes(up) ? (up as CrmStatus) : "";
}

export function coerceDataSource(s: string): DataSource | "" {
  const low = (s ?? "").trim().toLowerCase();
  return (DATA_SOURCES as readonly string[]).includes(low) ? (low as DataSource) : "";
}

const DATE_FORMATS = [
  "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd",
  "dd/MM/yyyy", "MM/dd/yyyy", "dd-MM-yyyy", "dd/MM/yyyy HH:mm",
  "dd MMM yyyy", "MMM dd, yyyy",
];

export function normalizeDate(s: string): string {
  const raw = (s ?? "").trim();
  if (!raw) return "";
  if (!Number.isNaN(new Date(raw).getTime())) return raw;
  for (const fmt of DATE_FORMATS) {
    const d = parseDate(raw, fmt, new Date(2000, 0, 1));
    if (isValid(d)) return d.toISOString();
  }
  return "";
}

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export function validateAndNormalizeRecord(
  raw: RawExtractedRecord, _rowIndex: number,
): ValidationOutcome {
  const noteParts: string[] = [];
  if (raw.crm_note) noteParts.push(str(raw.crm_note));

  const emails = extractEmails(str(raw.email));
  const email = emails[0] ?? "";
  if (emails.length > 1) noteParts.push("Alt emails: " + emails.slice(1).join(", "));

  const phones = extractPhones(str(raw.mobile_without_country_code));
  const first = phones[0];
  let countryCode = str(raw.country_code).trim();
  let mobile = "";
  if (first) {
    mobile = first.number;
    if (!countryCode && first.countryCode) countryCode = first.countryCode;
    if (phones.length > 1) {
      noteParts.push("Alt mobiles: " + phones.slice(1).map((p) => p.number).join(", "));
    }
  }
  if (countryCode && !countryCode.startsWith("+")) countryCode = "+" + countryCode.replace(/\D/g, "");

  if (!email && !mobile) {
    return { ok: false, reason: "no valid email or mobile number found" };
  }

  const record: CRMRecord = {
    created_at: normalizeDate(str(raw.created_at)),
    name: str(raw.name).trim(),
    email,
    country_code: countryCode,
    mobile_without_country_code: mobile,
    company: str(raw.company).trim(),
    city: str(raw.city).trim(),
    state: str(raw.state).trim(),
    country: str(raw.country).trim(),
    lead_owner: str(raw.lead_owner).trim(),
    crm_status: coerceCrmStatus(str(raw.crm_status)),
    crm_note: escapeNewlines(noteParts.filter(Boolean).join(" | ")),
    data_source: coerceDataSource(str(raw.data_source)),
    possession_time: str(raw.possession_time).trim(),
    description: escapeNewlines(str(raw.description).trim()),
  };
  return { ok: true, record };
}

export const rawExtractedRecordSchema = z
  .object(Object.fromEntries(CRM_FIELDS.map((f) => [f, z.string().optional()])))
  .partial() as z.ZodType<RawExtractedRecord>;
