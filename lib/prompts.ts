import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES, type RawCSVRow, type HeaderMapping } from "@/lib/types";

const FIELD_DOCS: Record<string, string> = {
  created_at: "Lead creation date (must be parseable by new Date())",
  name: "Lead full name",
  email: "Primary email",
  country_code: "Phone country code, e.g. +91",
  mobile_without_country_code: "Mobile number without country code",
  company: "Company name",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead owner (may be a person or an email address)",
  crm_status: "Lead status (enum below)",
  crm_note: "Remarks, follow-ups, extra emails/phones, anything that fits nowhere else",
  data_source: "Source (enum below)",
  possession_time: "Property possession time",
  description: "Additional free-text description",
};

const fieldList = () => CRM_FIELDS.map((f) => `- ${f}: ${FIELD_DOCS[f]}`).join("\n");

export function buildHeaderInferencePrompt(headers: string[], sampleRows: RawCSVRow[]): string {
  return `You map messy CSV columns to a fixed CRM schema.

CRM fields:
${fieldList()}

CSV headers: ${JSON.stringify(headers)}
Sample rows (first few): ${JSON.stringify(sampleRows.slice(0, 5))}

Return a JSON object with:
- "mapping": an object mapping EACH source header to one CRM field name, or "unmapped".
- "confidence": "high" | "medium" | "low".
Map by meaning, not exact text (e.g. "Ph No" -> mobile_without_country_code, "Loc" -> city).`;
}

export function buildExtractionPrompt(rows: RawCSVRow[], mapping: HeaderMapping): string {
  return `Extract CRM records from these CSV rows.

Suggested column mapping (a hint, override per-row when clearly wrong):
${JSON.stringify(mapping, null, 2)}

CRM fields to produce:
${fieldList()}

RULES:
- crm_status MUST be one of: ${CRM_STATUSES.join(", ")}, else "".
- data_source MUST be one of: ${DATA_SOURCES.join(", ")}, else "". If none match confidently, leave blank.
- If multiple emails exist, put the FIRST in email and mention the rest in crm_note.
- If multiple mobile numbers exist, put the FIRST in mobile_without_country_code and mention the rest in crm_note.
- Put remarks/comments/notes and any meaningful unmapped column into crm_note.
- created_at must be a date string parseable by JavaScript new Date().
- ONLY skip a row when it has NEITHER an email NOR a mobile number. Never skip for any other reason (invalid status, invalid source, missing company, bad date). Blank those fields instead and still return the row as a record.
- Return a record for EVERY row that has an email or a mobile number, even if its other fields are messy or missing.
- Never invent enum values or fabricate emails/phones.

Rows (0-indexed): ${JSON.stringify(rows)}

Return JSON: { "records": RawExtractedRecord[], "skipped": [{ "rowIndex": number, "reason": string }] }.
Each record is an object using the CRM field names above, plus a numeric "rowIndex" equal to the 0-based position of that row in the list above. Omit CRM fields you cannot fill, but always include rowIndex.`;
}
