"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { ChartCard } from "./ChartCard";
import {
  C, RCA_COLORS, fmtPct, fmtRatio, ratioPct,
  type CcmDashboardData, type DailyPoint, type OkrMonth, type RcaMonth, type RepetitiveMonth,
} from "@/lib/ccm-data";

const AXIS = { fontSize: 11, fill: C.muted };
const GRID = <CartesianGrid vertical={false} stroke={C.grid} />;

type TipRow = { label: string; value: ReactNode; color?: string; dashed?: boolean };

function TipBox({ title, rows }: { title: ReactNode; rows: TipRow[] }) {
  return (
    <div className="rounded-lg border border-[#e3e2dd] bg-white px-3 py-2 text-xs shadow-md min-w-[160px]">
      <div className="font-semibold text-[#0b0b0b] mb-1">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 text-[#52514e]">
          <span className="flex items-center gap-1.5">
            {r.color && (r.dashed
              ? <span className="inline-block w-3 border-t-2 border-dashed" style={{ borderColor: r.color }} />
              : <span className="inline-block w-2 h-2 rounded-[2px]" style={{ background: r.color }} />)}
            {r.label}
          </span>
          <span className="tabular-nums text-[#0b0b0b] font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- OKR trend */

export function OkrTicketChart({ data }: { data: OkrMonth[] }) {
  const rows = data.map((d) => ({ ...d, ratio: ratioPct(d.ticket, d.subscriber), target: d.target_ratio * 100 }));
  return (
    <ChartCard
      title="Tiket CCM per Bulan"
      subtitle="Jumlah tiket OKR · bulan berjalan disorot"
      table={{
        columns: ["Bulan", "Tiket", "Subscriber", "Ratio", "Target"],
        rows: rows.map((r) => [r.month, r.ticket, r.subscriber.toLocaleString("id-ID"), fmtRatio(r.ratio), fmtRatio(r.target)]),
      }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 18, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={6} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as (typeof rows)[number];
              return (
                <TipBox title={r.month} rows={[
                  { label: "Tiket", value: r.ticket, color: C.s1 },
                  { label: "Subscriber", value: r.subscriber.toLocaleString("id-ID") },
                  { label: "Ratio", value: fmtRatio(r.ratio) },
                  { label: "Target", value: fmtRatio(r.target) },
                ]} />
              );
            }}
          />
          <Bar dataKey="ticket" radius={[4, 4, 0, 0]} maxBarSize={36} fill={C.s1}>
            {rows.map((r, i) => <Cell key={r.month} fillOpacity={i === rows.length - 1 ? 1 : 0.55} />)}
            <LabelList dataKey="ticket" position="top" style={{ fontSize: 10, fill: C.ink2 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function OkrRatioChart({ data }: { data: OkrMonth[] }) {
  const rows = data.map((d) => ({ month: d.month, ratio: ratioPct(d.ticket, d.subscriber), target: d.target_ratio * 100 }));
  const last = rows[rows.length - 1];
  return (
    <ChartCard
      title="OKR Ratio vs Target"
      subtitle="Tiket ÷ subscriber · lebih rendah lebih baik"
      legend={[{ label: "Ratio", color: C.s1 }, { label: "Target", color: C.ink2, dashed: true }]}
      table={{ columns: ["Bulan", "Ratio", "Target", "Status"], rows: rows.map((r) => [r.month, fmtRatio(r.ratio), fmtRatio(r.target), r.ratio <= r.target ? "Achieve" : "Not achieve"]) }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={rows} margin={{ top: 18, right: 24, left: 4, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={6} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(4)}%`}
            domain={[(min: number) => min * 0.85, (max: number) => max * 1.08]} width={62} />
          <Tooltip
            cursor={{ stroke: C.muted, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as (typeof rows)[number];
              const ok = r.ratio <= r.target;
              return (
                <TipBox title={r.month} rows={[
                  { label: "Ratio", value: fmtRatio(r.ratio), color: C.s1 },
                  { label: "Target", value: fmtRatio(r.target), color: C.ink2, dashed: true },
                  { label: "Status", value: <span style={{ color: ok ? C.good : C.critical }}>{ok ? "✓ Achieve" : "✕ Not achieve"}</span> },
                ]} />
              );
            }}
          />
          <Line type="stepAfter" dataKey="target" stroke={C.ink2} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} />
          <Line type="linear" dataKey="ratio" stroke={C.s1} strokeWidth={2}
            dot={(p: { cx?: number; cy?: number; payload?: (typeof rows)[number]; index?: number }) => {
              const miss = p.payload && p.payload.ratio > p.payload.target;
              return <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill={miss ? C.critical : C.s1} stroke={C.surface} strokeWidth={2} />;
            }}
            activeDot={{ r: 6, stroke: C.surface, strokeWidth: 2 }}
          >
            <LabelList dataKey="ratio" position="top" content={(p) => {
              const { x, y, index } = p as { x: number; y: number; index: number };
              if (index !== rows.length - 1) return null;
              return <text x={x} y={y - 10} textAnchor="end" fontSize={11} fontWeight={600} fill={C.ink}>{fmtRatio(last.ratio)}</text>;
            }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-[#52514e]">Titik merah = bulan di atas target (not achieve).</p>
    </ChartCard>
  );
}

/* ---------------------------------------------------------- Repetitive site */

export function RepetitiveChart({ data }: { data: RepetitiveMonth[] }) {
  const rows = data.map((d) => {
    const total = d.repetitive + d.not_repetitive;
    return { ...d, total, pct: total ? (d.repetitive / total) * 100 : 0 };
  });
  return (
    <ChartCard
      title="Repetitive SITEID (bulanan)"
      subtitle="Label di atas bar = % repetitive"
      legend={[{ label: "Repetitive", color: C.s2 }, { label: "Not repetitive", color: C.neutral }]}
      table={{ columns: ["Bulan", "Not repetitive", "Repetitive", "%Repetitive"], rows: rows.map((r) => [r.month, r.not_repetitive, r.repetitive, fmtPct(r.pct)]) }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 18, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={6} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as (typeof rows)[number];
              return (
                <TipBox title={r.month} rows={[
                  { label: "Repetitive", value: r.repetitive, color: C.s2 },
                  { label: "Not repetitive", value: r.not_repetitive, color: C.neutral },
                  { label: "% Repetitive", value: fmtPct(r.pct) },
                ]} />
              );
            }}
          />
          <Bar dataKey="repetitive" stackId="a" fill={C.s2} stroke={C.surface} strokeWidth={1} maxBarSize={36} />
          <Bar dataKey="not_repetitive" stackId="a" fill={C.neutral} stroke={C.surface} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={36}>
            <LabelList dataKey="pct" position="top" formatter={(v: number) => fmtPct(v, 0)} style={{ fontSize: 10, fill: C.ink2 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------- RCA regional */

export function RcaRegionalChart({ data, categories }: { data: RcaMonth[]; categories: string[] }) {
  const color = (c: string) => RCA_COLORS[c] ?? C.neutral;
  // Stack bottom→top in category order; legend lists top→bottom so it matches the bars.
  const legend = [...categories].reverse().map((c) => ({ label: c, color: color(c) }));
  return (
    <ChartCard
      title="RCA Regional"
      subtitle="Komposisi RCA tiket per bulan"
      legend={legend}
      table={{ columns: ["Bulan", ...categories, "Total"], rows: data.map((r) => [r.month, ...categories.map((c) => Number(r[c] ?? 0)), categories.reduce((s, c) => s + Number(r[c] ?? 0), 0)]) }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
          {GRID}
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={6} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as RcaMonth;
              const total = categories.reduce((s, c) => s + Number(r[c] ?? 0), 0);
              return (
                <TipBox title={`${label} · ${total} tiket`} rows={[...categories].reverse().map((c) => ({
                  label: c, color: color(c),
                  value: `${r[c] ?? 0} (${total ? ((Number(r[c] ?? 0) / total) * 100).toFixed(0) : 0}%)`,
                }))} />
              );
            }}
          />
          {categories.map((c, i) => (
            <Bar key={c} dataKey={c} stackId="rca" fill={color(c)} stroke={C.surface} strokeWidth={1} maxBarSize={36}
              radius={i === categories.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------ Daily compare */

export function DailyChart({ data, monthLabel, baselineLabel }: { data: DailyPoint[]; monthLabel: string; baselineLabel: string }) {
  const series = [
    { key: "baseline", label: `Avg ${baselineLabel === "BL" ? "Baseline" : baselineLabel}`, color: C.ink2, dashed: true },
    { key: "current_all", label: `${monthLabel} (all)`, color: C.s1 },
    { key: "current_non_va", label: `${monthLabel} (Non VA)`, color: C.s2 },
  ] as const;
  return (
    <ChartCard
      title="Ticket Daily Comparison"
      subtitle="Tiket harian bulan berjalan vs rata-rata baseline"
      legend={series.map((s) => ({ label: s.label, color: s.color, dashed: "dashed" in s }))}
      table={{ columns: ["Tgl", ...series.map((s) => s.label)], rows: data.map((d) => [d.day, d.baseline, d.current_all, d.current_non_va]) }}
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} interval={1} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: C.muted, strokeDasharray: "3 3" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DailyPoint;
              const delta = d.current_all != null ? d.current_all - d.baseline : null;
              return (
                <TipBox title={`Tanggal ${label}`} rows={[
                  ...series.map((s) => ({ label: s.label, color: s.color, dashed: "dashed" in s, value: d[s.key] ?? "–" })),
                  ...(delta != null ? [{ label: "Δ vs baseline", value: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` }] : []),
                ]} />
              );
            }}
          />
          <Line dataKey="baseline" stroke={C.ink2} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
          <Line dataKey="current_non_va" stroke={C.s2} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} connectNulls={false} />
          <Line dataKey="current_all" stroke={C.s1} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ SQA RCA */

export function SqaRcaChart({ data }: { data: CcmDashboardData["sqa_rca"] }) {
  const rows = [...data].sort((a, b) => b.total - a.total);
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <ChartCard
      title="Regional RCA — Tiket Assigned ke SQA"
      subtitle={`${total} tiket`}
      table={{ columns: ["RCA", "Tiket", "%"], rows: rows.map((r) => [r.rca, r.total, fmtPct(total ? (r.total / total) * 100 : 0)]) }}
    >
      <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 26 + 20)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap="22%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="rca" tick={{ fontSize: 11, fill: C.ink2 }} tickLine={false} axisLine={false} width={150} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as (typeof rows)[number];
              return <TipBox title={r.rca} rows={[{ label: "Tiket", value: r.total, color: C.s1 }, { label: "Share", value: fmtPct(total ? (r.total / total) * 100 : 0) }]} />;
            }}
          />
          <Bar dataKey="total" fill={C.s1} radius={[0, 4, 4, 0]} maxBarSize={16}>
            <LabelList dataKey="total" position="right" style={{ fontSize: 11, fill: C.ink2 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
