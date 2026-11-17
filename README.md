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

## Link online yang terproteksi (Vercel)

Dashboard dilindungi login (username + password) untuk **semua halaman dan file data**
(`src/middleware.ts`). Password tidak disimpan di kode, tapi di environment variable server:

| Variable | Isi |
|---|---|
| `DASHBOARD_USER` | username login, mis. `rno-r09` |
| `DASHBOARD_PASSWORD` | password panjang & acak (≥ 16 karakter) |

Tanpa kedua variable ini, versi produksi menolak semua akses (503), jadi data tidak pernah
terbuka tanpa sengaja. `npm run dev` di laptop sendiri tetap jalan tanpa password.

### Sekali saja

1. **Jadikan repo GitHub private**: GitHub → repo → *Settings* → *General* → *Danger Zone* →
   *Change visibility* → **Private**. (Data agregat & peta ikut tersimpan di repo.)
2. Buka https://vercel.com → *Sign up with GitHub* → **Add New… → Project** → pilih repo ini → *Import*.
3. Sebelum *Deploy*, buka **Environment Variables**, isi `DASHBOARD_USER` dan `DASHBOARD_PASSWORD`.
4. Klik **Deploy**. Setelah selesai, buka `https://<nama-project>.vercel.app`; browser akan
   meminta username & password.
5. Vercel men-deploy branch **`main`**. Kode dashboard ada di branch `claude/serene-clarke-abxewx`,
   jadi merge dulu ke `main` (lewat pull request), atau ubah *production branch* di pengaturan
   project Vercel ke branch tersebut.

Bagikan link + password ke tim lewat kanal internal (bukan di grup/umum). Ganti password:
ubah `DASHBOARD_PASSWORD` di Vercel lalu *Redeploy*.

> Paket Vercel **Hobby** (gratis) ditujukan untuk pemakaian pribadi/non-komersial. Untuk
> pemakaian resmi perusahaan pakai Vercel **Pro** atau server internal (lihat di bawah).

### Update data mingguan (online)

```bash
python scripts/build_ccm_data.py --publish
```

Script membuat data lalu otomatis `git commit` + `git push` **hanya file JSON hasil agregasi**
(raw export tidak pernah ikut). Vercel men-deploy ulang otomatis; link ter-update ±1–2 menit.

### Alternatif: server internal kantor

```bash
npm run build
npm run start
```

dengan `DASHBOARD_USER` / `DASHBOARD_PASSWORD` di-set di server, dan **wajib di belakang HTTPS**
(reverse proxy Nginx/IIS dengan sertifikat), karena Basic Auth mengirim password di setiap request.

## Mode produksi (lebih cepat, untuk dipakai terus-menerus)

Di laptop sendiri, set dulu `DASHBOARD_USER` & `DASHBOARD_PASSWORD` (versi produksi selalu minta
login), lalu `npm run build` dan `npm run start`. Setelah `build`, update data cukup jalankan
script Python lalu klik **Muat ulang data**.
