# Koperasi Desa - Frontend

Frontend aplikasi manajemen koperasi desa menggunakan Next.js, React, dan Tailwind CSS.

## Fitur

### Untuk Admin/Manager
- **Dashboard**: Ringkasan aktivitas koperasi dengan grafik dan statistik
- **Manajemen Anggota**: CRUD anggota, pencarian, dan filter
- **Manajemen Simpanan**: Proses setoran/penarikan, riwayat transaksi
- **Manajemen Pinjaman**: Persetujuan aplikasi, pencairan, pembayaran
- **Transaksi Bisnis**: Pencatatan pendapatan/pengeluaran operasional
- **Laporan Keuangan**: Neraca, laba rugi, SHU, buku besar
- **Analitik**: Grafik pertumbuhan dan tren koperasi

### Untuk Anggota
- **Dashboard Pribadi**: Ringkasan simpanan, pinjaman, dan SHU
- **Profil**: Update informasi pribadi
- **Simpanan**: Lihat saldo dan riwayat transaksi
- **Pinjaman**: Ajukan pinjaman dan lihat status
- **Riwayat**: Semua transaksi simpanan dan pinjaman

## Teknologi

- **Framework**: Next.js 14 dengan App Router
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: React Query untuk server state
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Date Handling**: date-fns
- **Deployment**: Cloudflare Pages

## Struktur Folder

```
frontend/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Admin/Manager pages
│   ├── member/           # Member pages
│   ├── login/            # Authentication
│   └── register/         # Registration
├── components/           # Reusable components
│   └── layout/          # Layout components
├── lib/                 # Utilities and configurations
│   ├── api.ts          # API client and functions
│   ├── auth-context.tsx # Authentication context
│   └── utils.ts        # Helper functions
└── types/              # TypeScript type definitions
```

## Setup Development

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API URL
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Build & Deploy

1. Build for production:
```bash
npm run build
```

2. Deploy to Cloudflare Pages:
```bash
npm run deploy
```

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8787)

## Authentication

Aplikasi menggunakan JWT token untuk autentikasi:
- Token disimpan di localStorage
- Automatic redirect berdasarkan role user
- Protected routes dengan middleware

## API Integration

Semua API calls menggunakan Axios dengan:
- Automatic token injection
- Response/request interceptors
- Error handling
- TypeScript types

## Responsive Design

- Mobile-first approach
- Responsive sidebar navigation
- Adaptive charts and tables
- Touch-friendly interface

## Performance

- Static generation dengan Next.js
- Image optimization
- Code splitting
- React Query caching
- Lazy loading components

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers
