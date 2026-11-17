"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { C, RCA_COLORS, type MapPoint } from "@/lib/ccm-data";
import { cn } from "@/lib/utils";

interface Props {
  points: MapPoint[];
  months: string[];
  withoutCoords: Record<string, number>;
  categories: string[];
  defaultMonth?: string;
}

const SULAWESI: LatLngBoundsExpression = [[-6.2, 118.6], [2.4, 128.6]];

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.fitBounds(SULAWESI);
      return;
    }
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [24, 24], maxZoom: 12 });
  }, [map, points]);
  return null;
}

export function ComplaintMap({ points, months, withoutCoords, categories, defaultMonth }: Props) {
  const [month, setMonth] = useState<string>(defaultMonth && months.includes(defaultMonth) ? defaultMonth : months[months.length - 1] ?? "all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<"all" | "va" | "non">("all");

  const inPeriod = useMemo(() => points.filter((p) => month === "all" || p.month === month), [points, month]);
  const shown = useMemo(
    () => inPeriod.filter((p) => !hidden.has(p.rca) && (source === "all" || (source === "va") === p.va)),
    [inPeriod, hidden, source],
  );
  const noCoord = month === "all"
    ? Object.values(withoutCoords).reduce((s, v) => s + v, 0)
    : withoutCoords[month] ?? 0;

  const hotspots = useMemo(() => {
    const m = new Map<string, { kec: string; kab: string; n: number }>();
    for (const p of shown) {
      if (!p.kec) continue;
      const key = `${p.kec}|${p.kab}`;
      const e = m.get(key) ?? { kec: p.kec, kab: p.kab, n: 0 };
      e.n += 1;
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  }, [shown]);

  const toggle = (c: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const color = (c: string) => RCA_COLORS[c] ?? C.neutral;

  return (
    <section className="rounded-xl border border-[#e3e2dd] bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#0b0b0b]">Peta Lokasi Pelanggan Komplain</h2>
          <p className="text-xs text-[#52514e] mt-0.5">
            {shown.length} titik ditampilkan · {noCoord} tiket tanpa koordinat · posisi dibulatkan ±110 m
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <div className="flex rounded-md border border-[#e3e2dd] p-0.5">
            {[...months, "all"].map((m) => (
              <button key={m} onClick={() => setMonth(m)}
                className={cn("px-2 py-0.5 rounded", month === m ? "bg-[#0b0b0b] text-white" : "text-[#52514e] hover:bg-[#f3f2ee]")}>
                {m === "all" ? "Semua" : m}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-[#e3e2dd] p-0.5">
            {([["all", "Semua"], ["va", "VA"], ["non", "Non VA"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setSource(k)}
                className={cn("px-2 py-0.5 rounded", source === k ? "bg-[#0b0b0b] text-white" : "text-[#52514e] hover:bg-[#f3f2ee]")}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <ul className="mt-2 flex flex-wrap gap-x-1 gap-y-1 text-[11px]">
        {categories.map((c) => {
          const n = inPeriod.filter((p) => p.rca === c).length;
          const off = hidden.has(c);
          return (
            <li key={c}>
              <button onClick={() => toggle(c)} title={off ? "Tampilkan" : "Sembunyikan"}
                className={cn("flex items-center gap-1.5 rounded-full border px-2 py-0.5",
                  off ? "border-[#e3e2dd] text-[#a3a19a] line-through" : "border-[#e3e2dd] text-[#52514e] hover:bg-[#f3f2ee]")}>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: off ? "#e3e2dd" : color(c) }} />
                {c} <span className="tabular-nums text-[#8a8880]">{n}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-[460px] rounded-lg overflow-hidden border border-[#e3e2dd] isolate">
          <MapContainer bounds={SULAWESI} scrollWheelZoom className="h-full w-full" preferCanvas>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <FitBounds points={shown} />
            {shown.map((p, i) => (
              <CircleMarker key={`${p.date}-${p.lat}-${p.lng}-${i}`} center={[p.lat, p.lng]} radius={6}
                pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: color(p.rca), fillOpacity: 0.9 }}>
                <Popup>
                  <div className="text-xs leading-relaxed min-w-[180px]">
                    <div className="font-semibold">{p.kec ? `${p.kec}, ` : ""}{p.kab}</div>
                    <div className="text-[#52514e]">{p.date}{p.va ? " · VA (Veronika)" : ""}</div>
                    <div className="mt-1">
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: color(p.rca) }} />
                      {p.rca}{p.rca_detail ? ` — ${p.rca_detail}` : ""}
                    </div>
                    <div className="text-[#52514e]">
                      {p.site ? `Site ${p.site} · ` : ""}{p.dept}{p.status ? ` · ${p.status}` : ""}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-[#0b0b0b]">Hotspot kecamatan</h3>
          <p className="text-[11px] text-[#8a8880]">sesuai filter di peta</p>
          <ol className="mt-2 space-y-1.5">
            {hotspots.map((h) => (
              <li key={`${h.kec}|${h.kab}`} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-[#0b0b0b] truncate">{h.kec}</span>
                  <span className="tabular-nums font-semibold">{h.n}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8a8880] truncate flex-1">{h.kab}</span>
                  <span className="h-1.5 rounded-full shrink-0" style={{ width: `${(h.n / hotspots[0].n) * 60}px`, background: C.s1 }} />
                </div>
              </li>
            ))}
            {hotspots.length === 0 && <li className="text-xs text-[#8a8880]">Tidak ada titik.</li>}
          </ol>
        </div>
      </div>
    </section>
  );
}
