# Database Schema - Koperasi Desa

## Overview

Database ini menggunakan Cloudflare D1 (SQLite) dengan struktur akuntansi double-entry sesuai standar koperasi Indonesia.

## Schema Structure

### Core Tables

1. **users** - Sistem autentikasi
2. **members** - Data anggota koperasi
3. **chart_of_accounts** - Bagan akun (Chart of Accounts)
4. **savings_accounts** - Rekening simpanan anggota
5. **loan_accounts** - Rekening pinjaman anggota

### Transaction Tables

1. **general_ledger** - Buku besar (double-entry)
2. **savings_transactions** - Transaksi simpanan
3. **loan_transactions** - Transaksi pinjaman
4. **business_transactions** - Transaksi usaha

### Reporting Tables

1. **financial_periods** - Periode keuangan
2. **shu_calculations** - Perhitungan SHU

## Chart of Accounts

Mengikuti standar akuntansi koperasi Indonesia:

- **1xxx** - AKTIVA (Assets)
  - **11xx** - Aktiva Lancar
  - **12xx** - Aktiva Tetap
- **2xxx** - KEWAJIBAN (Liabilities)
  - **21xx** - Kewajiban Lancar
  - **22xx** - Kewajiban Jangka Panjang
- **3xxx** - MODAL (Equity)
  - **31xx** - Modal Sendiri
- **4xxx** - PENDAPATAN (Revenue)
  - **41xx** - Pendapatan Usaha
  - **42xx** - Pendapatan Lain-lain
- **5xxx** - BEBAN (Expenses)
  - **51xx** - Beban Operasional
  - **52xx** - Beban Lain-lain

## Setup Commands

```bash
# Setup database
npm run setup

# Run migrations
npm run migrate

# Seed initial data
npm run seed

# Console access
npm run console
```

## Default Login

- Username: `admin`
- Password: `admin123` (akan di-hash saat implementasi)
- Role: `admin`

## Member Types

- **admin**: Administrator sistem
- **manager**: Manajer koperasi
- **member**: Anggota biasa

## Savings Account Types

- **pokok**: Simpanan Pokok (wajib, tidak dapat ditarik)
- **wajib**: Simpanan Wajib (wajib, dapat ditarik dengan syarat)
- **sukarela**: Simpanan Sukarela (opsional, dapat ditarik kapan saja)

## Loan Types

- **konsumtif**: Pinjaman untuk kebutuhan konsumsi
- **produktif**: Pinjaman untuk kegiatan produktif/usaha
- **darurat**: Pinjaman untuk kebutuhan darurat
