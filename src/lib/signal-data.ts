"use client";

export type NetworkType = "4G" | "5G";

export interface CellTower {
  id: string;
  name: string;
  location: string;
  networkType: NetworkType;
  status: "normal" | "congested" | "critical" | "offline";
  connectedUsers: number;
  maxCapacity: number;
  rsrp: number; // dBm, Reference Signal Received Power
  rsrq: number; // dB, Reference Signal Received Quality
  sinr: number; // dB, Signal to Interference + Noise Ratio
  throughputDl: number; // Mbps downlink
  throughputUl: number; // Mbps uplink
  congestionLevel: number; // 0-100%
  lat: number;
  lng: number;
}

export interface SignalSample {
  time: string;
  rsrp4G: number;
  rsrq4G: number;
  sinr4G: number;
  rsrp5G: number;
  rsrq5G: number;
  sinr5G: number;
}

export interface ThroughputSample {
  time: string;
  dl4G: number;
  ul4G: number;
  dl5G: number;
  ul5G: number;
}

export interface CongestionSample {
  time: string;
  congestion4G: number;
  congestion5G: number;
  users4G: number;
  users5G: number;
}

function rand(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function jitter(value: number, range: number, min: number, max: number, decimals = 1) {
  return parseFloat(Math.min(max, Math.max(min, value + (Math.random() - 0.5) * range * 2)).toFixed(decimals));
}

export function generateInitialTowers(): CellTower[] {
  const towers: CellTower[] = [
    { id: "T001", name: "Tower Alpha", location: "Central District", networkType: "5G", status: "normal", connectedUsers: 312, maxCapacity: 500, rsrp: -78, rsrq: -9.2, sinr: 18.4, throughputDl: 820, throughputUl: 210, congestionLevel: 62, lat: -6.2, lng: 106.8 },
    { id: "T002", name: "Tower Bravo", location: "North Sector", networkType: "5G", status: "congested", connectedUsers: 468, maxCapacity: 500, rsrp: -91, rsrq: -13.1, sinr: 9.7, throughputDl: 340, throughputUl: 88, congestionLevel: 94, lat: -6.15, lng: 106.82 },
    { id: "T003", name: "Tower Charlie", location: "West Zone", networkType: "4G", status: "normal", connectedUsers: 187, maxCapacity: 300, rsrp: -83, rsrq: -10.5, sinr: 14.2, throughputDl: 92, throughputUl: 28, congestionLevel: 62, lat: -6.22, lng: 106.78 },
    { id: "T004", name: "Tower Delta", location: "East Hub", networkType: "4G", status: "critical", connectedUsers: 298, maxCapacity: 300, rsrp: -104, rsrq: -16.8, sinr: 3.1, throughputDl: 18, throughputUl: 5, congestionLevel: 99, lat: -6.18, lng: 106.85 },
    { id: "T005", name: "Tower Echo", location: "South Point", networkType: "5G", status: "normal", connectedUsers: 145, maxCapacity: 500, rsrp: -72, rsrq: -7.4, sinr: 24.6, throughputDl: 1240, throughputUl: 380, congestionLevel: 29, lat: -6.26, lng: 106.81 },
    { id: "T006", name: "Tower Foxtrot", location: "Harbor Area", networkType: "4G", status: "offline", connectedUsers: 0, maxCapacity: 300, rsrp: -120, rsrq: -20.0, sinr: -2.0, throughputDl: 0, throughputUl: 0, congestionLevel: 0, lat: -6.21, lng: 106.75 },
    { id: "T007", name: "Tower Golf", location: "Airport Zone", networkType: "5G", status: "congested", connectedUsers: 441, maxCapacity: 500, rsrp: -86, rsrq: -12.3, sinr: 11.8, throughputDl: 512, throughputUl: 143, congestionLevel: 88, lat: -6.12, lng: 106.88 },
    { id: "T008", name: "Tower Hotel", location: "Industrial Park", networkType: "4G", status: "normal", connectedUsers: 98, maxCapacity: 300, rsrp: -79, rsrq: -9.8, sinr: 16.5, throughputDl: 78, throughputUl: 22, congestionLevel: 33, lat: -6.24, lng: 106.79 },
  ];
  return towers;
}

export function mutateTowers(towers: CellTower[]): CellTower[] {
  return towers.map((t) => {
    if (t.status === "offline") return t;
    const users = Math.min(t.maxCapacity, Math.max(0, t.connectedUsers + Math.round((Math.random() - 0.45) * 20)));
    const congestion = parseFloat(Math.min(100, Math.max(0, (users / t.maxCapacity) * 100 + rand(-3, 3))).toFixed(1));
    const status: CellTower["status"] = congestion >= 95 ? "critical" : congestion >= 80 ? "congested" : "normal";
    return {
      ...t,
      connectedUsers: users,
      congestionLevel: congestion,
      status,
      rsrp: jitter(t.rsrp, 2, -120, -60),
      rsrq: jitter(t.rsrq, 0.5, -20, -3),
      sinr: jitter(t.sinr, 1, -3, 30),
      throughputDl: Math.max(0, jitter(t.throughputDl, 30, 0, 2000)),
      throughputUl: Math.max(0, jitter(t.throughputUl, 10, 0, 600)),
    };
  });
}

export function generateHistoricalSamples(count = 20): {
  signal: SignalSample[];
  throughput: ThroughputSample[];
  congestion: CongestionSample[];
} {
  const now = Date.now();
  const signal: SignalSample[] = [];
  const throughput: ThroughputSample[] = [];
  const congestion: CongestionSample[] = [];

  let rsrp4 = -85, rsrq4 = -11, sinr4 = 13;
  let rsrp5 = -78, rsrq5 = -9, sinr5 = 19;
  let dl4 = 85, ul4 = 25, dl5 = 780, ul5 = 200;
  let cong4 = 65, cong5 = 58, u4 = 580, u5 = 900;

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * 30000);
    const label = t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    rsrp4 = jitter(rsrp4, 2, -110, -65); rsrq4 = jitter(rsrq4, 0.4, -18, -5); sinr4 = jitter(sinr4, 1, 2, 25);
    rsrp5 = jitter(rsrp5, 2, -100, -60); rsrq5 = jitter(rsrq5, 0.4, -15, -4); sinr5 = jitter(sinr5, 1, 5, 30);
    dl4 = jitter(dl4, 8, 10, 150); ul4 = jitter(ul4, 3, 5, 50); dl5 = jitter(dl5, 60, 200, 1500); ul5 = jitter(ul5, 20, 50, 450);
    cong4 = jitter(cong4, 4, 20, 100); cong5 = jitter(cong5, 4, 20, 100); u4 = jitter(u4, 20, 100, 900, 0); u5 = jitter(u5, 30, 200, 1500, 0);

    signal.push({ time: label, rsrp4G: rsrp4, rsrq4G: rsrq4, sinr4G: sinr4, rsrp5G: rsrp5, rsrq5G: rsrq5, sinr5G: sinr5 });
    throughput.push({ time: label, dl4G: dl4, ul4G: ul4, dl5G: dl5, ul5G: ul5 });
    congestion.push({ time: label, congestion4G: cong4, congestion5G: cong5, users4G: u4, users5G: u5 });
  }

  return { signal, throughput, congestion };
}
