# Deploy Vercel + Neon (Postgres)

Panduan menyiapkan project ini supaya bisa diakses publik.

## Prasyarat

- Akun [GitHub](https://github.com)
- Akun [Neon](https://neon.tech) (database gratis)
- Akun [Vercel](https://vercel.com) (hosting Next.js gratis)

Project sudah dikonfigurasi untuk:
- PostgreSQL (bukan SQLite)
- Adapter `@prisma/adapter-neon`
- Build: `prisma generate && prisma migrate deploy && next build`

---

## 1. Buat database di Neon

1. Login Neon → **Create project**
2. Pilih region (lebih baik Asia kalau ada)
3. Klik **Connect**
4. Salin **dua** connection string:

| Nama | Ciri | Fungsi |
|------|------|--------|
| **Pooled** | host ada `-pooler` | `DATABASE_URL` (app + Vercel) |
| **Direct** | tanpa `-pooler` | `DIRECT_URL` (migrate) |

Keduanya biasanya diakhiri `?sslmode=require`.

---

## 2. Isi `.env` lokal (opsional, untuk tes di PC)

Salin dari contoh:

```powershell
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
DIRECT_URL="postgresql://.../neondb?sslmode=require"
NEXTAUTH_SECRET="isi-string-acak-panjang"
NEXTAUTH_URL="http://localhost:3000"
```

Lalu:

```powershell
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

---

## 3. Push ke GitHub

```powershell
git init
git add .
git commit -m "Ready for Vercel + Neon"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Jangan commit `.env`.

---

## 4. Deploy di Vercel

1. Login Vercel → **Add New Project** → pilih repo
2. Framework: Next.js
3. **Environment Variables** (Production + Preview):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon **pooled** |
| `DIRECT_URL` | Neon **direct** |
| `NEXTAUTH_SECRET` | string acak |
| `NEXTAUTH_URL` | sementara `https://nama-project.vercel.app` (update setelah tahu URL pasti) |

4. Deploy

Vercel akan menjalankan migrate otomatis lewat script `build`.

---

## 5. Seed data awal di Neon

Setelah deploy sukses, dari PC (dengan `.env` mengarah ke Neon yang sama):

```powershell
npx prisma db seed
```

Atau di Vercel → Project → Settings → bisa pakai one-off, tapi paling mudah seed dari lokal.

Login admin default:
- Email: `admin@rentalps.local`
- Password: `admin05`

**Ganti password & nomor WA** di Admin → Setting setelah online.

---

## 6. Perbaiki `NEXTAUTH_URL`

1. Salin URL production Vercel, contoh: `https://rental-ps-xxx.vercel.app`
2. Vercel → Settings → Environment Variables → update `NEXTAUTH_URL`
3. **Redeploy**

Tanpa ini, login admin sering gagal redirect.

---

## 7. Checklist setelah online

- [ ] Halaman customer terbuka
- [ ] Booking → WhatsApp muncul
- [ ] Login admin berhasil
- [ ] Data room 5 buah ada
- [ ] Booking tersimpan setelah refresh
- [ ] Password admin diganti
- [ ] Nomor WA toko di Setting sudah benar

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build gagal `DATABASE_URL` | Pastikan env sudah diisi di Vercel (Production) |
| Migrate gagal di build | Pastikan `DIRECT_URL` (non-pooler) benar |
| Login admin loop | `NEXTAUTH_URL` harus tepat sama dengan URL situs |
| DB lambat pertama kali | Neon free kadang “sleep” — request pertama bisa 1–3 detik |
| Seed tidak jalan di Vercel | Jalankan `npx prisma db seed` dari PC dengan `DATABASE_URL` Neon |

---

## Catatan SQLite lokal lama

File `prisma/dev.db` (SQLite) tidak lagi dipakai. Development & production memakai Neon Postgres.
