# Jakarta Max Owners Finance App (Non-Docker)

A UAT-ready full stack web application for **Kas Kecil** and **Kas Besar** management for Jakarta Max Owners.

## Stack
- Frontend: React + Vite + TailwindCSS + Recharts + Axios + React Router
- Backend: Node.js + Express + PostgreSQL + JWT
- Database: PostgreSQL
- Port: **5700**
- Captcha: Cloudflare Turnstile

## Included features
- Login with role-based access: `admin`, `bendahara`, `approver`
- Dashboard with summary cards and charts
- Kas Kecil & Kas Besar transactions
- **3-step approval** requirement for all **Kas Besar / expense** transactions
- Audit log
- Report filters
- Export report to **XLSX** and **PDF**
- UAT seed users
- Responsive modern UI
- Static frontend served by backend in production mode

## Default UAT accounts
- `admin@jakartamax.local` / `Admin#12345`
- `bendahara@jakartamax.local` / `Bendahara#12345`
- `approver1@jakartamax.local` / `Approver#12345`
- `approver2@jakartamax.local` / `Approver#12345`
- `approver3@jakartamax.local` / `Approver#12345`

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
npm install
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

## Production-like UAT mode (single port 5700)
Build frontend:
```bash
cd client
npm run build
```

Start backend:
```bash
cd ../server
npm start
```

Then open:
```txt
http://localhost:5700
```

## Cloudflare Turnstile
For local UAT, backend supports:
- `BYPASS_CAPTCHA=true`

For production:
- set `BYPASS_CAPTCHA=false`
- set `TURNSTILE_SECRET_KEY`
- set frontend `VITE_TURNSTILE_SITE_KEY`

## Scripts
### Server
- `npm run dev` - nodemon
- `npm run migrate` - create tables
- `npm run seed` - seed users & sample data
- `npm start` - production server on 5700

### Client
- `npm run dev`
- `npm run build`
- `npm run preview`

## Important note
This project is a strong **UAT baseline**. It is not yet a final hardened enterprise production release. Before production go-live, add:
- file upload for transaction proof
- rate limiting and account lockout
- password reset flow
- email / WhatsApp notifications
- backup/restore strategy
- stronger secret management
- automated tests and CI/CD
