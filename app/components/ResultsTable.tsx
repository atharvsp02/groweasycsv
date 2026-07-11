"use client";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ChevronRight, ChevronUp, ChevronDown, X, Pencil, Check } from "lucide-react";
import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES, type CRMRecord } from "@/lib/types";
import { StatusBadge } from "@/app/components/StatusBadge";

type SortKey = keyof CRMRecord;

const COLS: { label: string; min: number; grow: number; key: SortKey | null }[] = [
  { label: "LEAD NAME", min: 150, grow: 1.4, key: "name" },
  { label: "EMAIL", min: 200, grow: 2, key: "email" },
  { label: "CONTACT", min: 150, grow: 1.2, key: "mobile_without_country_code" },
  { label: "DATE CREATED", min: 160, grow: 1.2, key: "created_at" },
  { label: "COMPANY", min: 150, grow: 1.4, key: "company" },
  { label: "STATUS", min: 120, grow: 1, key: "crm_status" },
  { label: "ACTIONS", min: 90, grow: 0.6, key: null },
];

interface Row { record: CRMRecord; index: number }

export function ResultsTable({ records, onUpdate }: { records: CRMRecord[]; onUpdate: (index: number, record: CRMRecord) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey | null; dir: 1 | -1 }>({ key: null, dir: 1 });
  const [selected, setSelected] = useState<Row | null>(null);
  const [draft, setDraft] = useState<CRMRecord | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const rows: Row[] = useMemo(
    () => records.map((record, index) => ({ record, index })),
    [records],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ record }) =>
      [record.name, record.email, record.mobile_without_country_code].some((v) => v.toLowerCase().includes(q)));
  }, [rows, query]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const key = sort.key;
    return [...filtered].sort((a, b) => (a.record[key] ?? "").localeCompare(b.record[key] ?? "") * sort.dir);
  }, [filtered, sort]);

  const v = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const minWidth = COLS.reduce((s, c) => s + c.min, 0);
  const template = COLS.map((c) => `minmax(${c.min}px, ${c.grow}fr)`).join(" ");

  function toggleSort(key: SortKey | null) {
    if (!key) return;
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  function closeDrawer() { setSelected(null); setDraft(null); }
  function startEdit() { if (selected) setDraft({ ...selected.record }); }
  function saveEdit() {
    if (selected && draft) {
      onUpdate(selected.index, draft);
      setSelected({ record: draft, index: selected.index });
      setDraft(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="font-semibold">Your Leads</h2>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter email or phone number..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-teal-brand dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500" />
        </div>
      </div>

      <div ref={parentRef} className="overflow-auto max-h-[55vh]">
        <div style={{ minWidth }}>
          <div
            className="sticky top-0 z-10 grid border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
            style={{ gridTemplateColumns: template }}>
            {COLS.map((c) => (
              <button
                key={c.label}
                onClick={() => toggleSort(c.key)}
                disabled={!c.key}
                className={`flex items-center gap-1 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-400 ${c.key ? "hover:text-gray-600 dark:hover:text-gray-200" : "cursor-default"}`}>
                <span className="truncate">{c.label}</span>
                {sort.key === c.key && c.key && (
                  sort.dir === 1 ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />
                )}
              </button>
            ))}
          </div>
          <div style={{ height: v.getTotalSize(), position: "relative" }}>
            {v.getVirtualItems().map((vi) => {
              const { record: r } = sorted[vi.index];
              const contact = [r.country_code, r.mobile_without_country_code].filter(Boolean).join(" ");
              return (
                <motion.div
                  key={vi.index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute left-0 right-0 grid items-center border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  style={{ top: 0, transform: `translateY(${vi.start}px)`, height: vi.size, gridTemplateColumns: template }}>
                  <div className="truncate px-4 text-gray-800 dark:text-gray-100" title={r.name}>{r.name || "-"}</div>
                  <div className="truncate px-4 text-gray-600 dark:text-gray-200" title={r.email}>{r.email || "-"}</div>
                  <div className="truncate px-4 text-gray-600 dark:text-gray-200" title={contact}>{contact || "-"}</div>
                  <div className="truncate px-4 text-gray-600 dark:text-gray-200" title={r.created_at}>{r.created_at || "-"}</div>
                  <div className="truncate px-4 text-gray-600 dark:text-gray-200" title={r.company}>{r.company || "-"}</div>
                  <div className="px-4"><StatusBadge status={r.crm_status} /></div>
                  <div className="px-4">
                    <button
                      onClick={() => { setSelected(sorted[vi.index]); setDraft(null); }}
                      className="inline-flex items-center gap-1 text-sm text-teal-brand hover:underline">
                      View <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-black/30" />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                <h3 className="font-semibold">Lead details</h3>
                <div className="flex items-center gap-2">
                  {draft ? (
                    <>
                      <button onClick={saveEdit} className="inline-flex items-center gap-1 rounded-lg bg-teal-brand px-3 py-1.5 text-sm font-medium text-white">
                        <Check className="h-4 w-4" /> Save
                      </button>
                      <button onClick={() => setDraft(null)} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
                    </>
                  ) : (
                    <button onClick={startEdit} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  <button onClick={closeDrawer} aria-label="Close"><X className="h-5 w-5 text-gray-400" /></button>
                </div>
              </div>
              <dl className="flex-1 overflow-auto p-4 text-sm">
                {CRM_FIELDS.map((f) => (
                  <div key={f} className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] items-start gap-3 border-b border-gray-50 py-2 dark:border-gray-800">
                    <dt className="min-w-0 break-words text-xs text-gray-400 dark:text-gray-400">{f}</dt>
                    <dd className="min-w-0 break-words">
                      {draft ? (
                        f === "crm_status" ? (
                          <select value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value as CRMRecord["crm_status"] })}
                            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                            <option value="">(blank)</option>
                            {CRM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : f === "data_source" ? (
                          <select value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value as CRMRecord["data_source"] })}
                            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                            <option value="">(blank)</option>
                            {DATA_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <input value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
                        )
                      ) : (
                        <span title={selected.record[f]}>{selected.record[f] || "-"}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
