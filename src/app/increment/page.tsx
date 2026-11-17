"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { CcmNav } from "@/components/ccm/CcmNav";
import { IncrementPanel } from "@/components/ccm/IncrementPanel";
import { C, type CcmDashboardData, type CcmIncrementData } from "@/lib/ccm-data";
import { cn } from "@/lib/utils";

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function IncrementPage() {
  const [inc, setInc] = useState<CcmIncrementData | null>(null);
  const [dash, setDash] = useState<CcmDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthKey, setMonthKey] = useState<string>("");
  const [focus, setFocus] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch("/data/ccm_increment.json", { cache: "no-store" }),
        fetch("/data/ccm_dashboard.json", { cache: "no-store" }),
      ]);
      if (!a.ok) throw new Error(`ccm_increment.json HTTP ${a.status}`);
      const incData: CcmIncrementData = await a.json();
      setInc(incData);
      if (b.ok) setDash(await b.json());
      setMonthKey((m) => (m && incData.months[m] ? m : incData.meta.default_month));
      setError(null);
    } catch (e) {
      setError(`Gagal memuat data: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const month = inc?.months[monthKey];
  // reset the two focus panels whenever the month changes
  useEffect(() => { if (month) setFocus(month.focus.slice(0, 2)); }, [month]);

  const kabOptions = useMemo(() => {
    if (!inc || !month) return [];
    return month.ranking.filter((r) => inc.kabupaten[r.kab]).map((r) => r.kab);
  }, [inc, month]);

  if (error) return <div className="min-h-screen bg-[#f7f6f3] p-6 text-sm text-[#d03b3b]">{error}</div>;
  if (!inc || !month) return <div className="min-h-screen bg-[#f7f6f3] p-6 text-sm text-[#52514e]">Memuat data…</div>;

  const top = month.ranking.slice(0, 10);
  const maxCur = Math.max(1, ...top.map((r) => r.current));
  const setPanel = (i: number, kab: string) => setFocus((f) => {
    const next = [...f];
    next[i] = kab;
    return next;
  });
  const pointsFor = (kab: string) => (dash?.map?.points ?? []).filter((p) => p.kab === kab && p.month === monthKey);

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#0b0b0b]">
      <header className="border-b border-[#e3e2dd] bg-white">
        <div className="mx-auto max-w-screen-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              CCM Sulawesi <span className="font-normal text-[#52514e]">| Increment {month.label}</span>
            </h1>
            <p className="text-xs text-[#52514e]">R09 Sulawesi · raw data {inc.meta.data_range}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#52514e]">
            <CcmNav />
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-md border border-[#e3e2dd] px-2.5 py-1 hover:bg-[#f3f2ee]">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Muat ulang data
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 py-5 space-y-4">
        <section className="rounded-xl border border-[#e3e2dd] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {month.has_baseline ? "Kenaikan tiket per kabupaten vs BL" : "Tiket per kabupaten"}
              </h2>
              <p className="text-xs text-[#52514e] mt-0.5">{month.baseline_note}</p>
            </div>
            <div className="flex rounded-md border border-[#e3e2dd] p-0.5 text-[11px]">
              {inc.meta.months.map((m) => (
                <button key={m} onClick={() => setMonthKey(m)}
                  className={cn("px-2 py-0.5 rounded", monthKey === m ? "bg-[#0b0b0b] text-white" : "text-[#52514e] hover:bg-[#f3f2ee]")}>
                  {inc.months[m].label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-[#52514e] border-b border-[#e3e2dd]">
                  <th className="text-left font-medium py-1.5 pr-2">#</th>
                  <th className="text-left font-medium py-1.5 pr-2">Kabupaten</th>
                  <th className="text-left font-medium py-1.5 px-2">NOP</th>
                  <th className="text-right font-medium py-1.5 px-2">BL</th>
                  <th className="text-right font-medium py-1.5 px-2">{month.label}</th>
                  <th className="text-right font-medium py-1.5 px-2">Δ</th>
                  <th className="text-right font-medium py-1.5 px-2">%Δ</th>
                  <th className="text-right font-medium py-1.5 pl-2">Tampilkan di panel</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r, i) => {
                  const up = (r.delta ?? 0) > 0;
                  const pct = r.delta != null && r.baseline ? (r.delta / r.baseline) * 100 : null;
                  return (
                    <tr key={r.kab} className={cn("border-b border-[#f0efec]", focus.includes(r.kab) && "bg-[#f3f2ee]")}>
                      <td className="py-1.5 pr-2 text-[#8a8880]">{i + 1}</td>
                      <td className="py-1.5 pr-2 font-medium whitespace-nowrap">{r.kab}</td>
                      <td className="py-1.5 px-2 text-[#52514e]">{titleCase(r.nop)}</td>
                      <td className="py-1.5 px-2 text-right text-[#52514e]">{r.baseline ?? "–"}</td>
                      <td className="py-1.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="hidden sm:inline-block h-1.5 rounded-full" style={{ width: `${(r.current / maxCur) * 60}px`, background: C.s1 }} />
                          <span className="font-semibold w-6">{r.current}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right font-semibold whitespace-nowrap" style={{ color: r.delta == null || r.delta === 0 ? C.ink2 : up ? C.critical : C.good }}>
                        {r.delta == null ? "–" : `${up ? "▲ +" : r.delta < 0 ? "▼ " : ""}${r.delta}`}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[#52514e]">{pct == null ? "–" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`}</td>
                      <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                        {inc.kabupaten[r.kab] ? [0, 1].map((p) => (
                          <button key={p} onClick={() => setPanel(p, r.kab)}
                            className={cn("ml-1 rounded border px-1.5 py-0.5 text-[11px]",
                              focus[p] === r.kab ? "border-[#0b0b0b] bg-[#0b0b0b] text-white" : "border-[#e3e2dd] text-[#52514e] hover:bg-[#f3f2ee]")}>
                            {p === 0 ? "Kiri" : "Kanan"}
                          </button>
                        )) : <span className="text-[#a3a19a]">tiket &lt; 3</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {[0, 1].map((i) => {
            const kab = focus[i];
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#52514e]">
                  <span>Panel {i === 0 ? "kiri" : "kanan"}:</span>
                  <select value={kab ?? ""} onChange={(e) => setPanel(i, e.target.value)}
                    className="rounded-md border border-[#e3e2dd] bg-white px-2 py-1 text-xs text-[#0b0b0b]">
                    {kabOptions.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                {kab && inc.kabupaten[kab] ? (
                  <IncrementPanel kab={kab} data={inc.kabupaten[kab]} monthKey={monthKey} month={month}
                    points={pointsFor(kab)} kpi={inc.kpi[kab]} />
                ) : (
                  <div className="rounded-xl border border-dashed border-[#e3e2dd] p-6 text-xs text-[#8a8880]">Pilih kabupaten.</div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="pt-2 pb-6 text-[11px] text-[#8a8880]">
          Narasi panel: tulis di <code>data/raw/highlights.txt</code> bagian <code>[increment {monthKey}]</code> dengan format
          {" "}<code>KABUPATEN | isu | narasi</code>. Data packet loss / delay / jitter (opsional): <code>data/raw/kpi_daily.csv</code>.
        </footer>
      </main>
    </div>
  );
}
