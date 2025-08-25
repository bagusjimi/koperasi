import { Hono } from 'hono';
import { z } from 'zod';

const savings = new Hono();

// Validation schemas
const transactionSchema = z.object({
  savingsAccountId: z.number(),
  transactionType: z.enum(['deposit', 'withdrawal']),
  amount: z.number().positive(),
  description: z.string().optional(),
});

// Utility function to generate transaction ID
function generateTransactionId() {
  return `TXN${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
}

// Utility function to record general ledger entries
async function recordGeneralLedger(db, transactionId, entries, transactionDate, createdBy) {
  for (const entry of entries) {
    await db.prepare(`
      INSERT INTO general_ledger (transaction_id, account_id, debit_amount, credit_amount, description, reference_type, reference_id, transaction_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionId,
      entry.accountId,
      entry.debitAmount || 0,
      entry.creditAmount || 0,
      entry.description,
      entry.referenceType || 'savings',
      entry.referenceId || null,
      transactionDate,
      createdBy
    ).run();
  }
}

// Get savings accounts for a member
savings.get('/accounts/:memberId', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const memberId = c.req.param('memberId');

    // Check access permissions
    if (payload.role === 'member') {
      const userMember = await c.env.DB.prepare(
        'SELECT id FROM members WHERE user_id = ?'
      ).bind(payload.userId).first();

      if (!userMember || userMember.id != memberId) {
        return c.json({ error: 'Access denied' }, 403);
      }
    }

    const accounts = await c.env.DB.prepare(`
      SELECT sa.*, m.full_name, m.member_number
      FROM savings_accounts sa
      JOIN members m ON sa.member_id = m.id
      WHERE sa.member_id = ? AND sa.is_active = 1
      ORDER BY sa.account_type
    `).bind(memberId).all();

    return c.json({ accounts: accounts.results });

  } catch (error) {
    console.error('Get savings accounts error:', error);
    return c.json({ error: 'Failed to get savings accounts' }, 500);
  }
});

// Get savings account transactions
savings.get('/accounts/:accountId/transactions', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const accountId = c.req.param('accountId');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    // Check if user has access to this account
    const account = await c.env.DB.prepare(`
      SELECT sa.*, m.user_id
      FROM savings_accounts sa
      JOIN members m ON sa.member_id = m.id
      WHERE sa.id = ?
    `).bind(accountId).first();

    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    if (payload.role === 'member' && account.user_id !== payload.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const transactions = await c.env.DB.prepare(`
      SELECT st.*, u.username as processed_by_name
      FROM savings_transactions st
      LEFT JOIN users u ON st.processed_by = u.id
      WHERE st.savings_account_id = ?
      ORDER BY st.transaction_date DESC, st.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(accountId, limit, offset).all();

    const totalResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM savings_transactions WHERE savings_account_id = ?'
    ).bind(accountId).first();

    return c.json({
      transactions: transactions.results,
      account: {
        id: account.id,
        accountNumber: account.account_number,
        accountType: account.account_type,
        balance: account.balance
      },
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get savings transactions error:', error);
    return c.json({ error: 'Failed to get transactions' }, 500);
  }
});

// Process savings transaction (deposit/withdrawal)
savings.post('/transactions', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const body = await c.req.json();
    const data = transactionSchema.parse(body);

    // Only admin/manager can process transactions
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Get savings account details
    const account = await c.env.DB.prepare(`
      SELECT sa.*, m.full_name, m.member_number
      FROM savings_accounts sa
      JOIN members m ON sa.member_id = m.id
      WHERE sa.id = ? AND sa.is_active = 1
    `).bind(data.savingsAccountId).first();

    if (!account) {
      return c.json({ error: 'Savings account not found' }, 404);
    }

    // Validate withdrawal
    if (data.transactionType === 'withdrawal') {
      if (account.account_type === 'pokok') {
        return c.json({ error: 'Simpanan pokok tidak dapat ditarik' }, 400);
      }
      if (account.balance < data.amount) {
        return c.json({ error: 'Insufficient balance' }, 400);
      }
    }

    const transactionId = generateTransactionId();
    const balanceBefore = parseFloat(account.balance);
    const balanceAfter = data.transactionType === 'deposit' 
      ? balanceBefore + data.amount 
      : balanceBefore - data.amount;

    // Update account balance
    await c.env.DB.prepare(
      'UPDATE savings_accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(balanceAfter, data.savingsAccountId).run();

    // Record savings transaction
    await c.env.DB.prepare(`
      INSERT INTO savings_transactions (savings_account_id, transaction_id, transaction_type, amount, balance_before, balance_after, description, processed_by, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'))
    `).bind(
      data.savingsAccountId,
      transactionId,
      data.transactionType,
      data.amount,
      balanceBefore,
      balanceAfter,
      data.description || `${data.transactionType === 'deposit' ? 'Setoran' : 'Penarikan'} ${account.account_type}`,
      payload.userId
    ).run();

    // Get account IDs for general ledger
    const kasAccount = await c.env.DB.prepare(
      'SELECT id FROM chart_of_accounts WHERE account_code = "1101"'
    ).first();

    const savingsAccountGL = await c.env.DB.prepare(
      `SELECT id FROM chart_of_accounts WHERE account_code = ?`
    ).bind(account.account_type === 'pokok' ? '3101' : account.account_type === 'wajib' ? '3102' : '3103').first();

    // Record general ledger entries
    const glEntries = data.transactionType === 'deposit' ? [
      {
        accountId: kasAccount.id,
        debitAmount: data.amount,
        creditAmount: 0,
        description: `Setoran ${account.account_type} - ${account.member_number}`,
        referenceId: data.savingsAccountId
      },
      {
        accountId: savingsAccountGL.id,
        debitAmount: 0,
        creditAmount: data.amount,
        description: `Setoran ${account.account_type} - ${account.member_number}`,
        referenceId: data.savingsAccountId
      }
    ] : [
      {
        accountId: savingsAccountGL.id,
        debitAmount: data.amount,
        creditAmount: 0,
        description: `Penarikan ${account.account_type} - ${account.member_number}`,
        referenceId: data.savingsAccountId
      },
      {
        accountId: kasAccount.id,
        debitAmount: 0,
        creditAmount: data.amount,
        description: `Penarikan ${account.account_type} - ${account.member_number}`,
        referenceId: data.savingsAccountId
      }
    ];

    await recordGeneralLedger(c.env.DB, transactionId, glEntries, new Date().toISOString().split('T')[0], payload.userId);

    return c.json({
      message: 'Transaction processed successfully',
      transactionId,
      balanceAfter,
      transaction: {
        type: data.transactionType,
        amount: data.amount,
        balanceBefore,
        balanceAfter,
        account: {
          number: account.account_number,
          type: account.account_type,
          memberName: account.full_name
        }
      }
    });

  } catch (error) {
    console.error('Process savings transaction error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to process transaction' }, 500);
  }
});

// Get savings summary for all members (admin/manager only)
savings.get('/summary', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const summary = await c.env.DB.prepare(`
      SELECT 
        account_type,
        COUNT(*) as total_accounts,
        SUM(balance) as total_balance,
        AVG(balance) as average_balance,
        MIN(balance) as min_balance,
        MAX(balance) as max_balance
      FROM savings_accounts 
      WHERE is_active = 1
      GROUP BY account_type
      ORDER BY account_type
    `).all();

    const totalSummary = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_accounts,
        SUM(balance) as total_balance,
        COUNT(DISTINCT member_id) as total_members_with_savings
      FROM savings_accounts 
      WHERE is_active = 1
    `).first();

    return c.json({
      byType: summary.results,
      total: totalSummary
    });

  } catch (error) {
    console.error('Get savings summary error:', error);
    return c.json({ error: 'Failed to get savings summary' }, 500);
  }
});

export { savings as savingsRoutes };
