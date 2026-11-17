#!/usr/bin/env python3
"""
Build the CCM Monitoring dashboard data (page 1 - Monthly Trend).

Reads raw files from data/raw/ and writes public/data/ccm_dashboard.json,
which the Next.js dashboard loads on every page refresh.

    python scripts/build_ccm_data.py
    python scripts/build_ccm_data.py --report-month 2026-10 --week W44

Raw inputs (see data/README.md):
    data/raw/tickets.xlsx | tickets.csv   ticket-level CCM export (one row per ticket)
    data/raw/subscribers.csv              month, subscriber, target_ratio
    data/raw/highlights.txt               optional bullet text for the summary boxes

Requires: pandas (+ openpyxl for .xlsx)
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_FILE = ROOT / "public" / "data" / "ccm_dashboard.json"

# ---------------------------------------------------------------------------
# CONFIG - adjust to match your raw export
# ---------------------------------------------------------------------------

# Left: name used by this script. Right: column header in YOUR raw export.
# Matching is case-insensitive and ignores surrounding spaces.
COLUMN_MAP = {
    "ticket_id": "ticket_id",
    "create_date": "create_date",   # ticket creation date/time
    "kabupaten": "kabupaten",
    "site_id": "site_id",
    "rca": "rca",                   # Availability / Capacity / Coverage / Quality / Others / (blank)
    "sqa_rca": "sqa_rca",           # detailed RCA for tickets assigned to SQA (blank if not SQA)
    "is_va": "is_va",               # 1/0, Y/N, TRUE/FALSE - ticket from Virtual Assistant (Veronika)
}

RCA_CATEGORIES = ["No feedback", "Availability", "Capacity", "Coverage", "Others", "Quality"]
OKR_TREND_MONTHS = 12          # bars in the "OKR CCM Trend" chart
RCA_TREND_MONTHS = 9           # bars in "Repetitive SITEID" and "RCA Regional"
BASELINE_MONTHS = 2            # BL = average of the N months before the report month
INCLUDE_VA_IN_OKR = True       # count VA tickets in OKR ticket totals / KPIs
TOP_N_KABUPATEN = 10

# How "repetitive" is counted for the Repetitive SITEID chart:
#   "ticket" -> number of tickets whose SITEID has >= 2 tickets in that month
#   "site"   -> number of SITEIDs with >= 2 tickets in that month
REPETITIVE_MODE = "ticket"
REPETITIVE_MIN_TICKETS = 2

# ---------------------------------------------------------------------------

TRUTHY = {"1", "y", "yes", "true", "va", "ya"}


def month_label(p: pd.Period) -> str:
    return p.strftime("%b'%y")


def load_tickets() -> pd.DataFrame:
    for name in ("tickets.xlsx", "tickets.xls", "tickets.csv"):
        path = RAW_DIR / name
        if path.exists():
            break
    else:
        sys.exit(f"No ticket file found. Put tickets.xlsx or tickets.csv in {RAW_DIR}")

    df = pd.read_csv(path, dtype=str) if path.suffix == ".csv" else pd.read_excel(path, dtype=str)
    lookup = {c.strip().lower(): c for c in df.columns}
    rename = {}
    for key, src in COLUMN_MAP.items():
        col = lookup.get(src.strip().lower())
        if col is None:
            if key in ("ticket_id", "create_date", "kabupaten"):
                sys.exit(f"Required column '{src}' (for {key}) not found in {path.name}. "
                         f"Columns present: {list(df.columns)}. Fix COLUMN_MAP in this script.")
            df[key] = None
            continue
        rename[col] = key
    df = df.rename(columns=rename)[list(COLUMN_MAP)]

    df["create_date"] = pd.to_datetime(df["create_date"], errors="coerce", dayfirst=True)
    bad = df["create_date"].isna().sum()
    if bad:
        print(f"warning: {bad} rows with unreadable create_date were dropped")
    df = df.dropna(subset=["create_date"]).drop_duplicates(subset="ticket_id")

    df["month"] = df["create_date"].dt.to_period("M")
    df["day"] = df["create_date"].dt.day
    df["kabupaten"] = df["kabupaten"].fillna("UNKNOWN").str.strip().str.upper()
    df["site_id"] = df["site_id"].fillna("").str.strip().str.upper()
    df["is_va"] = df["is_va"].fillna("").astype(str).str.strip().str.lower().isin(TRUTHY)

    canon = {c.lower(): c for c in RCA_CATEGORIES}
    rca = df["rca"].fillna("").astype(str).str.strip()
    df["rca"] = rca.map(lambda v: "No feedback" if v == "" else canon.get(v.lower(), "Others"))
    df["sqa_rca"] = df["sqa_rca"].fillna("").astype(str).str.strip()
    print(f"loaded {len(df)} tickets from {path.name} "
          f"({month_label(df['month'].min())} .. {month_label(df['month'].max())})")
    return df


def load_subscribers() -> pd.DataFrame:
    path = RAW_DIR / "subscribers.csv"
    if not path.exists():
        sys.exit(f"Missing {path}")
    sub = pd.read_csv(path)
    sub["month"] = pd.PeriodIndex(pd.to_datetime(sub["month"].astype(str)), freq="M")
    return sub.set_index("month")


def load_highlights() -> dict:
    """highlights.txt: lines under [key_issues] / [kabupaten_notes] headers, one bullet per line."""
    path = RAW_DIR / "highlights.txt"
    out: dict[str, list[str]] = {"key_issues": [], "kabupaten_notes": []}
    if not path.exists():
        return out
    section = "key_issues"
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            section = line[1:-1].strip()
            out.setdefault(section, [])
            continue
        out[section].append(line.lstrip("-• ").strip())
    return out


def build(report_month: str | None, week: str | None) -> dict:
    df = load_tickets()
    subs = load_subscribers()

    rep = pd.Period(report_month, "M") if report_month else df["month"].max()
    base_months = [rep - i for i in range(BASELINE_MONTHS, 0, -1)]
    okr_df = df if INCLUDE_VA_IN_OKR else df[~df["is_va"]]

    # 1. OKR trend ------------------------------------------------------------
    okr = []
    for m in [rep - i for i in range(OKR_TREND_MONTHS - 1, -1, -1)]:
        if m not in subs.index:
            print(f"warning: no subscriber row for {m}; month skipped in OKR trend")
            continue
        okr.append({
            "month": month_label(m),
            "ticket": int((okr_df["month"] == m).sum()),
            "subscriber": int(subs.at[m, "subscriber"]),
            "target_ratio": float(subs.at[m, "target_ratio"]),
        })

    trend_months = [rep - i for i in range(RCA_TREND_MONTHS - 1, -1, -1)]

    # 2. Repetitive SITEID ----------------------------------------------------
    repetitive = []
    for m in trend_months:
        cur = df[(df["month"] == m) & (df["site_id"] != "")]
        counts = cur.groupby("site_id").size()
        is_rep = counts >= REPETITIVE_MIN_TICKETS
        if REPETITIVE_MODE == "site":
            r, n = int(is_rep.sum()), int((~is_rep).sum())
        else:
            r, n = int(counts[is_rep].sum()), int(counts[~is_rep].sum())
        repetitive.append({"month": month_label(m), "not_repetitive": n, "repetitive": r})

    # 3. RCA regional ---------------------------------------------------------
    rca = []
    for m in trend_months:
        vc = df.loc[df["month"] == m, "rca"].value_counts()
        rca.append({"month": month_label(m), **{c: int(vc.get(c, 0)) for c in RCA_CATEGORIES}})

    # 4. Top kabupaten: report month vs baseline -----------------------------
    cur = df[df["month"] == rep]
    base = df[df["month"].isin(base_months)]
    cur_k = cur.groupby("kabupaten").size()
    base_k = base.groupby("kabupaten").size() / BASELINE_MONTHS
    top = cur_k.sort_values(ascending=False).head(TOP_N_KABUPATEN)
    top_kab = {
        "total_baseline": round(len(base) / BASELINE_MONTHS, 1),
        "total_current": int(len(cur)),
        "rows": [{"kabupaten": k, "baseline": round(float(base_k.get(k, 0)), 1), "current": int(v)}
                 for k, v in top.items()],
    }

    # 5. Daily comparison -----------------------------------------------------
    days_in_rep = rep.days_in_month
    last_day = int(cur["day"].max()) if len(cur) else 0
    base_daily = base.groupby("day").size() / BASELINE_MONTHS
    cur_all = cur.groupby("day").size()
    cur_nva = cur[~cur["is_va"]].groupby("day").size()
    daily = []
    for d in range(1, 32):
        has_cur = d <= min(last_day, days_in_rep)
        daily.append({
            "day": d,
            "baseline": round(float(base_daily.get(d, 0)), 1),
            "current_all": int(cur_all.get(d, 0)) if has_cur else None,
            "current_non_va": int(cur_nva.get(d, 0)) if has_cur else None,
        })

    # 6. SQA RCA --------------------------------------------------------------
    sqa = cur.loc[cur["sqa_rca"] != "", "sqa_rca"].value_counts()
    sqa_rows = [{"rca": k, "total": int(v)} for k, v in sqa.items()]

    va_share = float(cur["is_va"].mean()) if len(cur) else 0.0

    return {
        "meta": {
            "region": "R09 Sulawesi",
            "report_month": month_label(rep),
            "report_label": " · ".join(x for x in [week, rep.strftime("%B %Y")] if x),
            "baseline_label": "BL",
            "baseline_months": [month_label(m) for m in base_months],
            "va_share": round(va_share, 4),
            "generated_at": date.today().isoformat(),
            "source": "data/raw (build_ccm_data.py)",
        },
        "highlights": load_highlights(),
        "okr_trend": okr,
        "repetitive_siteid": repetitive,
        "rca_categories": RCA_CATEGORIES,
        "rca_regional": rca,
        "top_kabupaten": top_kab,
        "daily": daily,
        "sqa_rca": sqa_rows,
    }


def main() -> None:
    global RAW_DIR
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--report-month", help="YYYY-MM (default: latest month in the ticket data)")
    ap.add_argument("--week", help="label shown in the header, e.g. W40")
    ap.add_argument("--raw-dir", type=Path, default=RAW_DIR, help="folder with the raw files")
    ap.add_argument("--out", type=Path, default=OUT_FILE)
    args = ap.parse_args()

    RAW_DIR = args.raw_dir

    data = build(args.report_month, args.week)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    m = data["okr_trend"][-1] if data["okr_trend"] else None
    print(f"wrote {args.out}")
    if m:
        print(f"{m['month']}: {m['ticket']} tickets, ratio {m['ticket'] / m['subscriber']:.4%} "
              f"(target {m['target_ratio']:.4%})")


if __name__ == "__main__":
    main()
