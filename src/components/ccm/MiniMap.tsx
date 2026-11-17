"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { C, RCA_COLORS, type MapPoint } from "@/lib/ccm-data";

function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [20, 20], maxZoom: 13 });
  }, [map, points]);
  return null;
}

export function MiniMap({ points, height = 260 }: { points: MapPoint[]; height?: number }) {
  const center: [number, number] = points.length ? [points[0].lat, points[0].lng] : [-2, 121];
  return (
    <div className="rounded-lg overflow-hidden border border-[#e3e2dd] isolate" style={{ height }}>
      <MapContainer center={center} zoom={9} scrollWheelZoom={false} className="h-full w-full" preferCanvas>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Fit points={points} />
        {points.map((p, i) => (
          <CircleMarker key={i} center={[p.lat, p.lng]} radius={6}
            pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: RCA_COLORS[p.rca] ?? C.neutral, fillOpacity: 0.9 }}>
            <Popup>
              <div className="text-xs leading-relaxed">
                <div className="font-semibold">{p.kec || "-"}</div>
                <div className="text-[#52514e]">{p.date}{p.va ? " · VA" : ""}</div>
                <div>{p.rca}{p.rca_detail ? ` — ${p.rca_detail}` : ""}</div>
                <div className="text-[#52514e]">{p.site ? `Site ${p.site} · ` : ""}{p.status}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
