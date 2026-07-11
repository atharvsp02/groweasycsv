"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { UploadCloud, Download, FileText } from "lucide-react";
import { downloadSampleCsv } from "@/lib/sample-csv";

const SUGGESTED_HEADERS =
  "created_at, name, email, country_code, mobile, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description";

export function UploadZone({ onFile }: { onFile: (file: File, text: string) => void }) {
  const [error, setError] = useState("");

  const onDrop = useCallback(async (accepted: File[], rejected: unknown[]) => {
    setError("");
    if (rejected.length > 0) { setError("Only .csv files are accepted."); return; }
    const file = accepted[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Only .csv files are accepted."); return; }
    onFile(file, await file.text());
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/csv": [".csv"] }, multiple: false,
  });
  const { onDrag: _onDrag, onDragStart: _onDragStart, onDragEnd: _onDragEnd, onAnimationStart: _onAnimationStart, ...rootProps } = getRootProps();

  return (
    <div className="space-y-4">
      <motion.div
        {...rootProps}
        animate={{ scale: isDragActive ? 1.01 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-teal-brand bg-teal-brand/5" : "border-gray-300 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40"}`}>
        <input {...getInputProps()} />
        <div className="mx-auto mb-3 grid place-items-center w-12 h-12 rounded-lg bg-teal-brand/10 text-teal-brand">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="font-semibold">Drop your CSV file here</p>
        <p className="text-sm text-gray-400 dark:text-gray-400">or click to browse files</p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-400 dark:bg-gray-800 dark:text-gray-400">
          <FileText className="w-3 h-3" /> supported format: .csv
        </span>
      </motion.div>

      <p className="text-xs leading-relaxed text-gray-400 dark:text-gray-400">
        <span className="font-medium text-gray-500 dark:text-gray-400">Suggested headers:</span> {SUGGESTED_HEADERS}
      </p>

      <button
        type="button"
        onClick={downloadSampleCsv}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
        <Download className="w-4 h-4" /> Download Sample CSV Template
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
}
