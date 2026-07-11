"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function ImportModal(
  { open, title, subtitle, onClose, children, footer }:
  { open: boolean; title: string; subtitle: string; onClose: () => void; children: ReactNode; footer: ReactNode },
) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/40" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-100 p-5 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm text-gray-400 dark:text-gray-400">{subtitle}</p>
              </div>
              <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200" /></button>
            </div>
            <div className="p-5">{children}</div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-5 dark:border-gray-800">{footer}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
