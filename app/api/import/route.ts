import { parseCsv } from "@/lib/csv";
import { getLLM } from "@/lib/llm";
import { inferHeaderMapping } from "@/lib/mapper";
import { extractBatches } from "@/lib/extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const csvText = await req.text();
  const { rows, headers } = parseCsv(csvText);

  if (headers.length === 0) {
    return Response.json({ error: "CSV is empty or has no header row" }, { status: 400 });
  }
  if (rows.length === 0) {
    return Response.json({ error: "CSV has headers but no data rows" }, { status: 400 });
  }

  const batchSize = Number(process.env.BATCH_SIZE ?? 40);
  const concurrency = Number(process.env.CONCURRENCY ?? 3);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const llm = getLLM();
        const totalBatches = Math.ceil(rows.length / Math.max(1, batchSize));
        const { mapping } = await inferHeaderMapping(llm, headers, rows.slice(0, 5));
        send("header-mapping", { mapping, total: rows.length, totalBatches });

        const result = await extractBatches(
          llm,
          rows,
          mapping,
          { batchSize, concurrency, maxRetries: 3 },
          (u) =>
            send("batch", {
              batchIndex: u.batchIndex,
              totalBatches: u.totalBatches,
              imported: u.imported,
              skipped: u.skipped,
            }),
        );
        send("done", {
          total: result.total,
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
        });
      } catch (err) {
        console.error("import failed:", err);
        send("error", { message: "AI processing failed. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
