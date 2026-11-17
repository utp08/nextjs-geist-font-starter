# Data CCM Monitoring R09 Sulawesi

Dashboard (`/`) membaca `public/data/ccm_dashboard.json`.
File itu dibuat oleh `scripts/build_ccm_data.py` dari raw data di folder ini.

## Update mingguan

1. Simpan export raw tiket mingguan (mis. `R09_Raw_T27_T30__Ticket30_27092026-03102026.xlsx`)
   ke **`data/raw/weekly/`**. File minggu-minggu sebelumnya **jangan dihapus**: script
   menggabungkan semua file dan memakai versi tiket terbaru (dedup per `Order ID`).
2. Awal bulan: tambah baris bulan baru di `data/raw/subscribers.csv`.
   Selama belum diisi, dashboard memakai subscriber bulan sebelumnya (ditandai di KPI).
3. Update teks highlight di `data/raw/highlights.txt`.
4. Jalankan, lalu klik **Muat ulang data** di dashboard:

   ```bash
   pip install pandas openpyxl
   python scripts/build_ccm_data.py
   ```

   `--report-month 2026-09` untuk melihat bulan tertentu (default: bulan terakhir di raw data).

> Folder `data/raw/weekly/` dan semua `.xlsx` di `data/raw/` di-ignore git, karena berisi data
> pelanggan (MSISDN, nama). Yang di-commit hanya JSON hasil agregasi.

## Sumber angka per bulan

- Bulan yang **lengkap tercakup** raw data (dari tanggal 1) dihitung dari raw.
- Bulan sebelum raw data mulai diambil dari **`data/raw/history_monthly.csv`**
  (Oct'25–Sep'26 diisi dari deck W40). Kalau ada export lama, taruh saja di `weekly/`
  dan bulan itu otomatis dihitung dari raw.
- **Bulan berjalan (MTD)**: OKR ratio memakai **proyeksi run-rate**
  (tiket MTD ÷ hari berjalan × jumlah hari sebulan).

## Mapping kolom export (bisa diubah di `COLUMN_MAP` pada script)

| Dipakai untuk | Kolom export |
|---|---|
| ID tiket | `Order ID` |
| Tanggal tiket | `Create Time` |
| Kabupaten | `Kabupaten/Kota(Create Ticket)`; kalau kosong, diisi dari SITEID yang sama di tiket lain |
| SITEID (Repetitive) | `site_id1(L1 Assign)` → `Site ID(L2 Assign)` → `site_id2(L1 Assign)` |
| RCA Regional | `Root Caused Category(L2 Assign)`; kosong = *No feedback* |
| RCA tiket SQA | `Root Caused Tier 8(L2 Assign)` untuk `Dept` = `SQA` |
| Status | `Business Status`; tiket `Cancel` tidak dihitung |
| Tiket VA (Veronika) | teks `Case Owner : VA (Veronika)` di `Description Fault Sumptomps(...)` |
| Lokasi pelanggan (peta) | `Latitude :` / `Longitude :` / `Koordinat customer :` di teks deskripsi; kalau tidak ada, `Latitude/Longitude(L2 Assign)`. Lat/long yang tertukar dibetulkan otomatis; di luar Sulawesi/Maluku Utara dibuang |

## Peta lokasi komplain

- Menampilkan tiket `MAP_MONTHS` (default 3) bulan terakhir yang punya koordinat.
- Koordinat **dibulatkan ke 3 desimal (±110 m)** sebelum masuk JSON (`MAP_DECIMALS`), dan
  JSON tidak memuat MSISDN/nama. Jangan menaikkan presisi kalau repo/dashboard dibagikan.
- Tiket call center jarang mencantumkan koordinat, jadi titik di peta didominasi tiket VA.

## Halaman 2: Increment per Kabupaten (`/increment`)

Dibuat dari raw data yang sama (`public/data/ccm_increment.json`), untuk setiap bulan di raw data:

- **Ranking kabupaten** berdasarkan kenaikan vs BL (atau jumlah tiket kalau BL belum ada).
- **2 panel drill-down**: tiket harian per kecamatan, tren harian vs rata-rata BL, peta lokasi
  pelanggan, dan top site + RCA. Panel bisa diganti lewat tombol Kiri/Kanan di ranking atau dropdown.
- **Narasi panel** ditulis di `highlights.txt`:

  ```
  [increment Sep'26]
  - KOTA MAKASSAR | FO cut | CCM tickets in Kota Makassar increased on 12–13 September, ...
  ```

  Kabupaten yang ditulis di sini otomatis jadi panel fokus (maks 2). Tanpa narasi, panel
  memilih 2 kenaikan terbesar dan menampilkan narasi otomatis (puncak harian, kecamatan, RCA, site).
- **Packet loss / delay / jitter (opsional)**: buat `data/raw/kpi_daily.csv` dengan kolom
  `date, kabupaten`, lalu kolom KPI apa saja (contoh: `kpi_daily_template.csv`). Grafiknya muncul
  di panel kabupaten yang ada datanya.

## Definisi (bagian CONFIG di script)

- **OKR Ratio** = tiket ÷ subscriber.
- **BL (baseline)** = rata-rata tiket harian pada `BASELINE_MONTHS` (default 2) bulan sebelum
  bulan laporan, dikali jumlah hari yang dibandingkan (pro-rata untuk MTD). Hanya hari yang
  ada di raw data yang dipakai; keterangan periodenya tampil di bawah judul tabel.
- **Repetitive SITEID** = tiket pada SITEID yang punya ≥ 2 tiket di bulan yang sama
  (`REPETITIVE_MODE = "site"` untuk menghitung jumlah site).

`subscribers.csv`: `month` (YYYY-MM), `subscriber` (angka absolut), `target_ratio` (contoh `5.27e-05` = 0.0053%).
