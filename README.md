# Rental PS Arena — Web Booking

Web booking rental PlayStation dengan pantauan status room dan booking via WhatsApp.

## Fitur

- Customer: booking interaktif **3 hari ke depan**, slot jam, lanjut WhatsApp
- Admin: status room, konfirmasi, booking offline, kelola room & setting
- Anti-spam: pending tidak mengunci slot publik, expire 10 menit, limit per WA

## Stack

Next.js, Tailwind, Prisma + **Neon Postgres**, NextAuth, Framer Motion

## Setup lokal (butuh Neon)

1. Salin `.env.example` → `.env`
2. Isi `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) dari Neon
3. Jalankan:

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### Login admin (seed)

- Email: `admin@rentalps.local`
- Password: `admin123`

## Deploy Vercel + Neon

Ikuti panduan lengkap: **[DEPLOY-VERCEL-NEON.md](DEPLOY-VERCEL-NEON.md)**

Dokumen operasional: **[DOKUMEN-SERAH-TERIMA.md](DOKUMEN-SERAH-TERIMA.md)**
