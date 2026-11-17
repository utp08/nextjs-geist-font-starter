"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Table view of the same data (accessibility / exact numbers). */
  table?: { columns: string[]; rows: (string | number | null)[][] };
  className?: string;
  legend?: { label: string; color: string; dashed?: boolean }[];
}

export function ChartCard({ title, subtitle, children, table, className, legend }: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <section className={cn("rounded-xl border border-[#e3e2dd] bg-white p-4 flex flex-col", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#0b0b0b]">{title}</h2>
          {subtitle && <p className="text-xs text-[#52514e] mt-0.5">{subtitle}</p>}
        </div>
        {table && (
          <div className="flex shrink-0 rounded-md border border-[#e3e2dd] p-0.5 text-[11px]">
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-2 py-0.5 rounded",
                  view === v ? "bg-[#0b0b0b] text-white" : "text-[#52514e] hover:bg-[#f3f2ee]",
                )}
              >
                {v === "chart" ? "Grafik" : "Tabel"}
              </button>
            ))}
          </div>
        )}
      </header>

      {legend && view === "chart" && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#52514e]">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              {l.dashed ? (
                <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: l.color }} />
              ) : (
                <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: l.color }} />
              )}
              {l.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex-1 min-h-0">
        {view === "chart" || !table ? (
          children
        ) : (
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[#e3e2dd] text-[#52514e]">
                  {table.columns.map((c, i) => (
                    <th key={c} className={cn("py-1.5 px-2 font-medium", i === 0 ? "text-left" : "text-right")}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-[#f0efec]">
                    {r.map((cell, ci) => (
                      <td key={ci} className={cn("py-1 px-2", ci === 0 ? "text-left" : "text-right")}>{cell ?? "–"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
