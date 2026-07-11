export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;
export type CrmStatus = (typeof CRM_STATUSES)[number];

export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

export const CRM_FIELDS: (keyof CRMRecord)[] = [
  "created_at", "name", "email", "country_code", "mobile_without_country_code",
  "company", "city", "state", "country", "lead_owner", "crm_status",
  "crm_note", "data_source", "possession_time", "description",
];

export type RawCSVRow = Record<string, string>;

export type RawExtractedRecord = Partial<Record<keyof CRMRecord, string>>;

export interface SkippedRow {
  rowIndex: number;
  reason: string;
  raw: RawCSVRow;
}

export interface ImportResult {
  total: number;
  imported: CRMRecord[];
  skipped: SkippedRow[];
  importedCount: number;
  skippedCount: number;
}

export type HeaderMapping = Record<string, keyof CRMRecord | "unmapped">;

export interface HeaderInferenceResult {
  mapping: HeaderMapping;
  confidence: "high" | "medium" | "low";
}

export type ValidationOutcome =
  | { ok: true; record: CRMRecord }
  | { ok: false; reason: string };
