"use client";

import { AlertTriangle, XCircle, Wifi } from "lucide-react";
import type { CellTower } from "@/lib/signal-data";

interface AlertBannerProps {
  towers: CellTower[];
}

export function AlertBanner({ towers }: AlertBannerProps) {
  const critical = towers.filter((t) => t.status === "critical");
  const offline = towers.filter((t) => t.status === "offline");
  const congested = towers.filter((t) => t.status === "congested");

  if (critical.length === 0 && offline.length === 0 && congested.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {critical.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <XCircle size={15} className="shrink-0" />
          <span><strong>{t.name}</strong> ({t.location}) — CRITICAL congestion {t.congestionLevel.toFixed(0)}%, RSRP {t.rsrp.toFixed(1)} dBm</span>
        </div>
      ))}
      {offline.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-lg border border-gray-500/40 bg-gray-500/10 px-4 py-2 text-sm text-gray-300">
          <Wifi size={15} className="shrink-0" />
          <span><strong>{t.name}</strong> ({t.location}) — Tower OFFLINE, no signal detected</span>
        </div>
      ))}
      {congested.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300">
          <AlertTriangle size={15} className="shrink-0" />
          <span><strong>{t.name}</strong> ({t.location}) — High congestion {t.congestionLevel.toFixed(0)}% ({t.connectedUsers}/{t.maxCapacity} users)</span>
        </div>
      ))}
    </div>
  );
}
