// Shape of public/data/ccm_dashboard.json (written by scripts/build_ccm_data.py).

export interface OkrMonth {
  month: string;
  ticket: number;
  subscriber: number;
  target_ratio: number;
}

export interface RepetitiveMonth {
  month: string;
  not_repetitive: number;
  repetitive: number;
}

export type RcaMonth = { month: string } & Record<string, number | string>;

export interface KabupatenRow {
  kabupaten: string;
  baseline: number;
  current: number;
}

export interface DailyPoint {
  day: number;
  baseline: number;
  current_all: number | null;
  current_non_va: number | null;
}

export interface CcmDashboardData {
  meta: {
    region: string;
    report_month: string;
    report_label: string;
    baseline_label: string;
    baseline_months?: string[];
    va_share?: number;
    generated_at: string;
    source: string;
  };
  highlights: { key_issues: string[]; kabupaten_notes: string[] };
  okr_trend: OkrMonth[];
  repetitive_siteid: RepetitiveMonth[];
  rca_categories: string[];
  rca_regional: RcaMonth[];
  top_kabupaten: { total_baseline: number; total_current: number; rows: KabupatenRow[] };
  daily: DailyPoint[];
  sqa_rca: { rca: string; total: number }[];
}

/** Ticket / subscriber ratio as the % shown in the OKR deck (e.g. 0.0062%). */
export function ratioPct(ticket: number, subscriber: number): number {
  return subscriber > 0 ? (ticket / subscriber) * 100 : 0;
}

export const fmtPct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;
export const fmtRatio = (v: number) => `${v.toFixed(4)}%`;

// Reference palette (light). Categorical slots in fixed order; neutral for "rest".
export const C = {
  s1: "#2a78d6",
  s2: "#eb6834",
  s3: "#1baf7a",
  s4: "#eda100",
  s5: "#e87ba4",
  neutral: "#c3c1b9",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#8a8880",
  grid: "#ecebe7",
  surface: "#ffffff",
  good: "#0ca30c",
  critical: "#d03b3b",
} as const;

export const RCA_COLORS: Record<string, string> = {
  "No feedback": C.neutral,
  Availability: C.s1,
  Capacity: C.s2,
  Coverage: C.s3,
  Others: C.s4,
  Quality: C.s5,
};
