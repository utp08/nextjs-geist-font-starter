// Shape of public/data/ccm_dashboard.json (written by scripts/build_ccm_data.py).

export interface OkrMonth {
  month: string;
  ticket: number;
  subscriber: number;
  target_ratio: number;
  source?: "raw" | "history";
  subscriber_estimated?: boolean;
  /** Month-to-date (report month not finished yet). */
  mtd?: boolean;
  days_elapsed?: number;
  days_in_month?: number;
  /** Run-rate projection to full month: ticket / days_elapsed * days_in_month. */
  projected_ticket?: number;
}

export interface RepetitiveMonth {
  month: string;
  not_repetitive: number;
  repetitive: number;
}

export type RcaMonth = { month: string } & Record<string, number | string>;

export interface KabupatenRow {
  kabupaten: string;
  baseline: number | null;
  current: number;
}

export interface DailyPoint {
  day: number;
  baseline: number | null;
  current_all: number | null;
  current_non_va: number | null;
}

export interface MapPoint {
  lat: number;
  lng: number;
  date: string;
  month: string;
  kab: string;
  kec: string;
  site: string;
  rca: string;
  rca_detail: string;
  dept: string;
  status: string;
  va: boolean;
}

export interface CcmDashboardData {
  meta: {
    region: string;
    report_month: string;
    report_label: string;
    baseline_label: string;
    baseline_months?: string[];
    baseline_note?: string;
    is_mtd?: boolean;
    days_elapsed?: number;
    days_in_month?: number;
    has_va?: boolean;
    va_share?: number | null;
    sqa_without_rca?: number;
    data_range?: string | null;
    generated_at: string;
    source: string;
  };
  highlights: { key_issues: string[]; kabupaten_notes: string[] };
  okr_trend: OkrMonth[];
  repetitive_siteid: RepetitiveMonth[];
  rca_categories: string[];
  rca_regional: RcaMonth[];
  top_kabupaten: { total_baseline: number | null; total_current: number; unknown_current?: number; rows: KabupatenRow[] };
  daily: DailyPoint[];
  sqa_rca: { rca: string; total: number }[];
  map?: { months: string[]; points: MapPoint[]; without_coords: Record<string, number> };
}

/** Ticket / subscriber ratio as the % shown in the OKR deck (e.g. 0.0062%). */
export function ratioPct(ticket: number, subscriber: number): number {
  return subscriber > 0 ? (ticket / subscriber) * 100 : 0;
}

/** Ticket count used for the OKR ratio: projected full month when month-to-date. */
export const okrTicket = (m: OkrMonth) => (m.mtd && m.projected_ticket != null ? m.projected_ticket : m.ticket);

export const fmtPct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;
export const fmtRatio = (v: number) => `${v.toFixed(4)}%`;

// Reference palette (light). Categorical slots in fixed order; neutral for "rest".
export const C = {
  s1: "#2a78d6",
  s2: "#eb6834",
  s3: "#1baf7a",
  s4: "#eda100",
  s5: "#e87ba4",
  s6: "#008300",
  s7: "#6250d6",
  s8: "#e34948",
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

/** Categorical slots in fixed order (reference palette, light). */
export const SERIES = [C.s1, C.s2, C.s3, C.s4, C.s5, C.s6, C.s7, C.s8];

// ---------------------------------------------------------------- page 2

export interface IncrementRankRow {
  kab: string;
  nop: string;
  current: number;
  baseline: number | null;
  delta: number | null;
}

export interface IncrementMonth {
  label: string;
  is_mtd: boolean;
  days: number;
  days_in_month: number;
  baseline_note: string;
  has_baseline: boolean;
  baseline_per_day: Record<string, number>;
  ranking: IncrementRankRow[];
  focus: string[];
  notes: Record<string, { issue: string; text: string }>;
}

export interface IncrementSite {
  site: string;
  kec: string;
  n: number;
  rca: string;
  detail: string;
  first: string;
  last: string;
}

export interface KabMonth {
  current: number;
  kecamatan: string[];
  daily: ({ day: number } & Record<string, number>)[];
  sites: IncrementSite[];
  rca: Record<string, number>;
  va: number;
}

export interface KabData {
  nop: string;
  provinsi: string;
  trend: { date: string; n: number }[];
  months: Record<string, KabMonth>;
}

export type KpiRow = { date: string } & Record<string, number | null | string>;

export interface CcmIncrementData {
  meta: { months: string[]; default_month: string; data_range: string; generated_at: string; rca_categories: string[] };
  months: Record<string, IncrementMonth>;
  kabupaten: Record<string, KabData>;
  kpi: Record<string, KpiRow[]>;
}
