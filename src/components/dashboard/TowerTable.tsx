"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CellTower } from "@/lib/signal-data";
import { cn } from "@/lib/utils";

interface TowerTableProps {
  towers: CellTower[];
  filter: "all" | "4G" | "5G";
}

const statusConfig = {
  normal: { label: "Normal", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  congested: { label: "Congested", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  critical: { label: "Critical", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  offline: { label: "Offline", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const netConfig = {
  "4G": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "5G": "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

export function TowerTable({ towers, filter }: TowerTableProps) {
  const filtered = filter === "all" ? towers : towers.filter((t) => t.networkType === filter);

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Cell Tower Status ({filtered.length} towers)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Tower</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Net</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Users</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground min-w-[100px]">Congestion</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">RSRP</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">SINR</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">DL Mbps</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">UL Mbps</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tower) => {
                const s = statusConfig[tower.status];
                const congColor =
                  tower.congestionLevel >= 95
                    ? "[&>div]:bg-red-500"
                    : tower.congestionLevel >= 80
                    ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-green-500";
                return (
                  <tr key={tower.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-4">
                      <div className="font-medium">{tower.name}</div>
                      <div className="text-xs text-muted-foreground">{tower.location}</div>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0", netConfig[tower.networkType])}>
                        {tower.networkType}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", s.className)}>
                        {s.label}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      <span className={tower.status === "critical" ? "text-red-400 font-semibold" : ""}>{tower.connectedUsers}</span>
                      <span className="text-muted-foreground">/{tower.maxCapacity}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Progress value={tower.congestionLevel} className={cn("h-1.5 w-20 bg-muted", congColor)} />
                        <span className={cn("text-xs tabular-nums w-10",
                          tower.congestionLevel >= 95 ? "text-red-400 font-bold" :
                          tower.congestionLevel >= 80 ? "text-yellow-400 font-semibold" : "text-muted-foreground"
                        )}>
                          {tower.congestionLevel.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs">
                      <span className={tower.rsrp < -100 ? "text-red-400" : tower.rsrp < -90 ? "text-yellow-400" : "text-green-400"}>
                        {tower.rsrp.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs">
                      <span className={tower.sinr < 5 ? "text-red-400" : tower.sinr < 12 ? "text-yellow-400" : "text-green-400"}>
                        {tower.sinr.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs">{tower.throughputDl.toFixed(0)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs">{tower.throughputUl.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
