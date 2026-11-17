"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { DailyChart, OkrRatioChart, OkrTicketChart, RcaRegionalChart, RepetitiveChart, SqaRcaChart } from "@/components/ccm/charts";
import { KabupatenTable } from "@/components/ccm/KabupatenTable";
import dynamic from "next/dynamic";

// Leaflet needs `window`, so the map only renders in the browser.
const ComplaintMap = dynamic(() => import("@/components/ccm/ComplaintMap").then((m) => m.ComplaintMap), {
  ssr: false,
  loading: () => <div className="h-[560px] rounded-xl border border-[#e3e2dd] bg-white p-4 text-xs text-[#8a8880]">Memuat peta…</div>,
});
import { C, fmtPct, fmtRatio, okrTicket, ratioPct, type CcmDashboardData } from "@/lib/ccm-data";

const DATA_URL = "/data/ccm_dashboard.json";

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-[#e3e2dd] bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[#52514e]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[#0b0b0b]">{value}</div>
      {sub && (
        <div className="mt-0.5 text-xs" style={{ color: tone === "good" ? "#006300" : tone === "bad" ? C.critical : "#52514e" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="rounded-xl border border-[#e3e2dd] bg-white p-4">
      <h2 className="text-sm font-semibold text-[#0b0b0b]">{title}</h2>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-[#33322f] list-disc pl-5">
        {items.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </section>
  );
}

export default function CcmMonitoringPage() {
  const [data, setData] = useState<CcmDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(`Gagal memuat ${DATA_URL}: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="min-h-screen bg-[#f7f6f3] p-6 text-sm text-[#d03b3b]">{error}</div>;
  if (!data) return <div className="min-h-screen bg-[#f7f6f3] p-6 text-sm text-[#52514e]">Memuat data…</div>;

  const okr = data.okr_trend;
  const cur = okr[okr.length - 1];
  const prev = okr[okr.length - 2];
  const curRatio = cur ? ratioPct(okrTicket(cur), cur.subscriber) : 0;
  const curTarget = cur ? cur.target_ratio * 100 : 0;
  // month-to-date is compared on its run-rate projection, not the raw partial count
  const mom = cur && prev && prev.ticket ? ((okrTicket(cur) - prev.ticket) / prev.ticket) * 100 : null;
  const days = data.meta.days_elapsed ?? 0;
  const perDay = cur && days ? cur.ticket / days : null;
  const blPerDay = data.top_kabupaten.total_baseline != null && days ? data.top_kabupaten.total_baseline / days : null;
  const rep = data.repetitive_siteid[data.repetitive_siteid.length - 1];
  const repPct = rep ? (rep.repetitive / Math.max(1, rep.repetitive + rep.not_repetitive)) * 100 : 0;
  const repPrev = data.repetitive_siteid[data.repetitive_siteid.length - 2];
  const repPrevPct = repPrev ? (repPrev.repetitive / Math.max(1, repPrev.repetitive + repPrev.not_repetitive)) * 100 : null;
  const achieve = curRatio <= curTarget;
  const { meta } = data;

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#0b0b0b]">
      <header className="border-b border-[#e3e2dd] bg-white">
        <div className="mx-auto max-w-screen-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              CCM Monitoring <span className="font-normal text-[#52514e]">| Monthly Trend</span>
            </h1>
            <p className="text-xs text-[#52514e]">
              {meta.region} · {meta.report_label}
              {meta.data_range ? <span className="text-[#8a8880]"> · raw data {meta.data_range}</span> : null}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#52514e]">
            <span>Diproses {meta.generated_at}</span>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#e3e2dd] px-2.5 py-1 hover:bg-[#f3f2ee]"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Muat ulang data
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 py-5 space-y-4">
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi
            label={`Tiket CCM ${meta.report_month}`}
            value={cur ? cur.ticket.toLocaleString("id-ID") : "–"}
            sub={mom != null
              ? `${cur.mtd ? `proyeksi ${cur.projected_ticket} · ` : ""}${mom > 0 ? "▲ +" : "▼ "}${mom.toFixed(0)}% vs ${prev.month}`
              : undefined}
            tone={mom != null ? (mom > 0 ? "bad" : "good") : undefined}
          />
          <Kpi
            label={cur?.mtd ? "OKR Ratio (proyeksi)" : "OKR Ratio"}
            value={fmtRatio(curRatio)}
            sub={`${achieve ? "✓ Achieve" : "✕ Not achieve"} · target ${fmtRatio(curTarget)}`}
            tone={achieve ? "good" : "bad"}
          />
          <Kpi label="Subscriber" value={cur ? (cur.subscriber / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " jt" : "–"} sub={cur?.subscriber_estimated ? `pakai data ${prev?.month ?? "bulan lalu"} (belum update)` : cur?.month} />
          <Kpi
            label="% Repetitive SITEID"
            value={fmtPct(repPct)}
            sub={repPrevPct != null ? `${repPct - repPrevPct > 0 ? "▲ +" : "▼ "}${(repPct - repPrevPct).toFixed(1)} pt vs ${repPrev.month}` : undefined}
            tone={repPrevPct != null ? (repPct > repPrevPct ? "bad" : "good") : undefined}
          />
          {meta.has_va === false ? (
            <Kpi
              label="Rata-rata tiket / hari"
              value={perDay != null ? perDay.toFixed(1) : "–"}
              sub={perDay != null && blPerDay != null
                ? `${perDay > blPerDay ? "▲" : "▼"} vs ${meta.baseline_label} ${blPerDay.toFixed(1)}/hari`
                : `${days} hari data`}
              tone={perDay != null && blPerDay != null ? (perDay > blPerDay ? "bad" : "good") : undefined}
            />
          ) : (
            <Kpi
              label="Share tiket VA"
              value={meta.va_share != null ? fmtPct(meta.va_share * 100, 0) : "–"}
              sub="Virtual Assistant (Veronika)"
            />
          )}
        </section>

        <Bullets title="Highlight" items={data.highlights.key_issues} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OkrTicketChart data={okr} />
          <OkrRatioChart data={okr} />
          <RepetitiveChart data={data.repetitive_siteid} />
          <RcaRegionalChart data={data.rca_regional} categories={data.rca_categories} />
        </div>

        {data.map && data.map.points.length > 0 && (
          <ComplaintMap
            points={data.map.points}
            months={data.map.months}
            withoutCoords={data.map.without_coords}
            categories={data.rca_categories}
            defaultMonth={data.map.months[data.map.months.length - 1]}
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-5 space-y-4">
            <KabupatenTable data={data.top_kabupaten} monthLabel={meta.report_month} baselineLabel={meta.baseline_label} baselineNote={meta.baseline_note} />
          </div>
          <div className="xl:col-span-4 space-y-4">
            <Bullets title="Catatan" items={data.highlights.kabupaten_notes} />
            <DailyChart data={data.daily} monthLabel={meta.report_month} baselineLabel={meta.baseline_label} hasVa={meta.has_va !== false} />
          </div>
          <div className="xl:col-span-3">
            <SqaRcaChart data={data.sqa_rca} withoutRca={meta.sqa_without_rca} />
          </div>
        </div>

        <footer className="pt-2 pb-6 text-[11px] text-[#8a8880]">
          Sumber: {meta.source}. Update: taruh export mingguan di <code>data/raw/weekly/</code>, jalankan{" "}
          <code>python scripts/build_ccm_data.py</code> dan klik “Muat ulang data”.
        </footer>
      </main>
    </div>
  );
}
