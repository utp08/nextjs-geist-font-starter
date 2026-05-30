"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ThroughputSample } from "@/lib/signal-data";

interface ThroughputChartProps {
  data: ThroughputSample[];
  networkType: "4G" | "5G";
}

export function ThroughputChart({ data, networkType }: ThroughputChartProps) {
  const is5G = networkType === "5G";
  const dlKey = is5G ? "dl5G" : "dl4G";
  const ulKey = is5G ? "ul5G" : "ul4G";
  const dlColor = is5G ? "#a78bfa" : "#60a5fa";
  const ulColor = is5G ? "#22d3ee" : "#34d399";

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Throughput — {networkType} (Mbps)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`dlGrad${networkType}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={dlColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={dlColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`ulGrad${networkType}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ulColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={ulColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b7280" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey={dlKey} name="Downlink (Mbps)" stroke={dlColor} fill={`url(#dlGrad${networkType})`} strokeWidth={2} />
            <Area type="monotone" dataKey={ulKey} name="Uplink (Mbps)" stroke={ulColor} fill={`url(#ulGrad${networkType})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
