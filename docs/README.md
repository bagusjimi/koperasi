# Dokumentasi Aplikasi Koperasi Desa

Aplikasi manajemen koperasi desa yang lengkap dengan fitur simpan pinjam, laporan keuangan, dan perhitungan SHU.

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Fitur Utama](#fitur-utama)
3. [Arsitektur Sistem](#arsitektur-sistem)
4. [Setup & Installation](#setup--installation)
5. [Panduan Penggunaan](#panduan-penggunaan)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Deployment](#deployment)

## Overview

Aplikasi Koperasi Desa adalah sistem manajemen koperasi modern yang dirancang khusus untuk koperasi simpan pinjam di tingkat desa. Aplikasi ini menggunakan teknologi web modern dan dapat berjalan di Cloudflare dengan layanan gratisnya.

### Teknologi Stack

**Backend:**
- Cloudflare Workers (Serverless)
- Hono.js (Web Framework)
- Cloudflare D1 (SQLite Database)
- JWT Authentication
- Zod Validation

**Frontend:**
- Next.js 14 (React Framework)
- Tailwind CSS (Styling)
- React Query (State Management)
- Recharts (Data Visualization)
- TypeScript

**Database:**
- Cloudflare D1 (SQLite)
- Double-entry bookkeeping
- ACID compliance

## Fitur Utama

### 👥 Manajemen Anggota
- Registrasi anggota baru
- Profil anggota lengkap
- Status keanggotaan
- Pencarian dan filter

### 💰 Sistem Simpanan
- **Simpanan Pokok**: Tidak dapat ditarik
- **Simpanan Wajib**: Dapat ditarik dengan syarat
- **Simpanan Sukarela**: Dapat ditarik kapan saja
- Bunga otomatis
- Riwayat transaksi lengkap

### 🏦 Sistem Pinjaman
- **Pinjaman Konsumtif**: Untuk kebutuhan konsumsi
- **Pinjaman Produktif**: Untuk kegiatan usaha
- **Pinjaman Darurat**: Untuk kebutuhan mendesak
- Workflow persetujuan
- Jadwal pembayaran otomatis
- Tracking outstanding balance

### 📊 Laporan Keuangan
- **Neraca**: Balance sheet sesuai standar akuntansi
- **Laba Rugi**: Income statement
- **Buku Besar**: General ledger
- **SHU**: Perhitungan dan distribusi otomatis
- Export ke PDF/Excel

### 📈 Dashboard & Analytics
- Real-time statistics
- Growth trends
- Cash flow monitoring
- Member performance
- Interactive charts

## Arsitektur Sistem

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Next.js)     │◄──►│ (CF Workers)    │◄──►│   (CF D1)       │
│                 │    │                 │    │                 │
│ - React UI      │    │ - REST API      │    │ - SQLite        │
│ - Tailwind CSS  │    │ - JWT Auth      │    │ - Double Entry  │
│ - React Query   │    │ - Validation    │    │ - ACID          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │                 │
                    │ - Pages (FE)    │
                    │ - Workers (BE)  │
                    │ - D1 (DB)       │
                    │ - KV (Cache)    │
                    └─────────────────┘
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm atau yarn
- Cloudflare account (untuk deployment)

### Local Development

1. **Clone repository:**
```bash
git clone <repository-url>
cd koperasi-desa
```

2. **Install dependencies:**
```bash
npm run install:all
```

3. **Setup database:**
```bash
cd database
npm run setup
npm run seed
```

4. **Start development servers:**
```bash
npm run dev
```

5. **Access aplikasi:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8787

### Default Login
- Username: `admin`
- Password: `admin123`

## Panduan Penggunaan

### Untuk Administrator

#### 1. Dashboard
- Lihat ringkasan aktivitas koperasi
- Monitor cash flow dan pertumbuhan
- Analisis performa anggota

#### 2. Manajemen Anggota
- Tambah anggota baru
- Update informasi anggota
- Kelola status keanggotaan

#### 3. Proses Simpanan
- Terima setoran dari anggota
- Proses penarikan simpanan
- Generate laporan simpanan

#### 4. Manajemen Pinjaman
- Review aplikasi pinjaman
- Setujui/tolak aplikasi
- Cairkan pinjaman yang disetujui
- Proses pembayaran cicilan

#### 5. Laporan Keuangan
- Generate neraca bulanan/tahunan
- Buat laporan laba rugi
- Hitung dan distribusi SHU
- Export laporan

### Untuk Anggota

#### 1. Dashboard Pribadi
- Lihat saldo simpanan
- Monitor pinjaman aktif
- Riwayat SHU

#### 2. Transaksi
- Lihat riwayat setoran/penarikan
- Track pembayaran pinjaman
- Download bukti transaksi

#### 3. Pengajuan Pinjaman
- Ajukan pinjaman baru
- Upload dokumen pendukung
- Track status persetujuan

## API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
```

### Members
```
GET    /api/members
GET    /api/members/:id
PUT    /api/members/:id
GET    /api/members/stats/overview
```

### Savings
```
GET    /api/savings/accounts/:memberId
GET    /api/savings/accounts/:accountId/transactions
POST   /api/savings/transactions
GET    /api/savings/summary
```

### Loans
```
POST   /api/loans/apply
GET    /api/loans/applications
PUT    /api/loans/applications/:id/approve
POST   /api/loans/:id/disburse
POST   /api/loans/payments
GET    /api/loans/member/:memberId
```

### Reports
```
GET    /api/reports/balance-sheet
GET    /api/reports/income-statement
POST   /api/reports/calculate-shu
GET    /api/reports/shu/:periodId
GET    /api/reports/general-ledger
```

## Database Schema

### Core Tables
- `users`: Authentication data
- `members`: Member information
- `chart_of_accounts`: Accounting structure
- `savings_accounts`: Member savings
- `loan_accounts`: Member loans

### Transaction Tables
- `general_ledger`: Double-entry bookkeeping
- `savings_transactions`: Savings deposits/withdrawals
- `loan_transactions`: Loan disbursements/payments
- `business_transactions`: Operational transactions

### Reporting Tables
- `financial_periods`: Accounting periods
- `shu_calculations`: SHU distribution data

## Deployment

### Cloudflare Deployment

1. **Setup Cloudflare:**
```bash
npm install -g wrangler
wrangler login
```

2. **Deploy Database:**
```bash
cd database
wrangler d1 create koperasi-db
npm run migrate:prod
npm run seed:prod
```

3. **Deploy Backend:**
```bash
cd backend
wrangler deploy
```

4. **Deploy Frontend:**
```bash
cd frontend
npm run deploy
```

### Environment Variables

**Backend (.env):**
```
JWT_SECRET=your-jwt-secret
DATABASE_ID=your-d1-database-id
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev
```

## Keamanan

- JWT token authentication
- Password hashing dengan bcrypt
- Input validation dengan Zod
- SQL injection protection
- CORS configuration
- Rate limiting (optional)

## Monitoring & Maintenance

- Cloudflare Analytics
- Error tracking
- Performance monitoring
- Database backup
- Regular security updates

## Support & Kontribusi

Untuk pertanyaan, bug report, atau kontribusi:
1. Buat issue di repository
2. Fork dan buat pull request
3. Ikuti coding standards
4. Tambahkan tests untuk fitur baru

## License

MIT License - Lihat file LICENSE untuk detail lengkap.
