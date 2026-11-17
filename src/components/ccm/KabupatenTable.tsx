"use client";

import { C, type CcmDashboardData } from "@/lib/ccm-data";

interface Props {
  data: CcmDashboardData["top_kabupaten"];
  monthLabel: string;
  baselineLabel: string;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function KabupatenTable({ data, monthLabel, baselineLabel }: Props) {
  const maxCur = Math.max(1, ...data.rows.map((r) => r.current));
  return (
    <section className="rounded-xl border border-[#e3e2dd] bg-white p-4">
      <h2 className="text-sm font-semibold text-[#0b0b0b]">Top 10 Kabupaten — Profil Tiket CCM</h2>
      <p className="text-xs text-[#52514e] mt-0.5">
        {monthLabel}: {data.total_current} tiket · {baselineLabel}: {fmt(data.total_baseline)} tiket (Create Ticket)
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-[#52514e] border-b border-[#e3e2dd]">
              <th className="text-left font-medium py-1.5 pr-2" rowSpan={2}>Kabupaten</th>
              <th className="font-medium py-1 px-2 text-center border-l border-[#f0efec]" colSpan={3}># Tiket</th>
              <th className="font-medium py-1 px-2 text-center border-l border-[#f0efec]" colSpan={2}>% Tiket</th>
            </tr>
            <tr className="text-[#52514e] border-b border-[#e3e2dd]">
              <th className="font-medium py-1 px-2 text-right border-l border-[#f0efec]">{baselineLabel}</th>
              <th className="font-medium py-1 px-2 text-right">{monthLabel}</th>
              <th className="font-medium py-1 px-2 text-right">Δ</th>
              <th className="font-medium py-1 px-2 text-right border-l border-[#f0efec]">{baselineLabel}</th>
              <th className="font-medium py-1 px-2 text-right">{monthLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const delta = r.current - r.baseline;
              const up = delta > 0;
              return (
                <tr key={r.kabupaten} className="border-b border-[#f0efec] hover:bg-[#faf9f7]">
                  <td className="py-1.5 pr-2 font-medium text-[#0b0b0b] whitespace-nowrap">{r.kabupaten}</td>
                  <td className="py-1.5 px-2 text-right text-[#52514e] border-l border-[#f0efec]">{fmt(r.baseline)}</td>
                  <td className="py-1.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="hidden sm:inline-block h-1.5 rounded-full" style={{ width: `${(r.current / maxCur) * 48}px`, background: C.s1 }} />
                      <span className="font-semibold text-[#0b0b0b] w-7">{r.current}</span>
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold whitespace-nowrap" style={{ color: delta === 0 ? C.ink2 : up ? C.critical : C.good }}>
                    {delta === 0 ? "0" : `${up ? "▲ +" : "▼ "}${fmt(delta)}`}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[#52514e] border-l border-[#f0efec]">
                    {data.total_baseline ? ((r.baseline / data.total_baseline) * 100).toFixed(2) : "0.00"}%
                  </td>
                  <td className="py-1.5 px-2 text-right text-[#0b0b0b]">
                    {data.total_current ? ((r.current / data.total_current) * 100).toFixed(2) : "0.00"}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-[#52514e]">▲ merah = tiket naik vs {baselineLabel} · ▼ hijau = turun</p>
    </section>
  );
}
