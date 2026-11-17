"use client";

import dynamic from "next/dynamic";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { TipBox } from "./charts";
import {
  C, RCA_COLORS, SERIES,
  type IncrementMonth, type KabData, type KpiRow, type MapPoint,
} from "@/lib/ccm-data";

const MiniMap = dynamic(() => import("./MiniMap").then((m) => m.MiniMap), {
  ssr: false,
  loading: () => <div className="h-[260px] rounded-lg border border-[#e3e2dd] bg-[#faf9f7]" />,
});

const AXIS = { fontSize: 11, fill: C.muted };
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
};

interface Props {
  kab: string;
  data: KabData;
  monthKey: string;
  month: IncrementMonth;
  points: MapPoint[];
  kpi?: KpiRow[];
}

/** Narrative used when the notes file has nothing for this kabupaten. */
function autoNarrative(kab: string, data: KabData, monthKey: string, month: IncrementMonth): string {
  const km = data.months[monthKey];
  if (!km) return "";
  const rank = month.ranking.find((r) => r.kab === kab);
  const parts: string[] = [];
  if (rank?.baseline != null && rank.delta != null) {
    const pct = rank.baseline > 0 ? ` (${rank.delta > 0 ? "+" : ""}${((rank.delta / rank.baseline) * 100).toFixed(0)}%)` : "";
    parts.push(`Tiket CCM ${titleCase(kab)} ${km.current} tiket, ${rank.delta >= 0 ? "naik" : "turun"} ${Math.abs(rank.delta).toFixed(1)}${pct} vs BL ${rank.baseline}.`);
  } else {
    parts.push(`Tiket CCM ${titleCase(kab)} ${km.current} tiket di ${month.label}.`);
  }
  const peak = [...km.daily].map((d) => ({ day: d.day, n: km.kecamatan.reduce((s, k) => s + (d[k] ?? 0), 0), row: d }))
    .sort((a, b) => b.n - a.n)[0];
  if (peak && peak.n > 0) {
    const topKec = km.kecamatan.filter((k) => k !== "LAINNYA" && (peak.row[k] ?? 0) > 0)
      .sort((a, b) => (peak.row[b] ?? 0) - (peak.row[a] ?? 0)).slice(0, 2).map(titleCase);
    parts.push(`Puncak tanggal ${peak.day} (${peak.n} tiket)${topKec.length ? `, terutama di ${topKec.join(" dan ")}` : ""}.`);
  }
  const rca = Object.entries(km.rca).filter(([c]) => c !== "No feedback").sort((a, b) => b[1] - a[1])[0];
  if (rca && rca[1] > 0) parts.push(`RCA dominan: ${rca[0]} (${rca[1]} tiket).`);
  const site = km.sites[0];
  if (site && site.n > 1) parts.push(`Site terbanyak ${site.site} (${site.n} tiket${site.detail ? `, ${site.detail}` : ""}).`);
  return parts.join(" ");
}

function KecamatanChart({ km, monthLabel }: { km: KabData["months"][string]; monthLabel: string }) {
  const color = (k: string, i: number) => (k === "LAINNYA" ? C.neutral : SERIES[i % SERIES.length]);
  return (
    <ChartCard
      title="Tiket CCM harian per kecamatan"
      subtitle={monthLabel}
      legend={km.kecamatan.map((k, i) => ({ label: titleCase(k), color: color(k, i) }))}
      table={{ columns: ["Tgl", ...km.kecamatan.map(titleCase), "Total"], rows: km.daily.map((d) => [d.day, ...km.kecamatan.map((k) => d[k] ?? 0), km.kecamatan.reduce((s, k) => s + (d[k] ?? 0), 0)]) }}
      className="border-0 p-0"
    >
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={km.daily} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={4} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Record<string, number>;
              const total = km.kecamatan.reduce((s, k) => s + (d[k] ?? 0), 0);
              const rows = km.kecamatan.map((k, i) => ({ label: titleCase(k), value: d[k] ?? 0, color: color(k, i) }))
                .filter((r) => r.value > 0).reverse();
              return <TipBox title={`Tanggal ${label} · ${total} tiket`} rows={rows.length ? rows : [{ label: "Tidak ada tiket", value: "" }]} />;
            }}
          />
          {km.kecamatan.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="k" fill={color(k, i)} stroke={C.surface} strokeWidth={1} maxBarSize={22}
              radius={i === km.kecamatan.length - 1 ? [3, 3, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function TrendChart({ data, monthKey, month, blPerDay }: { data: KabData; monthKey: string; month: IncrementMonth; blPerDay: number | null }) {
  // highlight the selected month on the full raw-data range
  const inMonth = data.trend.filter((t) => {
    const [y, m] = t.date.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    const lbl = d.toLocaleString("en-US", { month: "short" }) + "'" + y.slice(2);
    return lbl === monthKey;
  });
  const legend: { label: string; color: string; dashed?: boolean }[] = [{ label: "Tiket / hari", color: C.s1 }];
  if (blPerDay != null) legend.push({ label: `Rata-rata BL (${blPerDay.toFixed(1)}/hari)`, color: C.ink2, dashed: true });
  return (
    <ChartCard
      title="Tren tiket harian"
      subtitle={`Seluruh periode raw data · area abu = ${month.label}`}
      legend={legend}
      table={{ columns: ["Tanggal", "Tiket"], rows: data.trend.map((t) => [t.date, t.n]) }}
      className="border-0 p-0"
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data.trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          {inMonth.length > 0 && (
            <ReferenceArea x1={inMonth[0].date} x2={inMonth[inMonth.length - 1].date} fill="#f0efec" fillOpacity={0.8} ifOverflow="hidden" />
          )}
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} tickFormatter={fmtDate} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: C.muted, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const t = payload[0].payload as { date: string; n: number };
              return <TipBox title={t.date} rows={[
                { label: "Tiket", value: t.n, color: C.s1 },
                ...(blPerDay != null ? [{ label: "Rata-rata BL", value: blPerDay.toFixed(1), color: C.ink2, dashed: true }] : []),
              ]} />;
            }}
          />
          {blPerDay != null && <ReferenceLine y={blPerDay} stroke={C.ink2} strokeDasharray="5 4" strokeWidth={1.5} />}
          <Line dataKey="n" stroke={C.s1} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function KpiCharts({ rows }: { rows: KpiRow[] }) {
  const metrics = Object.keys(rows[0] ?? {}).filter((k) => k !== "date");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {metrics.map((m, i) => (
        <ChartCard key={m} title={m.replace(/_/g, " ")} subtitle="Data KPI harian (kpi_daily.csv)" className="border-0 p-0"
          table={{ columns: ["Tanggal", m], rows: rows.map((r) => [r.date as string, r[m] as number | null]) }}>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} tickFormatter={fmtDate} interval="preserveStartEnd" minTickGap={18} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const r = payload[0].payload as KpiRow;
                return <TipBox title={r.date as string} rows={[{ label: m, value: String(r[m] ?? "–"), color: SERIES[i % SERIES.length] }]} />;
              }} />
              <Line dataKey={m} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ))}
    </div>
  );
}

export function IncrementPanel({ kab, data, monthKey, month, points, kpi }: Props) {
  const km = data.months[monthKey];
  const note = month.notes[kab];
  const rank = month.ranking.find((r) => r.kab === kab);
  const blPerDay = month.has_baseline ? month.baseline_per_day[kab] ?? 0 : null;
  const header = [data.nop, titleCase(kab), note?.issue].filter(Boolean).join(" – ");

  return (
    <section className="rounded-xl border border-[#e3e2dd] bg-white overflow-hidden flex flex-col">
      <div className="bg-[#0b0b0b] text-white px-4 py-2.5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold truncate">{header}</h2>
        <span className="text-xs tabular-nums shrink-0 text-[#d9d8d3]">
          {km ? `${km.current} tiket` : "0 tiket"}
          {rank?.delta != null ? ` · ${rank.delta > 0 ? "▲ +" : "▼ "}${rank.delta} vs BL` : ""}
        </span>
      </div>

      <div className="p-4 space-y-5">
        <p className="text-[13px] leading-snug text-[#33322f]">
          {note?.text ?? autoNarrative(kab, data, monthKey, month)}
          {!note && <span className="ml-1 text-[11px] text-[#8a8880]">(narasi otomatis)</span>}
        </p>

        {km ? <KecamatanChart km={km} monthLabel={`${month.label} · ${data.provinsi ? titleCase(data.provinsi) : ""}`} />
          : <p className="text-xs text-[#8a8880]">Tidak ada tiket di {month.label}.</p>}

        <TrendChart data={data} monthKey={monthKey} month={month} blPerDay={blPerDay} />

        {kpi && kpi.length > 0 && <KpiCharts rows={kpi} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0b0b0b]">Lokasi pelanggan</h3>
            <p className="text-xs text-[#52514e] mb-2">{points.length} tiket ber-koordinat di {month.label}</p>
            {points.length > 0 ? <MiniMap key={`${kab}|${monthKey}`} points={points} /> : (
              <div className="h-[120px] rounded-lg border border-dashed border-[#e3e2dd] grid place-items-center text-xs text-[#8a8880]">Tidak ada koordinat</div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0b0b0b]">Top site</h3>
            <p className="text-xs text-[#52514e] mb-2">Site dengan tiket terbanyak di {month.label}</p>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-[#52514e] border-b border-[#e3e2dd]">
                  <th className="text-left font-medium py-1">Site</th>
                  <th className="text-right font-medium py-1 px-1">Tiket</th>
                  <th className="text-left font-medium py-1 pl-2">RCA</th>
                </tr>
              </thead>
              <tbody>
                {(km?.sites ?? []).map((s) => (
                  <tr key={s.site} className="border-b border-[#f0efec] align-top">
                    <td className="py-1">
                      <div className="font-medium text-[#0b0b0b]">{s.site}</div>
                      <div className="text-[11px] text-[#8a8880]">{titleCase(s.kec)} · {s.first === s.last ? s.first : `${s.first}–${s.last}`}</div>
                    </td>
                    <td className="py-1 px-1 text-right font-semibold">{s.n}</td>
                    <td className="py-1 pl-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: RCA_COLORS[s.rca] ?? C.neutral }} />
                        {s.rca}
                      </span>
                      {s.detail && <div className="text-[11px] text-[#8a8880]">{s.detail}</div>}
                    </td>
                  </tr>
                ))}
                {!km?.sites.length && <tr><td colSpan={3} className="py-2 text-[#8a8880]">Tidak ada SITEID.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
