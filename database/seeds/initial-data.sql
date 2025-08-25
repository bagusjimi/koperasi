-- Initial data for Koperasi Desa
-- Chart of Accounts sesuai standar akuntansi koperasi Indonesia

-- ASSETS (AKTIVA)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
-- Current Assets (Aktiva Lancar)
('1000', 'AKTIVA', 'asset', NULL),
('1100', 'AKTIVA LANCAR', 'asset', 1),
('1101', 'Kas', 'asset', 2),
('1102', 'Bank', 'asset', 2),
('1103', 'Piutang Anggota', 'asset', 2),
('1104', 'Piutang Bunga', 'asset', 2),
('1105', 'Piutang Lain-lain', 'asset', 2),
('1106', 'Persediaan', 'asset', 2),
('1107', 'Biaya Dibayar Dimuka', 'asset', 2),

-- Fixed Assets (Aktiva Tetap)
('1200', 'AKTIVA TETAP', 'asset', 1),
('1201', 'Tanah', 'asset', 9),
('1202', 'Bangunan', 'asset', 9),
('1203', 'Akumulasi Penyusutan Bangunan', 'asset', 9),
('1204', 'Kendaraan', 'asset', 9),
('1205', 'Akumulasi Penyusutan Kendaraan', 'asset', 9),
('1206', 'Peralatan Kantor', 'asset', 9),
('1207', 'Akumulasi Penyusutan Peralatan Kantor', 'asset', 9);

-- LIABILITIES (KEWAJIBAN)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('2000', 'KEWAJIBAN', 'liability', NULL),
('2100', 'KEWAJIBAN LANCAR', 'liability', 16),
('2101', 'Hutang Usaha', 'liability', 17),
('2102', 'Hutang Bank', 'liability', 17),
('2103', 'Hutang Pajak', 'liability', 17),
('2104', 'Biaya Yang Masih Harus Dibayar', 'liability', 17),
('2105', 'Hutang Jangka Pendek Lainnya', 'liability', 17),

('2200', 'KEWAJIBAN JANGKA PANJANG', 'liability', 16),
('2201', 'Hutang Bank Jangka Panjang', 'liability', 22),
('2202', 'Hutang Obligasi', 'liability', 22);

-- EQUITY (MODAL)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('3000', 'MODAL', 'equity', NULL),
('3100', 'MODAL SENDIRI', 'equity', 25),
('3101', 'Simpanan Pokok', 'equity', 26),
('3102', 'Simpanan Wajib', 'equity', 26),
('3103', 'Simpanan Sukarela', 'equity', 26),
('3104', 'Modal Donasi', 'equity', 26),
('3105', 'Cadangan Umum', 'equity', 26),
('3106', 'Cadangan Tujuan', 'equity', 26),
('3107', 'SHU Belum Dibagi', 'equity', 26);

-- REVENUE (PENDAPATAN)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('4000', 'PENDAPATAN', 'revenue', NULL),
('4100', 'PENDAPATAN USAHA', 'revenue', 33),
('4101', 'Pendapatan Bunga Pinjaman', 'revenue', 34),
('4102', 'Pendapatan Administrasi', 'revenue', 34),
('4103', 'Pendapatan Provisi', 'revenue', 34),
('4104', 'Pendapatan Denda', 'revenue', 34),

('4200', 'PENDAPATAN LAIN-LAIN', 'revenue', 33),
('4201', 'Pendapatan Bunga Bank', 'revenue', 39),
('4202', 'Pendapatan Sewa', 'revenue', 39),
('4203', 'Pendapatan Lain-lain', 'revenue', 39);

-- EXPENSES (BEBAN)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('5000', 'BEBAN', 'expense', NULL),
('5100', 'BEBAN OPERASIONAL', 'expense', 43),
('5101', 'Beban Gaji dan Tunjangan', 'expense', 44),
('5102', 'Beban Bunga Simpanan', 'expense', 44),
('5103', 'Beban Administrasi Bank', 'expense', 44),
('5104', 'Beban Penyusutan', 'expense', 44),
('5105', 'Beban Listrik dan Air', 'expense', 44),
('5106', 'Beban Telepon', 'expense', 44),
('5107', 'Beban ATK', 'expense', 44),
('5108', 'Beban Transportasi', 'expense', 44),
('5109', 'Beban Rapat dan Pertemuan', 'expense', 44),
('5110', 'Beban Pemeliharaan', 'expense', 44),
('5111', 'Beban Asuransi', 'expense', 44),
('5112', 'Beban Pajak', 'expense', 44),

('5200', 'BEBAN LAIN-LAIN', 'expense', 43),
('5201', 'Beban Bunga Bank', 'expense', 56),
('5202', 'Beban Lain-lain', 'expense', 56);

-- Default admin user
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@koperasi.local', '$2b$10$rQZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9Q', 'admin');

-- Sample financial period
INSERT INTO financial_periods (period_name, start_date, end_date) VALUES
('Tahun Buku 2025', '2025-01-01', '2025-12-31');

-- Sample member (linked to admin user)
INSERT INTO members (user_id, member_number, full_name, id_number, phone, address, date_of_birth, gender, occupation, join_date) VALUES
(1, 'KOP001', 'Administrator Koperasi', '1234567890123456', '081234567890', 'Jl. Koperasi No. 1, Desa Maju', '1980-01-01', 'L', 'Pengelola Koperasi', '2025-01-01');

-- Sample savings accounts for the admin member
INSERT INTO savings_accounts (member_id, account_type, account_number, balance, interest_rate) VALUES
(1, 'pokok', 'SP001', 100000.00, 0.0000),
(1, 'wajib', 'SW001', 500000.00, 0.0200),
(1, 'sukarela', 'SS001', 1000000.00, 0.0300);
