# Aplikasi Manajemen Koperasi Desa

Aplikasi manajemen koperasi desa yang lengkap dengan fitur manajemen anggota, simpanan, transaksi, dan laporan keuangan yang berjalan di Cloudflare.

## Fitur Utama

- 👥 **Manajemen Anggota**: Registrasi, profil, dan status keanggotaan
- 💰 **Manajemen Simpanan**: Simpanan pokok, wajib, dan sukarela
- 🏦 **Transaksi Pinjaman**: Pengajuan, persetujuan, dan cicilan
- 📊 **Laporan Keuangan**: SHU, Neraca, Laba Rugi
- 📈 **Dashboard**: Analitik dan monitoring real-time
- 🔐 **Keamanan**: Sistem autentikasi dan otorisasi

## Teknologi

- **Frontend**: Next.js + React + Tailwind CSS
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages
- **Akuntansi**: Double-entry bookkeeping system

## Struktur Project

```
├── frontend/          # Next.js application
├── backend/           # Cloudflare Workers
├── database/          # D1 database schemas
├── docs/             # Documentation
└── deploy/           # Deployment configurations
```

## Quick Start

1. Clone repository
2. Install dependencies: `npm install`
3. Setup database: `npm run db:setup`
4. Run development: `npm run dev`
5. Deploy: `npm run deploy`

## Akuntansi

Aplikasi ini menggunakan sistem akuntansi double-entry sesuai standar koperasi Indonesia dengan:
- Chart of Accounts standar koperasi
- Otomatis generate laporan keuangan
- Perhitungan SHU berdasarkan partisipasi anggota
- Compliance dengan peraturan koperasi

## License

MIT License
