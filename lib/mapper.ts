import { z } from "zod";
import type { LLMProvider } from "@/lib/llm";
import { buildHeaderInferencePrompt } from "@/lib/prompts";
import type { RawCSVRow, HeaderInferenceResult } from "@/lib/types";

const mappingSchema = z.object({
  mapping: z.record(z.string(), z.string()),
  confidence: z.enum(["high", "medium", "low"]).catch("low"),
}) as unknown as z.ZodType<HeaderInferenceResult>;

export async function inferHeaderMapping(
  llm: LLMProvider, headers: string[], sampleRows: RawCSVRow[],
): Promise<HeaderInferenceResult> {
  if (headers.length === 0) return { mapping: {}, confidence: "low" };
  try {
    return await llm.generateJson(buildHeaderInferencePrompt(headers, sampleRows), mappingSchema);
  } catch {
    return { mapping: {}, confidence: "low" };
  }
}
