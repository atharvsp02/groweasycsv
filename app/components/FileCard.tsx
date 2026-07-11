"use client";
import { motion } from "framer-motion";
import { FileSpreadsheet, X } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function FileCard({ name, size, onRemove }: { name: string; size: number; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-teal-brand/10 text-teal-brand">
        <FileSpreadsheet className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-400">{formatSize(size)}</p>
      </div>
      <button onClick={onRemove} className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200" aria-label="Remove file">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
