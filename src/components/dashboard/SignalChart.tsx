"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { SignalSample } from "@/lib/signal-data";

interface SignalChartProps {
  data: SignalSample[];
  networkType: "4G" | "5G";
}

export function SignalChart({ data, networkType }: SignalChartProps) {
  const suffix = networkType === "4G" ? "4G" : "5G";
  const color = networkType === "4G" ? { rsrp: "#60a5fa", rsrq: "#f59e0b", sinr: "#34d399" } : { rsrp: "#a78bfa", rsrq: "#f97316", sinr: "#22d3ee" };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Signal Quality — {networkType} (RSRP / RSRQ / SINR)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b7280" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey={`rsrp${suffix}`} name="RSRP (dBm)" stroke={color.rsrp} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey={`rsrq${suffix}`} name="RSRQ (dB)" stroke={color.rsrq} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey={`sinr${suffix}`} name="SINR (dB)" stroke={color.sinr} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
