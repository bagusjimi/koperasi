# 📋 Panduan Instalasi Lengkap - Aplikasi Koperasi Desa

Panduan step-by-step untuk menginstall dan deploy aplikasi manajemen koperasi desa ke Cloudflare.

## 📋 Prerequisites (Persyaratan)

### 1. Software yang Diperlukan
```bash
# Node.js (versi 18 atau lebih baru)
# Download dari: https://nodejs.org/

# Git
# Download dari: https://git-scm.com/

# Text Editor (VS Code recommended)
# Download dari: https://code.visualstudio.com/
```

### 2. Akun yang Diperlukan
- **GitHub Account**: Untuk menyimpan kode
- **Cloudflare Account**: Untuk hosting gratis
  - Daftar di: https://dash.cloudflare.com/sign-up
  - Verifikasi email Anda

## 🚀 Langkah 1: Setup Project

### 1.1 Clone Repository
```bash
# Clone project dari GitHub
git clone https://github.com/bagusjimi/koperasi.git
cd koperasi

# Atau download ZIP dan extract
```

### 1.2 Install Dependencies
```bash
# Pastikan Anda di folder root project
cd koperasi

# Install semua dependencies
npm run install:all

# Atau install satu per satu:
npm install
cd frontend && npm install
cd ../backend && npm install
cd ../database && npm install
cd ..
```

## 🗄️ Langkah 2: Setup Database (Cloudflare D1)

### 2.1 Install Wrangler CLI
```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Login ke Cloudflare
wrangler login
# Browser akan terbuka, login dengan akun Cloudflare Anda
```

### 2.2 Buat Database D1
```bash
# Masuk ke folder database
cd database

# Buat database baru
wrangler d1 create koperasi-db
```

**Output akan seperti ini:**
```
✅ Successfully created DB 'koperasi-db' in region APAC
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "koperasi-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2.3 Update Konfigurasi Database
```bash
# Copy template konfigurasi
cp database/wrangler.toml.example database/wrangler.toml

# Edit file database/wrangler.toml
# Ganti database_id dengan ID yang didapat dari langkah sebelumnya
```

**File `database/wrangler.toml`:**
```toml
name = "koperasi-db"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "koperasi-db"
database_id = "GANTI-DENGAN-DATABASE-ID-ANDA"
```

### 2.4 Jalankan Migrasi Database
```bash
# Jalankan migrasi (buat tabel)
wrangler d1 migrations apply koperasi-db --local

# Untuk production (setelah testing lokal berhasil)
wrangler d1 migrations apply koperasi-db
```

### 2.5 Insert Data Awal
```bash
# Insert data awal (chart of accounts, admin user, dll)
wrangler d1 execute koperasi-db --file=./seeds/initial-data.sql --local

# Untuk production
wrangler d1 execute koperasi-db --file=./seeds/initial-data.sql
```

## ⚙️ Langkah 3: Setup Backend (Cloudflare Workers)

### 3.1 Konfigurasi Backend
```bash
cd ../backend

# Copy template konfigurasi
cp wrangler.toml.example wrangler.toml

# Edit file backend/wrangler.toml
```

**File `backend/wrangler.toml`:**
```toml
name = "koperasi-backend"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
JWT_SECRET = "GANTI-DENGAN-SECRET-YANG-AMAN-MINIMAL-32-KARAKTER"
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "koperasi-db"
database_id = "SAMA-DENGAN-DATABASE-ID-DIATAS"
```

### 3.2 Generate JWT Secret
```bash
# Generate JWT secret yang aman
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy output dan paste ke JWT_SECRET di wrangler.toml
```

### 3.3 Test Backend Lokal
```bash
# Test backend di lokal
npm run dev

# Backend akan berjalan di http://localhost:8787
# Test dengan: curl http://localhost:8787/
```

### 3.4 Deploy Backend ke Production
```bash
# Deploy ke Cloudflare Workers
wrangler deploy

# Catat URL yang diberikan, contoh:
# https://koperasi-backend.your-subdomain.workers.dev
```

## 🎨 Langkah 4: Setup Frontend (Cloudflare Pages)

### 4.1 Konfigurasi Frontend
```bash
cd ../frontend

# Copy template environment variables
cp .env.example .env.local

# Edit file .env.local dengan URL backend Anda
```

**File `frontend/.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://koperasi-backend.your-subdomain.workers.dev
```

### 4.2 Test Frontend Lokal
```bash
# Test frontend di lokal
npm run dev

# Frontend akan berjalan di http://localhost:3000
# Login dengan: admin / admin123
```

### 4.3 Build Frontend
```bash
# Build untuk production
npm run build

# Folder 'out' akan berisi file static
```

### 4.4 Deploy Frontend ke Cloudflare Pages

#### Opsi A: Via Dashboard Cloudflare
1. Login ke https://dash.cloudflare.com/
2. Pilih "Pages" di sidebar
3. Klik "Create a project"
4. Connect ke GitHub repository Anda
5. Set build settings:
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `frontend/out`
   - **Environment variables**: 
     - `NEXT_PUBLIC_API_URL` = URL backend Anda

#### Opsi B: Via Wrangler CLI
```bash
# Install Pages CLI
npm install -g @cloudflare/next-on-pages

# Deploy
npx @cloudflare/next-on-pages --experimental-minify
wrangler pages deploy out --project-name koperasi-frontend
```

## 🔧 Langkah 5: Konfigurasi Final

### 5.1 Update CORS di Backend
Edit `backend/src/index.js` dan update origin CORS:
```javascript
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://koperasi-frontend.pages.dev'],
  // Ganti dengan URL Pages Anda
}));
```

### 5.2 Redeploy Backend
```bash
cd backend
wrangler deploy
```

## ✅ Langkah 6: Testing & Verifikasi

### 6.1 Test Login
1. Buka aplikasi di browser
2. Login dengan:
   - **Username**: `admin`
   - **Password**: `admin123`

### 6.2 Test Fitur Utama
1. **Dashboard**: Lihat statistik koperasi
2. **Anggota**: Tambah anggota baru
3. **Simpanan**: Proses setoran/penarikan
4. **Pinjaman**: Buat aplikasi pinjaman
5. **Laporan**: Generate laporan keuangan

## 🛠️ Troubleshooting

### Error: "Database not found"
```bash
# Pastikan database ID benar di wrangler.toml
# Jalankan ulang migrasi
cd database
wrangler d1 migrations apply koperasi-db
```

### Error: "JWT Secret not found"
```bash
# Pastikan JWT_SECRET sudah diset di backend/wrangler.toml
# Redeploy backend
cd backend
wrangler deploy
```

### Error: "CORS Error"
```bash
# Update origin di backend/src/index.js
# Pastikan URL frontend benar
# Redeploy backend
```

### Frontend tidak bisa connect ke Backend
```bash
# Pastikan NEXT_PUBLIC_API_URL benar di .env.local
# Rebuild dan redeploy frontend
npm run build
```

## 📱 Langkah 7: Customization (Opsional)

### 7.1 Ganti Logo dan Branding
- Edit `frontend/app/globals.css` untuk warna
- Ganti logo di `frontend/components/layout/Sidebar.tsx`

### 7.2 Tambah Domain Custom
1. Di Cloudflare Pages, pilih "Custom domains"
2. Tambahkan domain Anda
3. Update DNS records sesuai instruksi

### 7.3 Setup SSL Certificate
- Cloudflare otomatis provide SSL certificate
- Pastikan "Always Use HTTPS" enabled

## 🔒 Langkah 8: Security Checklist

- ✅ JWT_SECRET menggunakan string random yang aman
- ✅ Database ID tidak di-commit ke Git
- ✅ CORS origin hanya domain yang diizinkan
- ✅ Environment variables tidak di-commit
- ✅ Default password admin sudah diganti

## 📊 Langkah 9: Monitoring & Maintenance

### 9.1 Monitor Usage
- Cek Cloudflare Dashboard untuk usage statistics
- Monitor D1 database size dan requests

### 9.2 Backup Data
```bash
# Export data dari D1
wrangler d1 execute koperasi-db --command="SELECT * FROM members" --output=json > backup-members.json
```

### 9.3 Update Aplikasi
```bash
# Pull update terbaru
git pull origin main

# Redeploy
cd backend && wrangler deploy
cd ../frontend && npm run build && wrangler pages deploy out
```

## 🎯 Selesai!

Aplikasi Koperasi Desa Anda sekarang sudah berjalan di:
- **Frontend**: https://koperasi-frontend.pages.dev
- **Backend**: https://koperasi-backend.your-subdomain.workers.dev

**Login Default:**
- Username: `admin`
- Password: `admin123`

**Biaya Operasional:** GRATIS (dalam batas usage Cloudflare free tier)

## 📞 Support

Jika mengalami masalah:
1. Cek troubleshooting guide di atas
2. Lihat logs di Cloudflare Dashboard
3. Buat issue di GitHub repository

Selamat menggunakan aplikasi Koperasi Desa! 🎉
