-- Initial data for Koperasi Desa
-- Chart of Accounts sesuai standar akuntansi koperasi Indonesia

-- Insert parent accounts first (level 1)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('1000', 'AKTIVA', 'asset', NULL),
('2000', 'KEWAJIBAN', 'liability', NULL),
('3000', 'MODAL', 'equity', NULL),
('4000', 'PENDAPATAN', 'revenue', NULL),
('5000', 'BEBAN', 'expense', NULL);

-- Insert level 2 accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('1100', 'AKTIVA LANCAR', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1000')),
('1200', 'AKTIVA TETAP', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1000')),
('2100', 'KEWAJIBAN LANCAR', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2000')),
('2200', 'KEWAJIBAN JANGKA PANJANG', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2000')),
('3100', 'MODAL SENDIRI', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3000')),
('4100', 'PENDAPATAN USAHA', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4000')),
('4200', 'PENDAPATAN LAIN-LAIN', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4000')),
('5100', 'BEBAN OPERASIONAL', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5000')),
('5200', 'BEBAN LAIN-LAIN', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5000'));

-- Insert level 3 accounts (Current Assets)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('1101', 'Kas', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100')),
('1102', 'Bank', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100')),
('1103', 'Piutang Anggota', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100')),
('1104', 'Piutang Bunga', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100')),
('1105', 'Piutang Lain-lain', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100')),
('1106', 'Persediaan', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100')),
('1107', 'Biaya Dibayar Dimuka', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100'));

-- Insert level 3 accounts (Fixed Assets)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('1201', 'Tanah', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200')),
('1202', 'Bangunan', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200')),
('1203', 'Akumulasi Penyusutan Bangunan', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200')),
('1204', 'Kendaraan', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200')),
('1205', 'Akumulasi Penyusutan Kendaraan', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200')),
('1206', 'Peralatan Kantor', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200')),
('1207', 'Akumulasi Penyusutan Peralatan Kantor', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200'));

-- Insert level 3 accounts (Current Liabilities)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('2101', 'Hutang Usaha', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100')),
('2102', 'Hutang Bank', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100')),
('2103', 'Hutang Pajak', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100')),
('2104', 'Biaya Yang Masih Harus Dibayar', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100')),
('2105', 'Hutang Jangka Pendek Lainnya', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100'));

-- Insert level 3 accounts (Long-term Liabilities)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('2201', 'Hutang Bank Jangka Panjang', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2200')),
('2202', 'Hutang Obligasi', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2200'));

-- Insert level 3 accounts (Equity)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('3101', 'Simpanan Pokok', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100')),
('3102', 'Simpanan Wajib', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100')),
('3103', 'Simpanan Sukarela', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100')),
('3104', 'Modal Donasi', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100')),
('3105', 'Cadangan Umum', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100')),
('3106', 'Cadangan Tujuan', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100')),
('3107', 'SHU Belum Dibagi', 'equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100'));

-- Insert level 3 accounts (Operating Revenue)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('4101', 'Pendapatan Bunga Pinjaman', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100')),
('4102', 'Pendapatan Administrasi', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100')),
('4103', 'Pendapatan Provisi', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100')),
('4104', 'Pendapatan Denda', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100'));

-- Insert level 3 accounts (Other Revenue)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('4201', 'Pendapatan Bunga Bank', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4200')),
('4202', 'Pendapatan Sewa', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4200')),
('4203', 'Pendapatan Lain-lain', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4200'));

-- Insert level 3 accounts (Operating Expenses)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('5101', 'Beban Gaji dan Tunjangan', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5102', 'Beban Bunga Simpanan', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5103', 'Beban Administrasi Bank', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5104', 'Beban Penyusutan', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5105', 'Beban Listrik dan Air', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5106', 'Beban Telepon', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5107', 'Beban ATK', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5108', 'Beban Transportasi', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5109', 'Beban Rapat dan Pertemuan', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5110', 'Beban Pemeliharaan', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5111', 'Beban Asuransi', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100')),
('5112', 'Beban Pajak', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100'));

-- Insert level 3 accounts (Other Expenses)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
('5201', 'Beban Bunga Bank', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5200')),
('5202', 'Beban Lain-lain', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5200'));

-- Default admin user
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@koperasi.local', '$2b$10$rQZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9Q', 'admin');

-- Sample financial period
INSERT INTO financial_periods (period_name, start_date, end_date) VALUES
('Tahun Buku 2025', '2025-01-01', '2025-12-31');

-- Sample member (linked to admin user)
INSERT INTO members (user_id, member_number, full_name, id_number, phone, address, date_of_birth, gender, occupation, join_date) VALUES
(1, 'KOP001', 'Administrator Koperasi', '1234567890123456', '081234567890', 'Jl. Koperasi No. 1, Desa Maju', '1980-01-01', 'L', 'Pengelola Koperasi', '2025-01-01');

-- Sample savings accounts for the admin member (using member_id = 1)
INSERT INTO savings_accounts (member_id, account_type, account_number, balance, interest_rate) VALUES
(1, 'pokok', 'SP001', 100000.00, 0.0000),
(1, 'wajib', 'SW001', 500000.00, 0.0200),
(1, 'sukarela', 'SS001', 1000000.00, 0.0300);
