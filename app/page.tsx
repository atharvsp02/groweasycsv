"use client";
import { useMemo, useState } from "react";
import { Upload, Download, FileJson } from "lucide-react";
import { parseCsv } from "@/lib/csv";
import { downloadRecordsCsv, downloadRecordsJson, downloadSkippedCsv } from "@/lib/export";
import { Sidebar } from "@/app/components/Sidebar";
import { ImportModal } from "@/app/components/ImportModal";
import { UploadZone } from "@/app/components/UploadZone";
import { FileCard } from "@/app/components/FileCard";
import { PreviewTable } from "@/app/components/PreviewTable";
import { ResultsTable } from "@/app/components/ResultsTable";
import { SkippedTable } from "@/app/components/SkippedTable";
import { MappingPanel } from "@/app/components/MappingPanel";
import { ImportProgress, runImport } from "@/app/components/ImportProgress";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import type { CRMRecord, SkippedRow, HeaderMapping } from "@/lib/types";

type Phase = "empty" | "file" | "processing";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("empty");
  const [csvText, setCsvText] = useState("");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [progress, setProgress] = useState({ batchIndex: 0, totalBatches: 0 });
  const [imported, setImported] = useState<CRMRecord[]>([]);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);
  const [mapping, setMapping] = useState<HeaderMapping>({});
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [showSkipped, setShowSkipped] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const parsed = useMemo(() => (csvText ? parseCsv(csvText) : { rows: [], headers: [] }), [csvText]);

  function openModal() {
    setModalOpen(true); setPhase("empty"); setCsvText(""); setFile(null); setError("");
  }
  function handleFile(f: File, text: string) {
    setCsvText(text); setFile({ name: f.name, size: f.size }); setPhase("file"); setError("");
  }
  function clearFile() { setCsvText(""); setFile(null); setPhase("empty"); }

  function updateRecord(index: number, record: CRMRecord) {
    setImported((prev) => prev.map((r, i) => (i === index ? record : r)));
  }

  async function confirmImport() {
    setPhase("processing");
    setImported([]); setSkipped([]); setMapping({}); setError("");
    setProgress({ batchIndex: 0, totalBatches: 0 });
    await runImport(csvText, {
      onMapping: (m) => {
        setTotal(m.total);
        setMapping(m.mapping);
        setProgress((p) => ({ ...p, totalBatches: m.totalBatches }));
      },
      onBatch: (u) => {
        setProgress({ batchIndex: u.batchIndex, totalBatches: u.totalBatches });
        setImported((p) => [...p, ...u.imported]);
        setSkipped((p) => [...p, ...u.skipped]);
      },
      onDone: () => { setModalOpen(false); setHasResults(true); },
      onError: (msg) => { setError(msg); setPhase("file"); },
    });
  }

  const footer = (
    <>
      <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
      <button
        onClick={confirmImport}
        disabled={phase !== "file"}
        className="rounded-lg bg-gradient-to-r from-coral to-coral-2 px-5 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">
        Upload File
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <img src="/favicon.ico" alt="GrowEasy" className="w-7 h-7 rounded-lg" />
          <span className="text-lg font-bold">GrowEasy</span>
        </div>

        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Lead Sources</h1>
            <p className="text-gray-400 dark:text-gray-400">Connect, manage, and control your lead channels from one dashboard.</p>
          </div>
          <ThemeToggle />
        </header>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="font-semibold">Import Leads via CSV</p>
            <p className="text-sm text-gray-400 dark:text-gray-400">Upload a CSV file to bulk import leads into your system.</p>
          </div>
          <button
            onClick={openModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-coral to-coral-2 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.02]">
            <Upload className="h-4 w-4" /> Import Leads
          </button>
        </div>

        {hasResults && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-lg border border-gray-200 bg-white px-3 py-1 dark:border-gray-800 dark:bg-gray-900">Total: {total}</span>
              <span className="rounded-lg bg-green-100 px-3 py-1 text-green-700 dark:bg-green-900/40 dark:text-green-300">Imported: {imported.length}</span>
              <span className="rounded-lg bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Skipped: {skipped.length}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={() => downloadRecordsCsv(imported)}
                  disabled={imported.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <Download className="h-4 w-4" /> Export CSV
                </button>
                <button
                  onClick={() => downloadRecordsJson(imported)}
                  disabled={imported.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <FileJson className="h-4 w-4" /> Export JSON
                </button>
              </div>
            </div>

            {Object.keys(mapping).length > 0 && <MappingPanel mapping={mapping} />}

            <ResultsTable records={imported} onUpdate={updateRecord} />

            {skipped.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => setShowSkipped((s) => !s)} className="text-sm font-medium text-gray-600 underline dark:text-gray-200">
                    {showSkipped ? "Hide" : "Show"} {skipped.length} skipped rows
                  </button>
                  <button
                    onClick={() => downloadSkippedCsv(skipped)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                    <Download className="h-4 w-4" /> Download skipped CSV
                  </button>
                </div>
                {showSkipped && (
                  <div className="mt-3">
                    <SkippedTable rows={skipped} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <ImportModal
        open={modalOpen}
        title="Import Leads via CSV"
        subtitle="Upload a CSV file to bulk import leads into your system."
        onClose={() => setModalOpen(false)}
        footer={footer}>
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        {phase === "empty" && <UploadZone onFile={handleFile} />}
        {phase === "file" && file && (
          <div className="space-y-4">
            <FileCard name={file.name} size={file.size} onRemove={clearFile} />
            <PreviewTable rows={parsed.rows} headers={parsed.headers} />
            <p className="text-xs text-gray-400 dark:text-gray-400">{parsed.rows.length} rows detected.</p>
          </div>
        )}
        {phase === "processing" && (
          <ImportProgress
            batchIndex={progress.batchIndex} totalBatches={progress.totalBatches}
            imported={imported.length} skipped={skipped.length} />
        )}
      </ImportModal>
    </div>
  );
}
