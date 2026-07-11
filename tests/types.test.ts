import { describe, it, expect } from "vitest";
import { CRM_STATUSES, DATA_SOURCES, CRM_FIELDS } from "@/lib/types";

describe("enum constants", () => {
  it("has the 4 crm statuses", () => {
    expect(CRM_STATUSES).toEqual([
      "GOOD_LEAD_FOLLOW_UP",
      "DID_NOT_CONNECT",
      "BAD_LEAD",
      "SALE_DONE",
    ]);
  });
  it("has the 5 data sources", () => {
    expect(DATA_SOURCES).toEqual([
      "leads_on_demand",
      "meridian_tower",
      "eden_park",
      "varah_swamy",
      "sarjapur_plots",
    ]);
  });
  it("lists all 15 crm fields", () => {
    expect(CRM_FIELDS).toHaveLength(15);
    expect(CRM_FIELDS).toContain("mobile_without_country_code");
  });
});
