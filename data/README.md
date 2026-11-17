# Data CCM Monitoring R09 Sulawesi

Dashboard (`/`) membaca `public/data/ccm_dashboard.json`.
File itu dibuat oleh `scripts/build_ccm_data.py` dari raw data di folder ini.

## Cara update (mingguan / bulanan)

1. Taruh export tiket CCM di `data/raw/tickets.xlsx` (atau `tickets.csv`). Satu baris = satu tiket.
2. Tambah baris bulan baru di `data/raw/subscribers.csv`.
3. (Opsional) Edit teks highlight di `data/raw/highlights.txt`.
4. Jalankan:

   ```bash
   pip install pandas openpyxl
   python scripts/build_ccm_data.py --week W44
   ```

5. Buka dashboard dan klik **Muat ulang data**.

`--report-month 2026-10` untuk memilih bulan laporan; default = bulan terakhir di data tiket.

## Kolom yang dibutuhkan

| Kolom | Wajib | Isi |
|---|---|---|
| `ticket_id` | ya | ID tiket (duplikat dibuang) |
| `create_date` | ya | Tanggal create tiket (`2026-09-12`, `12/09/2026 08:15`, dll.) |
| `kabupaten` | ya | Nama kabupaten/kota |
| `site_id` | | SITEID (untuk Repetitive SITEID) |
| `rca` | | Availability / Capacity / Coverage / Quality / Others; kosong = *No feedback* |
| `sqa_rca` | | RCA detail untuk tiket yang di-assign ke SQA (Power Problem, Bad coverage, …) |
| `is_va` | | 1/0, Y/N, TRUE/FALSE: tiket dari Virtual Assistant (Veronika) |

Nama header di export berbeda? Ubah `COLUMN_MAP` di bagian atas `scripts/build_ccm_data.py`.
Contoh format: `data/raw/tickets_template.csv`.

## Definisi (bisa diubah di bagian CONFIG script)

- **OKR Ratio** = tiket ÷ subscriber (tiket VA ikut dihitung, `INCLUDE_VA_IN_OKR`).
- **BL (baseline)** = rata-rata `BASELINE_MONTHS` (default 2) bulan sebelum bulan laporan.
  Dipakai di tabel Top 10 Kabupaten dan Ticket Daily Comparison.
- **Repetitive SITEID** = tiket pada SITEID yang punya ≥ 2 tiket di bulan yang sama
  (`REPETITIVE_MODE = "site"` untuk menghitung jumlah site, bukan tiket).

`subscribers.csv`: `month` (YYYY-MM), `subscriber` (angka absolut), `target_ratio` (contoh `5.27e-05` = 0.0053%).

> `tickets.*` di folder ini di-ignore git (data pelanggan), jadi tidak ikut ter-commit.
> Yang di-commit hanya JSON hasil agregasi.
