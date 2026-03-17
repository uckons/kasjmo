# Jakarta Max Owners Finance App (Non-Docker)

A UAT-ready full stack web application for **Kas Kecil** and **Kas Besar** management for Jakarta Max Owners.

## Stack
- Frontend: React + Vite + TailwindCSS + Recharts + Axios + React Router
- Backend: Node.js + Express + PostgreSQL + JWT
- Database: PostgreSQL
- Port: **5800**
- Captcha: Cloudflare Turnstile

## Included features
- Login with role-based access: `admin`, `bendahara`, `approver`
- Dashboard with summary cards and charts
- Kas Kecil & Kas Besar transactions
- **3-step approval** requirement for all **Kas Besar / expense** transactions
- Audit log
- Report filters
- Export report to **XLSX** and **PDF**
- File upload for transaction proof (JPG/PNG/PDF)
- Login rate limiting + account lockout after repeated failures
- Password reset flow (request token + confirm reset)
- Notification hooks for email/WhatsApp events
- UAT seed users
- Responsive modern UI
- Static frontend served by backend in production mode

## Default UAT accounts
- `admin@jakartamax.local` / `!!!Admin#*****!!!`
- `bendahara@jakartamax.local` / `!!!Admin#*****!!!`
- `approver1@jakartamax.local` / `!!!Admin#*****!!!`
- `approver2@jakartamax.local` / `!!!Admin#*****!!!`
- `approver3@jakartamax.local` / `!!!Admin#*****!!!`

## Requirements
- Node.js 20+
- PostgreSQL 14+
- npm

## 1) Create database
```sql
CREATE DATABASE jmo_finance;
```

## 2) Configure backend env
```bash
cd server
cp .env.example .env
```

Edit `.env` as needed.

## 3) Install backend
```bash
cd server
npm install
npm run migrate
npm run seed
```

## 4) Install frontend
```bash
cd client
npm install --include=dev
```

## Development mode
Backend:
```bash
cd server
npm run dev
```

Frontend:
```bash
cd client
npm run dev
```

## Production-like UAT mode (single port 5800)
Build frontend:
```bash
cd client
npm install --include=dev
npm run build
```

Jika environment server menggunakan `NODE_ENV=production`, opsi `--include=dev` memastikan `vite` tersedia saat build.

> Jika setelah deploy muncul error 404 file `/assets/*.js` atau `/assets/*.css`, lakukan deploy ulang folder `client/dist` secara utuh (jangan partial copy), restart service backend, lalu hard refresh browser (Ctrl+F5) untuk menghapus cache asset lama.

> Bila muncul error CSP Turnstile, pastikan backend sudah memakai build terbaru lalu restart service (`pm2 restart jmo-finance`) agar header CSP baru aktif.

> Cek endpoint `GET /api/frontend-path` untuk memastikan backend membaca path dist frontend yang benar di server.

> Pastikan Nginx **tidak** memiliki `location /assets` terpisah yang menunjuk path lama. Semua request `/assets/*` harus menuju backend app yang sama.

Start backend:
```bash
cd ../server
npm start
```

Then open:
```txt
http://localhost:5800
```

## Cloudflare Turnstile
For local UAT, backend supports:
- `BYPASS_CAPTCHA=true`

For production:
- set `BYPASS_CAPTCHA=false`
- set `TURNSTILE_SECRET_KEY`
- set frontend `VITE_TURNSTILE_SITE_KEY`
- optional: set `CLIENT_DIST_PATH` (contoh: `/var/www/kasjmo/client/dist`) bila backend tidak menemukan folder build frontend otomatis

## Scripts
### Server
- `npm run dev` - nodemon
- `npm run migrate` - create tables
- `npm run seed` - seed users & sample data
- `npm start` - production server on 5800

### Client
- `npm run dev`
- `npm run build`
- `npm run preview`

## Important note
This project remains a UAT baseline, but now includes core hardening controls for uploads, auth protection, password reset, notifications, backup scripts, secret validation, and CI automation.


## Backup and restore
Use the included scripts (require `pg_dump`/`pg_restore`):

```bash
export DB_HOST=localhost DB_PORT=5432 DB_NAME=jmo_finance DB_USER=postgres DB_PASSWORD=postgres
./scripts/backup.sh
./scripts/restore.sh backups/<file>.dump
```

## Secret management hardening
- Use `server/.env.example` as baseline and store real secrets in a vault (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault).
- The backend now validates required env vars and enforces a strong `JWT_SECRET` in production.

## Automated tests and CI/CD
- Backend unit tests: `cd server && npm test`
- GitHub Actions workflow: `.github/workflows/ci.yml` (runs server tests + client build)
