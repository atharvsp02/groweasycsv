import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { FallbackProvider } from "@/lib/llm";
import type { LLMProvider } from "@/lib/llm";

const schema = z.object({ ok: z.boolean() });

function provider(impl: () => Promise<unknown>): LLMProvider {
  return { generateJson: vi.fn(impl) as LLMProvider["generateJson"] };
}

describe("FallbackProvider", () => {
  it("returns the primary result and does not call the secondary when the primary succeeds", async () => {
    const primary = provider(async () => ({ ok: true }));
    const secondary = provider(async () => ({ ok: false }));
    const fp = new FallbackProvider([primary, secondary]);
    const result = await fp.generateJson("prompt", schema);
    expect(result).toEqual({ ok: true });
    expect(secondary.generateJson).not.toHaveBeenCalled();
  });

  it("falls back to the secondary when the primary throws a rate-limit error", async () => {
    const primary = provider(async () => { throw new Error("429 RESOURCE_EXHAUSTED"); });
    const secondary = provider(async () => ({ ok: true }));
    const fp = new FallbackProvider([primary, secondary]);
    const result = await fp.generateJson("prompt", schema);
    expect(result).toEqual({ ok: true });
    expect(primary.generateJson).toHaveBeenCalledOnce();
    expect(secondary.generateJson).toHaveBeenCalledOnce();
  });

  it("throws the last error when every provider fails", async () => {
    const primary = provider(async () => { throw new Error("primary down"); });
    const secondary = provider(async () => { throw new Error("secondary down"); });
    const fp = new FallbackProvider([primary, secondary]);
    await expect(fp.generateJson("prompt", schema)).rejects.toThrow("secondary down");
  });
});
