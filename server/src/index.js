import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { authRequired } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { pool, query } from './config/db.js';
import { hashPassword } from './utils/hash.js';
const app = express(); const port = Number(process.env.PORT || 5800); const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://challenges.cloudflare.com'], scriptSrcElem: ["'self'", 'https://challenges.cloudflare.com'], connectSrc: ["'self'", 'https://challenges.cloudflare.com'], frameSrc: ["'self'", 'https://challenges.cloudflare.com'], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], } } })); app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' })); app.use(express.json()); app.use(morgan('dev'));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes); app.use('/api/dashboard', authRequired, dashboardRoutes); app.use('/api/transactions', authRequired, transactionRoutes); app.use('/api/reports', authRequired, reportRoutes); app.use('/api/audit-logs', authRequired, auditRoutes); app.use('/api/users', authRequired, userRoutes);
const distCandidates = [
process.env.CLIENT_DIST_PATH,
path.resolve(__dirname, '../../client/dist'),
path.resolve(process.cwd(), '../client/dist'),
path.resolve(process.cwd(), 'client/dist'),
'/var/www/kasjmo/client/dist',
'/opt/jmo-kas-app/client/dist'
].filter(Boolean);
function parseAssetRefs(indexHtml = '') { return [...indexHtml.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map((m) => m[1]); }
const distChecks = distCandidates.map((candidate) => { const indexPath = path.join(candidate, 'index.html'); const assetDir = path.join(candidate, 'assets'); const hasIndex = fs.existsSync(indexPath); const hasAssetsDir = fs.existsSync(assetDir); let referencedAssets = []; let allRefsExist = false; if (hasIndex && hasAssetsDir) { const html = fs.readFileSync(indexPath, 'utf8'); referencedAssets = parseAssetRefs(html); allRefsExist = referencedAssets.length > 0 && referencedAssets.every((f) => fs.existsSync(path.join(assetDir, f))); } return { candidate, hasIndex, hasAssetsDir, referencedAssets, allRefsExist }; });
const resolved = distChecks.find((x) => x.allRefsExist) || distChecks.find((x) => x.hasIndex && x.hasAssetsDir);
const clientDistPath = resolved?.candidate;
if (clientDistPath) {
const assetDir = path.join(clientDistPath, 'assets');
console.log(`Serving frontend from: ${clientDistPath}`);
app.get('/assets/:file', (req, res, next) => {
const requested = path.join(assetDir, req.params.file);
if (fs.existsSync(requested)) return res.sendFile(requested);
const files = fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : [];
if (req.params.file.endsWith('.js')) { const fallbackJs = files.find((f) => f === 'app.js') || files.find((f) => /^index-.*\.js$/.test(f)); if (fallbackJs) return res.sendFile(path.join(assetDir, fallbackJs)); }
if (req.params.file.endsWith('.css')) { const fallbackCss = files.find((f) => f === 'app.css') || files.find((f) => /^index-.*\.css$/.test(f)); if (fallbackCss) return res.sendFile(path.join(assetDir, fallbackCss)); }
return res.status(404).type('text/plain').send('Asset not found');
});
app.use(express.static(clientDistPath, { setHeaders: (res, filePath) => { if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); else if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));
app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) return next(); res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); res.sendFile(path.join(clientDistPath, 'index.html')); });
} else {
console.warn(`Frontend dist folder not found. Tried: ${distCandidates.join(', ')}`);
app.get('/assets/:file', (req, res) => res.status(404).type('text/plain').send('Frontend assets unavailable'));
}
app.get('/api/frontend-path', (req, res) => res.json({ clientDistPath: clientDistPath || null, distCandidates, distChecks }));
app.use(errorHandler);
async function runMigrations() {
await query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name VARCHAR(150) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'bendahara', 'approver')), password_hash TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT NOW());`);
await query(`CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, cash_type VARCHAR(30) NOT NULL CHECK (cash_type IN ('kas_kecil', 'kas_besar')), flow VARCHAR(20) NOT NULL CHECK (flow IN ('income', 'expense')), amount NUMERIC(14,2) NOT NULL, category VARCHAR(100) NOT NULL, description TEXT, transaction_date DATE NOT NULL, status VARCHAR(30) NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')), created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMP NOT NULL DEFAULT NOW());`);
await query(`CREATE TABLE IF NOT EXISTS approvals (id SERIAL PRIMARY KEY, transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE, approver_id INTEGER NOT NULL REFERENCES users(id), decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')), comment TEXT, approved_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(transaction_id, approver_id));`);
await query(`CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), action VARCHAR(100) NOT NULL, entity_type VARCHAR(50) NOT NULL, entity_id INTEGER, detail JSONB, ip_address VARCHAR(100), created_at TIMESTAMP NOT NULL DEFAULT NOW());`);
console.log('Migrations completed');
}
async function seed() {
const users = [['System Admin', 'admin@jakartamax.local', 'admin', 'Admin#12345'], ['Bendahara JMO', 'bendahara@jakartamax.local', 'bendahara', 'Bendahara#12345'], ['Approver 1', 'approver1@jakartamax.local', 'approver', 'Approver#12345'], ['Approver 2', 'approver2@jakartamax.local', 'approver', 'Approver#12345'], ['Approver 3', 'approver3@jakartamax.local', 'approver', 'Approver#12345']];
for (const [fullName, email, role, password] of users) { const exists = await query('SELECT id FROM users WHERE email = $1', [email]); if (exists.rows.length === 0) { const passwordHash = await hashPassword(password); await query(`INSERT INTO users (full_name, email, role, password_hash) VALUES ($1,$2,$3,$4)`, [fullName, email, role, passwordHash]); } }
const admin = await query(`SELECT id FROM users WHERE email='admin@jakartamax.local'`); const bendahara = await query(`SELECT id FROM users WHERE email='bendahara@jakartamax.local'`); const txCount = await query('SELECT COUNT(*)::int AS total FROM transactions');
if (txCount.rows[0].total === 0) { const sample = [['kas_kecil', 'income', 2500000, 'Donasi', 'Iuran komunitas', '2026-03-01', 'approved', bendahara.rows[0].id], ['kas_kecil', 'expense', 450000, 'Konsumsi', 'Kopi dan snack rapat', '2026-03-02', 'approved', bendahara.rows[0].id], ['kas_besar', 'income', 12000000, 'Sponsorship', 'Sponsor event touring', '2026-03-03', 'approved', admin.rows[0].id], ['kas_besar', 'expense', 3500000, 'Event', 'DP venue gathering', '2026-03-04', 'pending_approval', bendahara.rows[0].id], ['kas_besar', 'expense', 1250000, 'Merchandise', 'Cetak banner komunitas', '2026-03-05', 'approved', admin.rows[0].id]]; for (const item of sample) { await query(`INSERT INTO transactions (cash_type, flow, amount, category, description, transaction_date, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, item); } }
console.log('Seed completed');
}
async function main() { const mode = process.argv[2]; try { if (mode === '--migrate') { await runMigrations(); await pool.end(); process.exit(0); } if (mode === '--seed') { await runMigrations(); await seed(); await pool.end(); process.exit(0); } await pool.query('SELECT 1'); app.listen(port, () => { console.log(`Server running on http://localhost:${port}`); }); } catch (error) { console.error(error); process.exit(1); } }
main();
