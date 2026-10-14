# 2anNews

2anNews is a football news CMS with a React/Vite public site and a Node.js/Express REST API. It uses Prisma with PostgreSQL; PHP and Laravel are not used.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios, TanStack Query, Lucide
- Backend: Node.js, Express, TypeScript, Prisma, JWT, Zod, Multer
- Database: PostgreSQL through Prisma

## Local setup

1. Install and start PostgreSQL.
2. Create a database called `2annews`.
3. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`.
4. Set `DATABASE_URL` in `backend/.env`:

   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/2annews?schema=public"
   ```

5. Install packages and generate Prisma Client:

   ```powershell
   npm run install:all
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   npm run prisma:seed
   ```

For an existing MySQL installation, keep its connection as `MYSQL_SOURCE_URL` and set `DATABASE_URL` to PostgreSQL. Run `npx prisma migrate deploy` to create the PostgreSQL schema, then `npm run prisma:migrate:mysql-to-postgres --prefix backend` from the project root to copy all application tables. The copy command refuses to write into non-empty tables and checks each source and destination row count before committing. Do not run the seed command for an existing database; it is for a fresh demo installation.

6. Start both applications from the project root:

   ```powershell
   npm run dev
   ```

   Public app: `http://localhost:5173`  
   API health check: `http://localhost:5000/health`

## Demo accounts

All seeded accounts use password `Password123!`.

- `superadmin@2annews.test`
- `admin@2annews.test`
- `editor@2annews.test`
- `reporter@2annews.test`
- `reader@2annews.test`

Menu **Pusat transfer** menyediakan berita transfer sepekan dengan filter benua. Setelah menyiapkan database demo atau untuk mengisi database yang sudah ada, jalankan `npm run transfers:import-news --prefix backend`. Berita contoh bersumber dari laporan bertanggal 7–14 Oktober 2026; Antarktika menampilkan keterangan bahwa belum ada klub sepak bola terdaftar.

Halaman **Pertandingan** memuat pilihan hasil pertandingan 7–14 Oktober 2026 dengan filter benua dan tautan sumber di setiap kartu. Antarktika tidak memiliki pertandingan klub terdaftar.

Seed berita memuat liputan sepak bola 7–14 Oktober 2026 dari Afrika, Asia, Eropa, Amerika Utara, Amerika Selatan, dan Oseania. Navigasi berita juga menyediakan kategori untuk tujuh benua; Antarktika ditampilkan tanpa artikel karena tidak ada liputan sepak bola terverifikasi untuk periode tersebut. Setiap artikel mencantumkan tautan sumber. Data akun, pemain, transfer, dan pertandingan pelengkap tetap disediakan untuk kebutuhan demonstrasi CMS.

## Included modules

- JWT authentication and role/permission authorization
- Article drafts, revisions, submission, approval, publishing, scheduling, views, likes, bookmarks, comments, and notifications
- Categories, tags, media uploads, users, settings, activity logs, and analytics endpoints
- Clubs, players, leagues, fixtures, automatic standings recalculation, and transfers
- Responsive public news, article, club, player, league, transfer, fixture, standings, bookmark, login, and CMS dashboard routes

## API summary

All API endpoints use `/api` and consistent `{ success, message, data }` responses. Primary resources include `/auth`, `/articles`, `/categories`, `/tags`, `/clubs`, `/players`, `/leagues`, `/matches`, `/standings`, `/transfers`, `/comments`, `/bookmarks`, `/notifications`, `/analytics`, `/settings`, `/users`, and `/media`.

Scheduled articles are checked every minute by the backend process. Trend scoring is deterministic: `views + likes × 3 + approved comments × 4 + a 30-day recency weight`.

## Verification commands

```powershell
npm run build --prefix backend
npm run build --prefix frontend
npm test --prefix backend
npm test --prefix frontend
```

The migration and seed commands require a running local PostgreSQL instance. Existing MySQL data must be copied to PostgreSQL before the application switches to the new `DATABASE_URL`. Uploads are stored in `backend/uploads` and are intentionally excluded from source control.
## Direktori klub dunia

Menu Klub menggunakan 2.822 entri dari [direktori klub OpenFootball](https://github.com/openfootball/clubs), yang dirilis sebagai domain publik (CC0). Daftar mencakup Afrika, Asia, Eropa, Amerika Utara, Amerika Selatan, dan Oseania, dengan filter benua, pencarian, serta halaman. Direktori terbuka ini bukan registri global lengkap: klub amatir dan akademi tidak seluruhnya tercatat, dan status aktif tiap klub belum diverifikasi. Antarktika tidak memiliki klub sepak bola terdaftar. Logo tersedia secara lokal dari repositori football-logos untuk klub yang namanya cocok; klub tanpa crest sumber menampilkan emblem inisial otomatis. Untuk memperbarui basis data lokal, jalankan `npm run clubs:import --prefix backend` setelah migrasi Prisma diterapkan.

## Deployment

Deployment configuration and the Neon backup/import procedure are documented in [DEPLOYMENT.md](./DEPLOYMENT.md). The Render Free filesystem is ephemeral, so media uploaded to `backend/uploads` is not persistent across service restarts; article images stored in PostgreSQL remain persistent.
