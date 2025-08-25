-- Koperasi Desa Database Schema
-- Created: 2025-08-25

-- Users table for authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- admin, manager, member
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Members table for cooperative members
CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    member_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    id_number TEXT UNIQUE NOT NULL, -- KTP/NIK
    phone TEXT,
    address TEXT,
    date_of_birth DATE,
    gender TEXT CHECK(gender IN ('L', 'P')), -- L=Laki-laki, P=Perempuan
    occupation TEXT,
    join_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts for double-entry bookkeeping
CREATE TABLE chart_of_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_code TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id INTEGER REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Savings accounts for members
CREATE TABLE savings_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id),
    account_type TEXT NOT NULL CHECK(account_type IN ('pokok', 'wajib', 'sukarela')),
    account_number TEXT UNIQUE NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    interest_rate DECIMAL(5,4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Loan accounts for members
CREATE TABLE loan_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id),
    loan_number TEXT UNIQUE NOT NULL,
    loan_type TEXT NOT NULL, -- konsumtif, produktif, darurat
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    outstanding_balance DECIMAL(15,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'completed', 'defaulted')),
    application_date DATE NOT NULL,
    approval_date DATE,
    disbursement_date DATE,
    maturity_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- General ledger for all transactions
CREATE TABLE general_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    description TEXT NOT NULL,
    reference_type TEXT, -- savings, loan, fee, etc.
    reference_id INTEGER,
    transaction_date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Savings transactions
CREATE TABLE savings_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    savings_account_id INTEGER NOT NULL REFERENCES savings_accounts(id),
    transaction_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit', 'withdrawal')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    processed_by INTEGER REFERENCES users(id),
    transaction_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Loan transactions (disbursements and payments)
CREATE TABLE loan_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_account_id INTEGER NOT NULL REFERENCES loan_accounts(id),
    transaction_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('disbursement', 'payment', 'interest', 'penalty')),
    amount DECIMAL(15,2) NOT NULL,
    principal_amount DECIMAL(15,2) DEFAULT 0.00,
    interest_amount DECIMAL(15,2) DEFAULT 0.00,
    penalty_amount DECIMAL(15,2) DEFAULT 0.00,
    outstanding_before DECIMAL(15,2) NOT NULL,
    outstanding_after DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    due_date DATE,
    processed_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Business transactions (non-member related)
CREATE TABLE business_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- income, expense, investment
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    transaction_date DATE NOT NULL,
    processed_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Financial periods for reporting
CREATE TABLE financial_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SHU (Sisa Hasil Usaha) calculations
CREATE TABLE shu_calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL REFERENCES financial_periods(id),
    member_id INTEGER NOT NULL REFERENCES members(id),
    savings_participation DECIMAL(15,2) DEFAULT 0.00,
    loan_participation DECIMAL(15,2) DEFAULT 0.00,
    shu_savings DECIMAL(15,2) DEFAULT 0.00,
    shu_loan DECIMAL(15,2) DEFAULT 0.00,
    total_shu DECIMAL(15,2) DEFAULT 0.00,
    is_distributed BOOLEAN DEFAULT FALSE,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_members_member_number ON members(member_number);
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_savings_accounts_member_id ON savings_accounts(member_id);
CREATE INDEX idx_loan_accounts_member_id ON loan_accounts(member_id);
CREATE INDEX idx_general_ledger_transaction_id ON general_ledger(transaction_id);
CREATE INDEX idx_general_ledger_account_id ON general_ledger(account_id);
CREATE INDEX idx_general_ledger_transaction_date ON general_ledger(transaction_date);
CREATE INDEX idx_savings_transactions_account_id ON savings_transactions(savings_account_id);
CREATE INDEX idx_loan_transactions_account_id ON loan_transactions(loan_account_id);
