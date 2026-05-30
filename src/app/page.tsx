"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Users, Signal, Zap, Radio, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SignalChart } from "@/components/dashboard/SignalChart";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";
import { CongestionChart } from "@/components/dashboard/CongestionChart";
import { TowerTable } from "@/components/dashboard/TowerTable";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import {
  generateInitialTowers,
  generateHistoricalSamples,
  mutateTowers,
  type NetworkType,
  type SignalSample,
  type ThroughputSample,
  type CongestionSample,
  type CellTower,
} from "@/lib/signal-data";

const MAX_SAMPLES = 20;

export default function Dashboard() {
  const [networkFilter, setNetworkFilter] = useState<"all" | NetworkType>("all");
  const [chartNet, setChartNet] = useState<NetworkType>("5G");
  const [towers, setTowers] = useState<CellTower[]>([]);
  const [signal, setSignal] = useState<SignalSample[]>([]);
  const [throughput, setThroughput] = useState<ThroughputSample[]>([]);
  const [congestion, setCongestion] = useState<CongestionSample[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize
  useEffect(() => {
    const t = generateInitialTowers();
    const { signal: s, throughput: th, congestion: c } = generateHistoricalSamples(MAX_SAMPLES);
    setTowers(t);
    setSignal(s);
    setThroughput(th);
    setCongestion(c);
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  // Live update loop
  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      setTowers((prev) => mutateTowers(prev));

      setSignal((prev) => {
        const last = prev[prev.length - 1];
        const newSample: SignalSample = {
          time: timeLabel,
          rsrp4G: +(Math.min(-65, Math.max(-110, (last?.rsrp4G ?? -85) + (Math.random() - 0.5) * 4)).toFixed(1)),
          rsrq4G: +(Math.min(-5, Math.max(-18, (last?.rsrq4G ?? -11) + (Math.random() - 0.5) * 0.8)).toFixed(1)),
          sinr4G: +(Math.min(25, Math.max(2, (last?.sinr4G ?? 13) + (Math.random() - 0.5) * 2)).toFixed(1)),
          rsrp5G: +(Math.min(-60, Math.max(-100, (last?.rsrp5G ?? -78) + (Math.random() - 0.5) * 4)).toFixed(1)),
          rsrq5G: +(Math.min(-4, Math.max(-15, (last?.rsrq5G ?? -9) + (Math.random() - 0.5) * 0.8)).toFixed(1)),
          sinr5G: +(Math.min(30, Math.max(5, (last?.sinr5G ?? 19) + (Math.random() - 0.5) * 2)).toFixed(1)),
        };
        return [...prev.slice(-MAX_SAMPLES + 1), newSample];
      });

      setThroughput((prev) => {
        const last = prev[prev.length - 1];
        const newSample: ThroughputSample = {
          time: timeLabel,
          dl4G: +(Math.max(5, Math.min(150, (last?.dl4G ?? 85) + (Math.random() - 0.5) * 16)).toFixed(1)),
          ul4G: +(Math.max(2, Math.min(50, (last?.ul4G ?? 25) + (Math.random() - 0.5) * 6)).toFixed(1)),
          dl5G: +(Math.max(100, Math.min(1500, (last?.dl5G ?? 780) + (Math.random() - 0.5) * 120)).toFixed(1)),
          ul5G: +(Math.max(30, Math.min(450, (last?.ul5G ?? 200) + (Math.random() - 0.5) * 40)).toFixed(1)),
        };
        return [...prev.slice(-MAX_SAMPLES + 1), newSample];
      });

      setCongestion((prev) => {
        const last = prev[prev.length - 1];
        const newSample: CongestionSample = {
          time: timeLabel,
          congestion4G: +(Math.max(10, Math.min(100, (last?.congestion4G ?? 65) + (Math.random() - 0.45) * 8)).toFixed(1)),
          congestion5G: +(Math.max(10, Math.min(100, (last?.congestion5G ?? 58) + (Math.random() - 0.45) * 8)).toFixed(1)),
          users4G: Math.max(50, Math.min(900, Math.round((last?.users4G ?? 580) + (Math.random() - 0.45) * 40))),
          users5G: Math.max(100, Math.min(1500, Math.round((last?.users5G ?? 900) + (Math.random() - 0.45) * 60))),
        };
        return [...prev.slice(-MAX_SAMPLES + 1), newSample];
      });

      setLastUpdate(now.toLocaleTimeString());
    }, 3000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive]);

  // Derived KPIs
  const activeTowers = towers.filter((t) => t.status !== "offline");
  const totalUsers = towers.reduce((s, t) => s + t.connectedUsers, 0);
  const avgCongestion = activeTowers.length > 0
    ? (activeTowers.reduce((s, t) => s + t.congestionLevel, 0) / activeTowers.length).toFixed(1)
    : "0";
  const avgSinr5G = towers.filter((t) => t.networkType === "5G" && t.status !== "offline");
  const avgSinr = avgSinr5G.length > 0
    ? (avgSinr5G.reduce((s, t) => s + t.sinr, 0) / avgSinr5G.length).toFixed(1)
    : "—";
  const totalDl = towers.reduce((s, t) => s + t.throughputDl, 0).toFixed(0);
  const criticalCount = towers.filter((t) => t.status === "critical").length;
  const offlineCount = towers.filter((t) => t.status === "offline").length;

  const latestCong = congestion[congestion.length - 1];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto max-w-screen-2xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio size={20} className="text-violet-400" />
              <span className="font-bold text-lg tracking-tight">SignalOps</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-400">
              4G / 5G Monitor
            </Badge>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">Updated: {lastUpdate}</span>
            <Button
              size="sm"
              variant={isLive ? "default" : "outline"}
              className="h-7 text-xs gap-1.5"
              onClick={() => setIsLive((v) => !v)}
            >
              <RefreshCw size={12} className={isLive ? "animate-spin" : ""} />
              {isLive ? "Live" : "Paused"}
            </Button>
            {criticalCount > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs gap-1">
                <AlertTriangle size={11} /> {criticalCount} Critical
              </Badge>
            )}
            {offlineCount > 0 && (
              <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/40 text-xs gap-1">
                <WifiOff size={11} /> {offlineCount} Offline
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 py-6 space-y-6">
        {/* Alert banners */}
        <AlertBanner towers={towers} />

        {/* KPI Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            title="Total Users"
            value={totalUsers.toLocaleString()}
            icon={Users}
            subtitle="Across all towers"
            variant="default"
          />
          <KpiCard
            title="Avg Congestion"
            value={avgCongestion}
            unit="%"
            icon={Activity}
            variant={Number(avgCongestion) >= 85 ? "danger" : Number(avgCongestion) >= 70 ? "warning" : "success"}
            subtitle="Active towers"
          />
          <KpiCard
            title="Avg SINR (5G)"
            value={avgSinr}
            unit="dB"
            icon={Signal}
            variant="default"
            subtitle="Signal quality"
          />
          <KpiCard
            title="Total DL"
            value={Number(totalDl).toLocaleString()}
            unit="Mbps"
            icon={Zap}
            variant="default"
            subtitle="Aggregate downlink"
          />
          <KpiCard
            title="4G Congestion"
            value={latestCong?.congestion4G?.toFixed(1) ?? "—"}
            unit="%"
            icon={Activity}
            variant={Number(latestCong?.congestion4G) >= 85 ? "danger" : Number(latestCong?.congestion4G) >= 70 ? "warning" : "success"}
            subtitle="Current"
          />
          <KpiCard
            title="5G Congestion"
            value={latestCong?.congestion5G?.toFixed(1) ?? "—"}
            unit="%"
            icon={Activity}
            variant={Number(latestCong?.congestion5G) >= 85 ? "danger" : Number(latestCong?.congestion5G) >= 70 ? "warning" : "success"}
            subtitle="Current"
          />
        </section>

        {/* Chart network selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Chart View:</span>
          <Tabs value={chartNet} onValueChange={(v) => setChartNet(v as NetworkType)}>
            <TabsList className="h-8">
              <TabsTrigger value="4G" className="text-xs px-4">4G LTE</TabsTrigger>
              <TabsTrigger value="5G" className="text-xs px-4">5G NR</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SignalChart data={signal} networkType={chartNet} />
          <ThroughputChart data={throughput} networkType={chartNet} />
        </div>

        {/* Congestion chart full width */}
        <CongestionChart data={congestion} />

        {/* Tower table with filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">Filter Towers:</span>
            <Tabs value={networkFilter} onValueChange={(v) => setNetworkFilter(v as "all" | NetworkType)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                <TabsTrigger value="4G" className="text-xs px-3">4G Only</TabsTrigger>
                <TabsTrigger value="5G" className="text-xs px-3">5G Only</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Congested</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Offline</span>
            </div>
          </div>
          <TowerTable towers={towers} filter={networkFilter} />
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pb-4">
          SignalOps — 4G/5G Crowd Management Dashboard · Data updates every 3s · {towers.length} towers monitored
        </footer>
      </main>
    </div>
  );
}
