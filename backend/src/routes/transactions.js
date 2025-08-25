import { Hono } from 'hono';
import { z } from 'zod';

const transactions = new Hono();

// Validation schemas
const businessTransactionSchema = z.object({
  transactionType: z.enum(['income', 'expense', 'investment']),
  amount: z.number().positive(),
  description: z.string().min(5),
  category: z.string().optional(),
  accountCode: z.string(),
});

// Get all transactions with filters
transactions.get('/', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const type = c.req.query('type') || ''; // savings, loan, business
    const startDate = c.req.query('start_date') || '';
    const endDate = c.req.query('end_date') || '';
    const offset = (page - 1) * limit;

    let query = '';
    let countQuery = '';
    let params = [];

    if (type === 'savings') {
      query = `
        SELECT 'savings' as type, st.transaction_id, st.transaction_type, st.amount, 
               st.description, st.transaction_date, st.created_at,
               sa.account_number, sa.account_type, m.full_name, m.member_number,
               u.username as processed_by
        FROM savings_transactions st
        JOIN savings_accounts sa ON st.savings_account_id = sa.id
        JOIN members m ON sa.member_id = m.id
        LEFT JOIN users u ON st.processed_by = u.id
        WHERE 1=1
      `;
      countQuery = `
        SELECT COUNT(*) as total
        FROM savings_transactions st
        JOIN savings_accounts sa ON st.savings_account_id = sa.id
        WHERE 1=1
      `;
    } else if (type === 'loan') {
      query = `
        SELECT 'loan' as type, lt.transaction_id, lt.transaction_type, lt.amount,
               'Loan ' || lt.transaction_type as description, lt.payment_date as transaction_date, lt.created_at,
               la.loan_number as account_number, la.loan_type as account_type, m.full_name, m.member_number,
               u.username as processed_by
        FROM loan_transactions lt
        JOIN loan_accounts la ON lt.loan_account_id = la.id
        JOIN members m ON la.member_id = m.id
        LEFT JOIN users u ON lt.processed_by = u.id
        WHERE 1=1
      `;
      countQuery = `
        SELECT COUNT(*) as total
        FROM loan_transactions lt
        JOIN loan_accounts la ON lt.loan_account_id = la.id
        WHERE 1=1
      `;
    } else if (type === 'business') {
      query = `
        SELECT 'business' as type, bt.transaction_id, bt.transaction_type, bt.amount,
               bt.description, bt.transaction_date, bt.created_at,
               bt.category as account_number, bt.transaction_type as account_type, 
               '' as full_name, '' as member_number,
               u.username as processed_by
        FROM business_transactions bt
        LEFT JOIN users u ON bt.processed_by = u.id
        WHERE 1=1
      `;
      countQuery = `
        SELECT COUNT(*) as total
        FROM business_transactions bt
        WHERE 1=1
      `;
    } else {
      // All transactions combined
      query = `
        SELECT * FROM (
          SELECT 'savings' as type, st.transaction_id, st.transaction_type, st.amount, 
                 st.description, st.transaction_date, st.created_at,
                 sa.account_number, sa.account_type, m.full_name, m.member_number,
                 u.username as processed_by
          FROM savings_transactions st
          JOIN savings_accounts sa ON st.savings_account_id = sa.id
          JOIN members m ON sa.member_id = m.id
          LEFT JOIN users u ON st.processed_by = u.id
          
          UNION ALL
          
          SELECT 'loan' as type, lt.transaction_id, lt.transaction_type, lt.amount,
                 'Loan ' || lt.transaction_type as description, lt.payment_date as transaction_date, lt.created_at,
                 la.loan_number as account_number, la.loan_type as account_type, m.full_name, m.member_number,
                 u.username as processed_by
          FROM loan_transactions lt
          JOIN loan_accounts la ON lt.loan_account_id = la.id
          JOIN members m ON la.member_id = m.id
          LEFT JOIN users u ON lt.processed_by = u.id
          
          UNION ALL
          
          SELECT 'business' as type, bt.transaction_id, bt.transaction_type, bt.amount,
                 bt.description, bt.transaction_date, bt.created_at,
                 bt.category as account_number, bt.transaction_type as account_type, 
                 '' as full_name, '' as member_number,
                 u.username as processed_by
          FROM business_transactions bt
          LEFT JOIN users u ON bt.processed_by = u.id
        ) combined_transactions
        WHERE 1=1
      `;
      
      countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT 1 FROM savings_transactions st WHERE 1=1
          UNION ALL
          SELECT 1 FROM loan_transactions lt WHERE 1=1
          UNION ALL
          SELECT 1 FROM business_transactions bt WHERE 1=1
        )
      `;
    }

    // Add date filters
    if (startDate) {
      query += ' AND transaction_date >= ?';
      countQuery += ' AND transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND transaction_date <= ?';
      countQuery += ' AND transaction_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY transaction_date DESC, created_at DESC LIMIT ? OFFSET ?';
    
    const transactionsList = await c.env.DB.prepare(query)
      .bind(...params, limit, offset)
      .all();

    const totalResult = await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first();

    return c.json({
      transactions: transactionsList.results,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    return c.json({ error: 'Failed to get transactions' }, 500);
  }
});

// Create business transaction
transactions.post('/business', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const body = await c.req.json();
    const data = businessTransactionSchema.parse(body);

    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Validate account code exists
    const account = await c.env.DB.prepare(
      'SELECT * FROM chart_of_accounts WHERE account_code = ? AND is_active = 1'
    ).bind(data.accountCode).first();

    if (!account) {
      return c.json({ error: 'Invalid account code' }, 400);
    }

    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Record business transaction
    await c.env.DB.prepare(`
      INSERT INTO business_transactions (transaction_id, transaction_type, amount, description, category, transaction_date, processed_by)
      VALUES (?, ?, ?, ?, ?, date('now'), ?)
    `).bind(
      transactionId,
      data.transactionType,
      data.amount,
      data.description,
      data.category || account.account_name,
      payload.userId
    ).run();

    // Get cash account for general ledger
    const kasAccount = await c.env.DB.prepare(
      'SELECT id FROM chart_of_accounts WHERE account_code = "1101"'
    ).first();

    // Record general ledger entries
    let glEntries = [];
    
    if (data.transactionType === 'income') {
      glEntries = [
        {
          accountId: kasAccount.id,
          debitAmount: data.amount,
          creditAmount: 0,
          description: data.description
        },
        {
          accountId: account.id,
          debitAmount: 0,
          creditAmount: data.amount,
          description: data.description
        }
      ];
    } else if (data.transactionType === 'expense') {
      glEntries = [
        {
          accountId: account.id,
          debitAmount: data.amount,
          creditAmount: 0,
          description: data.description
        },
        {
          accountId: kasAccount.id,
          debitAmount: 0,
          creditAmount: data.amount,
          description: data.description
        }
      ];
    } else if (data.transactionType === 'investment') {
      glEntries = [
        {
          accountId: account.id,
          debitAmount: data.amount,
          creditAmount: 0,
          description: data.description
        },
        {
          accountId: kasAccount.id,
          debitAmount: 0,
          creditAmount: data.amount,
          description: data.description
        }
      ];
    }

    for (const entry of glEntries) {
      await c.env.DB.prepare(`
        INSERT INTO general_ledger (transaction_id, account_id, debit_amount, credit_amount, description, reference_type, transaction_date, created_by)
        VALUES (?, ?, ?, ?, ?, 'business', date('now'), ?)
      `).bind(
        transactionId,
        entry.accountId,
        entry.debitAmount,
        entry.creditAmount,
        entry.description,
        payload.userId
      ).run();
    }

    return c.json({
      message: 'Business transaction recorded successfully',
      transactionId,
      transaction: {
        type: data.transactionType,
        amount: data.amount,
        description: data.description,
        account: account.account_name
      }
    }, 201);

  } catch (error) {
    console.error('Create business transaction error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to create business transaction' }, 500);
  }
});

// Get transaction summary by date range
transactions.get('/summary', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];

    // Savings summary
    const savingsSummary = await c.env.DB.prepare(`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM savings_transactions 
      WHERE transaction_date BETWEEN ? AND ?
      GROUP BY transaction_type
    `).bind(startDate, endDate).all();

    // Loan summary
    const loanSummary = await c.env.DB.prepare(`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM loan_transactions 
      WHERE payment_date BETWEEN ? AND ?
      GROUP BY transaction_type
    `).bind(startDate, endDate).all();

    // Business summary
    const businessSummary = await c.env.DB.prepare(`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM business_transactions 
      WHERE transaction_date BETWEEN ? AND ?
      GROUP BY transaction_type
    `).bind(startDate, endDate).all();

    // Daily transaction volume
    const dailyVolume = await c.env.DB.prepare(`
      SELECT 
        transaction_date,
        COUNT(*) as transaction_count,
        SUM(total_amount) as daily_amount
      FROM (
        SELECT transaction_date, amount as total_amount FROM savings_transactions WHERE transaction_date BETWEEN ? AND ?
        UNION ALL
        SELECT payment_date as transaction_date, amount as total_amount FROM loan_transactions WHERE payment_date BETWEEN ? AND ?
        UNION ALL
        SELECT transaction_date, amount as total_amount FROM business_transactions WHERE transaction_date BETWEEN ? AND ?
      )
      GROUP BY transaction_date
      ORDER BY transaction_date DESC
    `).bind(startDate, endDate, startDate, endDate, startDate, endDate).all();

    return c.json({
      period: { startDate, endDate },
      savings: savingsSummary.results,
      loans: loanSummary.results,
      business: businessSummary.results,
      dailyVolume: dailyVolume.results
    });

  } catch (error) {
    console.error('Get transaction summary error:', error);
    return c.json({ error: 'Failed to get transaction summary' }, 500);
  }
});

export { transactions as transactionRoutes };
