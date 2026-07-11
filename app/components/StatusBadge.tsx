import type { CrmStatus } from "@/lib/types";

const STYLES: Record<CrmStatus, { label: string; cls: string }> = {
  GOOD_LEAD_FOLLOW_UP: { label: "Good Lead", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  SALE_DONE: { label: "Sale Done", cls: "bg-slate-800 text-white" },
  DID_NOT_CONNECT: { label: "Not Connected", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  BAD_LEAD: { label: "Bad Lead", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: CrmStatus | "" }) {
  const s = status ? STYLES[status] : undefined;
  if (!s) return <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">-</span>;
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
