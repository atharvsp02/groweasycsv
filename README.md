# GrowEasy AI CSV Importer

Upload any messy CSV of leads and this app uses an LLM to map arbitrary column layouts onto a fixed 15-field GrowEasy CRM schema, enforces the CRM business rules in code, and streams the imported and skipped results back live.

The hard part is not parsing CSV. It is reliably mapping unpredictable, inconsistent column names and value formats (Facebook exports, Google Ads exports, real-estate CRM dumps, hand-made spreadsheets) into one clean schema, and never trusting the model to enforce the rules that must always hold.

**Live demo:** https://groweasycsvexport.vercel.app/
**Default AI model:** OpenRouter `openai/gpt-4o-mini` (primary), with Gemini `gemini-2.5-flash-lite` as automatic fallback.

---

## Features

- Upload via drag-and-drop or file picker, `.csv` only, with inline rejection of anything else, plus a downloadable sample-CSV template to try instantly.
- Client-side preview of every row in a virtualized table (no AI call at this step).
- A single confirm sends the raw CSV to the backend, which parses and runs a two-stage AI pipeline.
- Live progress over Server-Sent Events ("Processing batch 2 of 3...") with results filling in as each batch completes.
- Results split into imported records and skipped rows, each skip carrying a reason.
- Sortable, searchable results table with per-cell tooltips; a detail drawer to view and **edit** any extracted record inline.
- **AI mapping transparency** panel showing how each source column was mapped to a CRM field.
- **Export** imported records as CSV (exact 15-field schema) or JSON, and skipped rows as CSV.
- Fully responsive (desktop + mobile) with a light/dark theme.
- Every field validated and normalized in code before it counts as imported.
- Two LLM providers (OpenRouter and Gemini) behind one interface, with **automatic fallback**: if the primary is rate-limited, the batch transparently retries on the secondary.
- **Dark mode** with a toggle, system-preference detection, and persisted choice (no flash on load).

---

## Tech stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS v4, lucide-react icons, framer-motion animations
- papaparse (client preview and server-side authoritative parse)
- @tanstack/react-table + @tanstack/react-virtual for large tables
- zod for LLM output and business-rule validation
- Vitest for unit tests
- Deploys as a single Vercel project

---

## Architecture

### Two-stage AI extraction

**Stage A, header inference (one LLM call per file).** The headers plus a few sample rows are sent to the model, which returns a `source_column -> crm_field` mapping. This is cheap and gives a consistent mapping applied across the whole file, rather than re-guessing the layout on every batch.

**Stage B, batched extraction (N rows per call).** The inferred mapping is passed as a hint (the model may override it per row), along with the raw rows, and the model returns structured records plus any rows it wants skipped. Output is forced to JSON and validated against a zod schema; a batch that returns unparseable output is retried, and a permanently failing batch marks its rows skipped rather than failing the whole import.

Batches run through a small worker pool with a concurrency cap. Batch size (40) and concurrency (3) are configurable via env.

### Rules are enforced in code, never trusted to the model

`validateAndNormalizeRecord()` runs on every extracted record and is the highest-value, most-tested part of the codebase. It clamps enums, validates and reparses dates, splits and normalizes phone numbers, aggregates extra emails/phones/remarks into `crm_note`, escapes embedded newlines so each record stays a single CSV row, and applies the skip rule. If the model invents a status, fabricates a date, or returns two phone numbers in one cell, the code corrects it.

### Streaming, and why

A large file cannot be processed inside a single fast serverless response, and a plain request/response cannot show real progress. The import endpoint streams Server-Sent Events: a `header-mapping` event, then a `batch` event per completed batch (driving the real progress bar and the incrementally-filling results table), then a `done` event. `maxDuration` is set to 60s, the Vercel Hobby ceiling.

### Provider abstraction

`lib/llm.ts` exposes one `LLMProvider` interface with two adapters: OpenRouter (via the OpenAI SDK pointed at `https://openrouter.ai/api/v1`, using `response_format: json_object`) and Gemini (via `@google/genai`, using JSON response mode). Both parse the model output and validate it against the same zod schema. `LLM_PROVIDER` picks the primary; when both keys are set, the other provider becomes an automatic fallback, so a rate-limited or failing primary does not fail the import. Batch retries are rate-limit-aware (longer backoff on HTTP 429).

---

## Business rules

| Rule | Behavior |
| --- | --- |
| crm_status | Must be one of the 4 allowed values, else blank. Invented values are dropped. |
| data_source | Must be one of the 5 allowed values, else blank. No fuzzy guessing. |
| created_at | Must parse via `new Date()`, else a deterministic date-fns reparse, else blank. |
| Multiple emails | Keep the first, append the rest to `crm_note`. |
| Multiple phones | Keep the first, append the rest to `crm_note`. |
| Phone / country code | Split combined numbers (for example `+919876543210` into `+91` and `9876543210`). |
| crm_note | Collects remarks, comments, extra emails/phones, and meaningful unmapped columns. |
| CSV safety | Newlines in text fields are escaped to `\n` so each record stays one CSV row. |
| Skip rule | A row with neither a valid email nor a valid mobile is skipped, with a reason. |

---

## Getting started

### 1. Configure environment

```bash
cp .env.example .env.local
```

Then set at least one provider key in `.env.local`:

- **OpenRouter (recommended, default):** get a key at https://openrouter.ai/keys, set `OPENROUTER_API_KEY`. Keep `LLM_PROVIDER=openrouter`. Optionally change `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`).
- **Gemini (optional fallback):** get a key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` (default `gemini-2.5-flash-lite`).

Optional tuning: `BATCH_SIZE` (default 40), `CONCURRENCY` (default 3).

### 2. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Import Leads**, and upload a CSV.

### 3. Run with Docker (optional)

The app builds to a self-contained Next.js standalone image. Keys are passed at runtime, never baked into the image.

```bash
# with docker compose (reads .env.local)
docker compose up --build

# or plain docker
docker build -t groweasy-csv-importer .
docker run -p 3000:3000 --env-file .env.local groweasy-csv-importer
```

---

## Testing

```bash
npm run test        # unit tests (Vitest)
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

The unit tests focus on `lib/validate.ts` (enum clamping, date reparse, multi-email/multi-phone aggregation, phone splitting, newline escaping, the skip rule) and `lib/extractor.ts` (batching, retries, partial-failure handling, and correct global row indexing across batches).

### Sample CSVs

- `samples/facebook_export.csv` - Facebook-style headers.
- `samples/messy_manual.csv` - inconsistent casing, merged fields, multiple phones in one cell, an embedded newline in a remark, and rows missing all contact info.
- `samples/real_estate_crm.csv` - possession columns, source values that only sometimes match the enum, notes, and irrelevant extra columns.
- `sample_leads.csv` (repo root) - a larger 50-row real-estate export mixing every case above for end-to-end review.

---

## Project structure

```
app/
  api/import/route.ts        SSE streaming import endpoint
  components/                Sidebar, ImportModal, UploadZone, FileCard,
                             PreviewTable, ResultsTable, SkippedTable, StatusBadge,
                             ImportProgress, MappingPanel, ThemeToggle
  page.tsx                   dashboard shell + modal + results orchestration
lib/
  csv.ts                     CSV parsing (client + server)
  llm.ts                     provider-agnostic client (OpenRouter + Gemini, with fallback)
  prompts.ts                 Stage A / Stage B prompt builders
  mapper.ts                  Stage A header inference
  extractor.ts               Stage B batch extraction + retry
  validate.ts                zod schemas + validateAndNormalizeRecord()
  export.ts                  CSV/JSON export of imported + skipped records
  sample-csv.ts              downloadable sample CSV template
  types.ts                   shared types + enums
tests/                       Vitest suites (validate, extractor, csv, export, llm, prompts, types)
samples/                     example CSVs
```

---

## Known limitations and tradeoffs

- **Stateless.** No database or persistence; each import is independent. This keeps the deploy simple and was a deliberate choice for the assignment.
- **Very large files.** The whole file is one streamed request bounded by the 60s Vercel Hobby window. Files in the many-hundreds-to-1000+ rows can approach that limit. The production path is to chunk the file into sequential streamed segments on the client and aggregate; that is noted but not built here.
- **Non-Indian phone formats.** Country-code splitting is tuned for Indian numbers (10-digit local part). Numbers from locales with a different local-number length are handled approximately.
- **Free-tier rate limits.** OpenRouter's free tier offers affordable credits; if rate limits are hit, the app automatically falls back to Gemini so imports still complete.

---

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Set the environment variables from `.env.example` (`LLM_PROVIDER`, at least one provider key; optionally `OPENROUTER_MODEL` / `GEMINI_MODEL`, `BATCH_SIZE`, `CONCURRENCY`).