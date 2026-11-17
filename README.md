# Dashboard Monitoring CCM R09 Sulawesi

Dashboard tiket komplain CCM Regional 09 Sulawesi:

- `/`: **CCM Monitoring | Monthly Trend** (OKR ratio, repetitive SITEID, RCA, Top 10 kabupaten, daily, peta lokasi komplain)
- `/increment`: **Increment per Kabupaten** (ranking kenaikan, drill-down kecamatan, tren harian, top site)
- `/signal`: dashboard 4G/5G lama

## Sekali saja: instalasi

Butuh **Node.js 18.18+** (https://nodejs.org, pilih LTS), **Python 3.9+**, dan **Git**.

```bash
git clone https://github.com/utp08/nextjs-geist-font-starter.git
cd nextjs-geist-font-starter
npm install
pip install pandas openpyxl
```

## Menjalankan dashboard

```bash
npm run dev
```

Buka **http://localhost:8000** di browser. Hentikan dengan `Ctrl + C`.

Rekan satu jaringan kantor bisa membuka `http://<IP-laptop-Anda>:8000` selama `npm run dev` jalan
(cek IP dengan `ipconfig` di Windows; mungkin perlu izin firewall).

## Update data mingguan

1. Simpan export raw tiket ke `data/raw/weekly/` (file lama jangan dihapus).
2. Jalankan:

   ```bash
   python scripts/build_ccm_data.py
   ```

3. Di dashboard klik **Muat ulang data** (tidak perlu restart `npm run dev`).

Detail format data, mapping kolom, dan definisi: lihat [`data/README.md`](data/README.md).

## Mode produksi (lebih cepat, untuk dipakai terus-menerus)

```bash
npm run build
npm run start
```

Setelah `build`, update data cukup jalankan script Python lalu klik **Muat ulang data**.
