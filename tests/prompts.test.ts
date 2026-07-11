import { describe, it, expect } from "vitest";
import { buildHeaderInferencePrompt, buildExtractionPrompt } from "@/lib/prompts";

describe("prompt builders", () => {
  it("header prompt lists all crm fields and the headers", () => {
    const p = buildHeaderInferencePrompt(["Ph No", "e-mail"], [{ "Ph No": "123", "e-mail": "a@x.com" }]);
    expect(p).toContain("mobile_without_country_code");
    expect(p).toContain("Ph No");
  });
  it("extraction prompt includes enum lists and the skip rule", () => {
    const p = buildExtractionPrompt([{ Name: "Jo" }], { Name: "name" });
    expect(p).toContain("GOOD_LEAD_FOLLOW_UP");
    expect(p).toContain("leads_on_demand");
    expect(p).toMatch(/skip/i);
    expect(p).toMatch(/rowIndex/);
  });
});
