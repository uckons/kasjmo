# Deploy Ubuntu tanpa Docker

## Install dependency
```bash
sudo apt update
sudo apt install -y curl git build-essential postgresql postgresql-contrib nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE jmo_finance;
CREATE USER jmo_user WITH ENCRYPTED PASSWORD 'StrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE jmo_finance TO jmo_user;
\q
```

## Backend
```bash
cd /opt
sudo git clone <your-repo-url> jmo-kas-app
cd jmo-kas-app/server
cp .env.example .env
```

Edit `.env`:
- DB_HOST=127.0.0.1
- DB_PORT=5432
- DB_NAME=jmo_finance
- DB_USER=jmo_user
- DB_PASSWORD=StrongPassword123!
- PORT=5800
- BYPASS_CAPTCHA=false
- TURNSTILE_SECRET_KEY=...

Install and run migration:
```bash
npm install
npm run migrate
npm run seed
```

## Frontend
```bash
cd ../client
cp .env.example .env
```

Edit `.env`:
- VITE_API_BASE_URL=/api
- VITE_TURNSTILE_SITE_KEY=...

Build:
```bash
npm install --include=dev
npm run build
```

Jika server punya `NODE_ENV=production`, opsi `--include=dev` wajib agar paket build tool seperti `vite` ikut terpasang.

> Jika setelah deploy muncul error 404 file `/assets/*.js` atau `/assets/*.css`, lakukan deploy ulang folder `client/dist` secara utuh lalu hard refresh browser (Ctrl+F5) untuk menghapus cache asset lama.

## PM2
```bash
sudo npm install -g pm2
cd /opt/jmo-kas-app/server
pm2 start src/index.js --name jmo-finance
pm2 save
pm2 startup
```

## Nginx reverse proxy
Server block example:
```nginx
server {
    listen 80;
    server_name finance.example.com;

    location / {
        proxy_pass http://127.0.0.1:5800;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```
