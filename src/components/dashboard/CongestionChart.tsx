"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import type { CongestionSample } from "@/lib/signal-data";

interface CongestionChartProps {
  data: CongestionSample[];
}

export function CongestionChart({ data }: CongestionChartProps) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Network Congestion Level (%)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b7280" }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Warn 80%", fill: "#f59e0b", fontSize: 10 }} />
            <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Crit 95%", fill: "#ef4444", fontSize: 10 }} />
            <Bar dataKey="congestion4G" name="4G Congestion %" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="congestion5G" name="5G Congestion %" fill="#a78bfa" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
