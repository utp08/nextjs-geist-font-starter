#!/usr/bin/env python3
"""
Build the CCM Monitoring dashboard data (page 1 - Monthly Trend).

Reads raw files from data/raw/ and writes public/data/ccm_dashboard.json,
which the Next.js dashboard loads on every page refresh.

    python scripts/build_ccm_data.py
    python scripts/build_ccm_data.py --report-month 2026-10

Raw inputs (see data/README.md):
    data/raw/weekly/*.xlsx|*.csv     weekly ticket exports (R09_Raw_T.._Ticket...xlsx), all kept;
                                     tickets are merged and de-duplicated by Order ID (newest file wins)
    data/raw/history_monthly.csv     monthly aggregates for months before the raw data starts
    data/raw/subscribers.csv         month, subscriber, target_ratio
    data/raw/highlights.txt          optional bullet text for the summary boxes

Requires: pandas + openpyxl
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import warnings
from datetime import date
from pathlib import Path

import pandas as pd

warnings.filterwarnings("ignore", category=pd.errors.PerformanceWarning)
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_FILE = ROOT / "public" / "data" / "ccm_dashboard.json"

# ---------------------------------------------------------------------------
# CONFIG - adjust to match your raw export
# ---------------------------------------------------------------------------

# Script field -> column header(s) in the raw export (case-insensitive).
# A list means "first non-empty value wins" (fallback columns). None = not available.
COLUMN_MAP: dict[str, str | list[str] | None] = {
    "ticket_id": "Order ID",
    "create_date": "Create Time",
    "kabupaten": "Kabupaten/Kota(Create Ticket)",
    "kecamatan": "kecamatan(Create Ticket)",
    "provinsi": "Provinsi(Create Ticket_provinsi)",
    "site_id": ["site_id1(L1 Assign)", "Site ID(L2 Assign)", "site_id2(L1 Assign)"],
    "rca": "Root Caused Category(L2 Assign)",       # RCA Regional chart
    "sqa_rca": "Root Caused Tier 8(L2 Assign)",     # RCA for tickets assigned to SQA
    "dept": "Dept",                                 # NOP / SQA / RTPE
    "nop": "NOP",
    "status": "Business Status",
    "last_update": "Last Update Time",
    "is_va": None,                                  # TODO: column that marks Virtual Assistant (Veronika) tickets
}
REQUIRED = ("ticket_id", "create_date", "kabupaten")

EXCLUDE_STATUS = {"cancel"}          # Business Status values left out of every count
SQA_DEPT = "SQA"                     # value of `dept` for tickets assigned to SQA

RCA_CATEGORIES = ["No feedback", "Availability", "Capacity", "Coverage", "Others", "Quality"]
OKR_TREND_MONTHS = 12          # bars in the "OKR CCM Trend" chart
RCA_TREND_MONTHS = 9           # bars in "Repetitive SITEID" and "RCA Regional"
BASELINE_MONTHS = 2            # BL = the N months before the report month
INCLUDE_VA_IN_OKR = True       # count VA tickets in OKR ticket totals / KPIs
TOP_N_KABUPATEN = 10

# How "repetitive" is counted for the Repetitive SITEID chart:
#   "ticket" -> number of tickets whose SITEID has >= 2 tickets in that month
#   "site"   -> number of SITEIDs with >= 2 tickets in that month
REPETITIVE_MODE = "ticket"
REPETITIVE_MIN_TICKETS = 2

# ---------------------------------------------------------------------------

TRUTHY = {"1", "1.0", "y", "yes", "true", "va", "ya"}
BLANKS = {"", "-", "--", "'-", "'--", "nan", "none", "null", "n/a"}


def month_label(p: pd.Period) -> str:
    return p.strftime("%b'%y")


def clean_text(s: pd.Series) -> pd.Series:
    s = s.astype("string").str.strip()
    return s.mask(s.str.lower().isin(BLANKS) | s.isna(), "")


# ------------------------------------------------------------------ loading


def read_export(path: Path) -> pd.DataFrame:
    """Read one weekly export; picks the sheet that holds the ticket-id column."""
    want = str(COLUMN_MAP["ticket_id"]).strip().lower()
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path, dtype=str)
    xl = pd.ExcelFile(path)
    for sheet in xl.sheet_names:
        head = xl.parse(sheet, nrows=0)
        if want in {str(c).strip().lower() for c in head.columns}:
            return xl.parse(sheet, dtype=str)
    sys.exit(f"{path.name}: no sheet has a '{COLUMN_MAP['ticket_id']}' column (sheets: {xl.sheet_names})")


def normalise(df: pd.DataFrame, source: str) -> pd.DataFrame:
    lookup = {str(c).strip().lower(): c for c in df.columns}
    out = pd.DataFrame(index=df.index)
    for key, spec in COLUMN_MAP.items():
        names = [] if spec is None else ([spec] if isinstance(spec, str) else list(spec))
        cols = [lookup[n.strip().lower()] for n in names if n.strip().lower() in lookup]
        if not cols:
            if key in REQUIRED:
                sys.exit(f"{source}: required column {names} for '{key}' not found. Fix COLUMN_MAP.")
            out[key] = ""
            continue
        val = clean_text(df[cols[0]])
        for c in cols[1:]:
            val = val.mask(val == "", clean_text(df[c]))
        out[key] = val
    out["source_file"] = source
    return out


def load_tickets() -> pd.DataFrame | None:
    folder = RAW_DIR / "weekly"
    files = sorted([*folder.glob("*.xlsx"), *folder.glob("*.xls"), *folder.glob("*.csv")]) if folder.exists() else []
    files = [f for f in files if not f.name.startswith("~$")]
    if not files:
        print(f"note: no weekly exports in {folder} - dashboard uses history only")
        return None

    frames = []
    for f in files:
        df = normalise(read_export(f), f.name)
        df["create_date"] = pd.to_datetime(df["create_date"], errors="coerce")
        df["_file_max"] = df["create_date"].max()
        frames.append(df)
        print(f"  {f.name}: {len(df)} rows, {df['create_date'].min():%d %b} .. {df['create_date'].max():%d %b %Y}")
    df = pd.concat(frames, ignore_index=True)

    bad = df["create_date"].isna().sum()
    if bad:
        print(f"warning: {bad} rows with unreadable create_date dropped")
    df = df.dropna(subset=["create_date"])
    # newest export wins for a ticket that appears in several weekly files
    df = df.sort_values(["_file_max", "source_file"]).drop_duplicates("ticket_id", keep="last")

    excluded = df["status"].str.lower().isin(EXCLUDE_STATUS)
    if excluded.any():
        print(f"  excluded {int(excluded.sum())} tickets with status {sorted(EXCLUDE_STATUS)}")
    df = df[~excluded].copy()

    df["month"] = df["create_date"].dt.to_period("M")
    df["day"] = df["create_date"].dt.day
    df["date"] = df["create_date"].dt.normalize()
    df["site_id"] = df["site_id"].str.upper()
    df["kabupaten"] = df["kabupaten"].str.upper()
    # fill empty kabupaten from other tickets on the same SITEID (most frequent kabupaten)
    known = df[(df["kabupaten"] != "") & (df["site_id"] != "")]
    site_kab = known.groupby("site_id")["kabupaten"].agg(lambda s: s.value_counts().index[0])
    blank = df["kabupaten"] == ""
    df.loc[blank, "kabupaten"] = df.loc[blank, "site_id"].map(site_kab).fillna("")
    filled = int(blank.sum() - (df["kabupaten"] == "").sum())
    if blank.any():
        print(f"  kabupaten kosong: {int(blank.sum())} tiket, {filled} diisi dari SITEID, "
              f"{int((df['kabupaten'] == '').sum())} tetap kosong")
    df["is_va"] = df["is_va"].str.lower().isin(TRUTHY)
    canon = {c.lower(): c for c in RCA_CATEGORIES}
    df["rca"] = df["rca"].map(lambda v: "No feedback" if v == "" else canon.get(v.lower(), "Others"))
    print(f"tickets: {len(df)} unique from {len(files)} file(s), "
          f"{df['create_date'].min():%d %b %Y} .. {df['create_date'].max():%d %b %Y}")
    return df


def load_history() -> pd.DataFrame:
    path = RAW_DIR / "history_monthly.csv"
    if not path.exists():
        return pd.DataFrame()
    h = pd.read_csv(path)
    h["month"] = pd.PeriodIndex(pd.to_datetime(h["month"].astype(str)), freq="M")
    return h.set_index("month")


def load_subscribers() -> pd.DataFrame:
    path = RAW_DIR / "subscribers.csv"
    if not path.exists():
        sys.exit(f"Missing {path}")
    sub = pd.read_csv(path)
    sub["month"] = pd.PeriodIndex(pd.to_datetime(sub["month"].astype(str)), freq="M")
    return sub.set_index("month").sort_index()


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
        out[section].append(re.sub(r"^[-•]\s*", "", line))
    return out


# ------------------------------------------------------------------ helpers


def hist_int(h: pd.DataFrame, m: pd.Period, col: str) -> int | None:
    if m in h.index and col in h.columns and pd.notna(h.at[m, col]):
        return int(h.at[m, col])
    return None


def repetitive_counts(cur: pd.DataFrame) -> tuple[int, int]:
    counts = cur[cur["site_id"] != ""].groupby("site_id").size()
    is_rep = counts >= REPETITIVE_MIN_TICKETS
    if REPETITIVE_MODE == "site":
        return int(is_rep.sum()), int((~is_rep).sum())
    return int(counts[is_rep].sum()), int(counts[~is_rep].sum())


# ------------------------------------------------------------------ build


def build(report_month: str | None) -> dict:
    print("loading raw data ...")
    df = load_tickets()
    hist = load_history()
    subs = load_subscribers()

    if df is not None:
        cov_start, cov_end = df["date"].min(), df["date"].max()
        rep = pd.Period(report_month, "M") if report_month else df["month"].max()
    else:
        if hist.empty:
            sys.exit("No weekly exports and no history_monthly.csv - nothing to build.")
        cov_start = cov_end = None
        rep = pd.Period(report_month, "M") if report_month else hist.index.max()

    def raw_full(m: pd.Period) -> bool:
        """Raw data covers month m from its first day."""
        return df is not None and cov_start <= m.start_time.normalize() and cov_end >= m.start_time

    def use_raw(m: pd.Period) -> bool:
        if raw_full(m):
            return True
        return df is not None and m not in hist.index and (df["month"] == m).any()

    days_in_rep = rep.days_in_month
    if df is not None and cov_end.to_period("M") == rep and cov_end.day < days_in_rep:
        days_elapsed, is_mtd = int(cov_end.day), True
    else:
        days_elapsed, is_mtd = days_in_rep, False
    cur = df[df["month"] == rep] if df is not None else None
    okr_df = None if df is None else (df if INCLUDE_VA_IN_OKR else df[~df["is_va"]])

    # 1. OKR trend ------------------------------------------------------------
    okr = []
    last_sub = None
    for m in [rep - i for i in range(OKR_TREND_MONTHS - 1, -1, -1)]:
        if use_raw(m):
            ticket, src = int((okr_df["month"] == m).sum()), "raw"
        else:
            ticket, src = hist_int(hist, m, "ticket"), "history"
        if ticket is None:
            continue
        known = subs.loc[subs.index <= m]
        if known.empty:
            print(f"warning: no subscriber data on/before {m}; month skipped")
            continue
        estimated = m not in subs.index
        if estimated and last_sub != m:
            print(f"note: subscriber for {m} not in subscribers.csv - using {known.index[-1]}")
        last_sub = m
        row = {
            "month": month_label(m),
            "ticket": ticket,
            "subscriber": int(known["subscriber"].iloc[-1]),
            "target_ratio": float(known["target_ratio"].iloc[-1]),
            "source": src,
        }
        if estimated:
            row["subscriber_estimated"] = True
        if m == rep and is_mtd:
            row.update(mtd=True, days_elapsed=days_elapsed, days_in_month=days_in_rep,
                       projected_ticket=round(ticket / days_elapsed * days_in_rep))
        okr.append(row)

    trend_months = [rep - i for i in range(RCA_TREND_MONTHS - 1, -1, -1)]

    # 2. Repetitive SITEID ----------------------------------------------------
    repetitive = []
    for m in trend_months:
        if use_raw(m):
            r, n = repetitive_counts(df[df["month"] == m])
        else:
            r, n = hist_int(hist, m, "repetitive"), hist_int(hist, m, "not_repetitive")
            if r is None or n is None:
                continue
        repetitive.append({"month": month_label(m) + (" MTD" if m == rep and is_mtd else ""),
                           "not_repetitive": n, "repetitive": r})

    # 3. RCA regional ---------------------------------------------------------
    rca = []
    for m in trend_months:
        if use_raw(m):
            vc = df.loc[df["month"] == m, "rca"].value_counts()
            vals = {c: int(vc.get(c, 0)) for c in RCA_CATEGORIES}
        else:
            vals = {c: hist_int(hist, m, c) for c in RCA_CATEGORIES}
            if all(v is None for v in vals.values()):
                continue
            vals = {c: v or 0 for c, v in vals.items()}
        rca.append({"month": month_label(m) + (" MTD" if m == rep and is_mtd else ""), **vals})

    # 4/5. Baseline from raw tickets in the BASELINE_MONTHS before rep --------
    base_months = [rep - i for i in range(BASELINE_MONTHS, 0, -1)]
    top_kab = {"total_baseline": None, "total_current": 0, "rows": []}
    daily = []
    baseline_note = "BL tidak tersedia (belum ada raw data bulan baseline)"
    sqa_rows, sqa_blank, va_share = [], 0, None

    if df is not None:
        b_start = base_months[0].start_time.normalize()
        b_end = base_months[-1].end_time.normalize()
        lo, hi = max(b_start, cov_start), min(b_end, cov_end)
        base_days = (hi - lo).days + 1 if hi >= lo else 0
        base = df[(df["date"] >= lo) & (df["date"] <= hi)] if base_days else df.iloc[0:0]
        scale = days_elapsed  # BL per kabupaten is pro-rated to the same number of days
        if base_days:
            baseline_note = (f"BL = rata-rata harian {lo:%d %b}–{hi:%d %b %Y} ({base_days} hari)"
                             f" × {scale} hari" + (" (pro-rata MTD)" if is_mtd else ""))
            if base_days < sum(m.days_in_month for m in base_months):
                print(f"note: baseline covers only {base_days} days ({lo:%d %b}..{hi:%d %b}); "
                      f"add older weekly exports to complete it")

        cur_k = cur[cur["kabupaten"] != ""].groupby("kabupaten").size().sort_values(ascending=False)
        base_k = base.groupby("kabupaten").size()
        bl = (lambda n: round(n / base_days * scale, 1)) if base_days else (lambda n: None)
        top_kab = {
            "total_baseline": bl(len(base)),
            "total_current": int(len(cur)),
            "unknown_current": int((cur["kabupaten"] == "").sum()),
            "rows": [{"kabupaten": k, "baseline": bl(int(base_k.get(k, 0))), "current": int(v)}
                     for k, v in cur_k.head(TOP_N_KABUPATEN).items()],
        }

        has_va = bool(COLUMN_MAP.get("is_va"))
        cur_all = cur.groupby("day").size()
        cur_nva = cur[~cur["is_va"]].groupby("day").size()
        for d in range(1, 32):
            vals = []
            for bm in base_months:
                if d > bm.days_in_month:
                    continue
                day_ts = pd.Timestamp(bm.year, bm.month, d)
                if cov_start <= day_ts <= cov_end:
                    vals.append(int((base["date"] == day_ts).sum()))
            in_cur = d <= days_elapsed
            daily.append({
                "day": d,
                "baseline": round(sum(vals) / len(vals), 1) if vals else None,
                "current_all": int(cur_all.get(d, 0)) if in_cur else None,
                "current_non_va": (int(cur_nva.get(d, 0)) if in_cur else None) if has_va else None,
            })

        sqa = cur[cur["dept"].str.upper() == SQA_DEPT.upper()]
        sqa_blank = int((sqa["sqa_rca"] == "").sum())
        sqa_rows = [{"rca": k, "total": int(v)} for k, v in sqa.loc[sqa["sqa_rca"] != "", "sqa_rca"].value_counts().items()]
        va_share = round(float(cur["is_va"].mean()), 4) if has_va and len(cur) else None

    rep_label = rep.strftime("%B %Y")
    week_ref = None if cov_end is None else min(cov_end, rep.end_time.normalize())
    week = f"W{week_ref.isocalendar().week}" if week_ref is not None else None
    if is_mtd:
        rep_label += f" (MTD s/d {cov_end:%d %b})"

    return {
        "meta": {
            "region": "R09 Sulawesi",
            "report_month": month_label(rep) + (" MTD" if is_mtd else ""),
            "report_label": " · ".join(x for x in [week, rep_label] if x),
            "baseline_label": "BL",
            "baseline_months": [month_label(m) for m in base_months],
            "baseline_note": baseline_note,
            "is_mtd": is_mtd,
            "days_elapsed": days_elapsed,
            "days_in_month": days_in_rep,
            "has_va": bool(COLUMN_MAP.get("is_va")),
            "va_share": va_share,
            "sqa_without_rca": sqa_blank,
            "data_range": None if cov_start is None else f"{cov_start:%d %b %Y} – {cov_end:%d %b %Y}",
            "generated_at": date.today().isoformat(),
            "source": "data/raw/weekly + history_monthly.csv (build_ccm_data.py)",
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
    ap.add_argument("--raw-dir", type=Path, default=RAW_DIR, help="folder with the raw files")
    ap.add_argument("--out", type=Path, default=OUT_FILE)
    args = ap.parse_args()
    RAW_DIR = args.raw_dir

    data = build(args.report_month)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {args.out}")
    m = data["okr_trend"][-1] if data["okr_trend"] else None
    if m:
        t = m.get("projected_ticket", m["ticket"])
        print(f"{data['meta']['report_label']}: {m['ticket']} tickets"
              + (f" (proyeksi {t})" if m.get("mtd") else "")
              + f", ratio {t / m['subscriber']:.4%} vs target {m['target_ratio']:.4%}")


if __name__ == "__main__":
    main()
