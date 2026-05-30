"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "warning" | "danger" | "success";
}

const variantStyles = {
  default: "border-border",
  warning: "border-yellow-500/50 bg-yellow-500/5",
  danger: "border-red-500/50 bg-red-500/5",
  success: "border-green-500/50 bg-green-500/5",
};

const iconStyles = {
  default: "text-blue-400 bg-blue-400/10",
  warning: "text-yellow-400 bg-yellow-400/10",
  danger: "text-red-400 bg-red-400/10",
  success: "text-green-400 bg-green-400/10",
};

export function KpiCard({ title, value, unit, subtitle, icon: Icon, trend, trendValue, variant = "default" }: KpiCardProps) {
  return (
    <Card className={cn("border", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
            {trendValue && (
              <p className={cn("mt-1 text-xs font-medium", trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground")}>
                {trend === "up" ? "▲" : trend === "down" ? "▼" : "–"} {trendValue}
              </p>
            )}
          </div>
          <div className={cn("ml-3 rounded-lg p-2 shrink-0", iconStyles[variant])}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
