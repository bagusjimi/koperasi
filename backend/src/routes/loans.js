import { Hono } from 'hono';
import { z } from 'zod';

const loans = new Hono();

// Validation schemas
const loanApplicationSchema = z.object({
  memberId: z.number(),
  loanType: z.enum(['konsumtif', 'produktif', 'darurat']),
  principalAmount: z.number().positive(),
  termMonths: z.number().int().min(1).max(60),
  purpose: z.string().min(10),
});

const loanApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  interestRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

const loanPaymentSchema = z.object({
  loanAccountId: z.number(),
  amount: z.number().positive(),
  paymentType: z.enum(['regular', 'early', 'penalty']).default('regular'),
  description: z.string().optional(),
});

// Utility functions
function generateLoanNumber() {
  return `PJM${crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase()}`;
}

function generateTransactionId() {
  return `TXN${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
}

// Helper function for getting last insert ID
async function getLastInsertId(db) {
  const result = await db.prepare('SELECT last_insert_rowid() as id').first();
  return result;
}

function calculateMonthlyPayment(principal, rate, months) {
  if (rate === 0) return principal / months;
  const monthlyRate = rate / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
         (Math.pow(1 + monthlyRate, months) - 1);
}

// Apply for loan
loans.post('/apply', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const body = await c.req.json();
    const data = loanApplicationSchema.parse(body);

    // Check if user can apply for this member
    if (payload.role === 'member') {
      const userMember = await c.env.DB.prepare(
        'SELECT id FROM members WHERE user_id = ?'
      ).bind(payload.userId).first();

      if (!userMember || userMember.id !== data.memberId) {
        return c.json({ error: 'Access denied' }, 403);
      }
    }

    // Check if member exists and is active
    const member = await c.env.DB.prepare(
      'SELECT * FROM members WHERE id = ? AND status = "active"'
    ).bind(data.memberId).first();

    if (!member) {
      return c.json({ error: 'Member not found or inactive' }, 404);
    }

    // Check for existing active loans
    const existingLoan = await c.env.DB.prepare(
      'SELECT id FROM loan_accounts WHERE member_id = ? AND status IN ("pending", "approved", "active")'
    ).bind(data.memberId).first();

    if (existingLoan) {
      return c.json({ error: 'Member already has an active loan application or loan' }, 409);
    }

    const loanNumber = generateLoanNumber();
    
    // Default interest rates by loan type
    const defaultRates = {
      konsumtif: 0.12, // 12% per year
      produktif: 0.10,  // 10% per year
      darurat: 0.15     // 15% per year
    };

    const interestRate = defaultRates[data.loanType];
    const monthlyPayment = calculateMonthlyPayment(data.principalAmount, interestRate, data.termMonths);

    await c.env.DB.prepare(`
      INSERT INTO loan_accounts (
        member_id, loan_number, loan_type, principal_amount, interest_rate, 
        term_months, monthly_payment, outstanding_balance, status, 
        application_date, maturity_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', date('now'), date('now', '+' || ? || ' months'))
    `).bind(
      data.memberId,
      loanNumber,
      data.loanType,
      data.principalAmount,
      interestRate,
      data.termMonths,
      monthlyPayment,
      data.principalAmount,
      data.termMonths
    ).run();
    
    const result = await getLastInsertId(c.env.DB);

    return c.json({
      message: 'Loan application submitted successfully',
      loanId: result.id,
      loanNumber,
      monthlyPayment: Math.round(monthlyPayment),
      interestRate
    }, 201);

  } catch (error) {
    console.error('Loan application error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to submit loan application' }, 500);
  }
});

// Get loan applications (admin/manager only)
loans.get('/applications', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const status = c.req.query('status') || 'pending';
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;

    const applications = await c.env.DB.prepare(`
      SELECT la.*, m.full_name, m.member_number, m.phone
      FROM loan_accounts la
      JOIN members m ON la.member_id = m.id
      WHERE la.status = ?
      ORDER BY la.application_date DESC
      LIMIT ? OFFSET ?
    `).bind(status, limit, offset).all();

    const totalResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM loan_accounts WHERE status = ?'
    ).bind(status).first();

    return c.json({
      applications: applications.results,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get loan applications error:', error);
    return c.json({ error: 'Failed to get loan applications' }, 500);
  }
});

// Approve/reject loan application
loans.put('/applications/:id/approve', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const loanId = c.req.param('id');
    const body = await c.req.json();
    const data = loanApprovalSchema.parse(body);

    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const loan = await c.env.DB.prepare(
      'SELECT * FROM loan_accounts WHERE id = ? AND status = "pending"'
    ).bind(loanId).first();

    if (!loan) {
      return c.json({ error: 'Loan application not found or already processed' }, 404);
    }

    if (data.status === 'approved') {
      const interestRate = data.interestRate || loan.interest_rate;
      const monthlyPayment = calculateMonthlyPayment(loan.principal_amount, interestRate, loan.term_months);

      await c.env.DB.prepare(`
        UPDATE loan_accounts 
        SET status = 'approved', interest_rate = ?, monthly_payment = ?, 
            approval_date = date('now'), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(interestRate, monthlyPayment, loanId).run();

    } else {
      await c.env.DB.prepare(
        'UPDATE loan_accounts SET status = "rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(loanId).run();
    }

    return c.json({
      message: `Loan application ${data.status} successfully`,
      loanId,
      status: data.status
    });

  } catch (error) {
    console.error('Loan approval error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to process loan approval' }, 500);
  }
});

// Disburse approved loan
loans.post('/:id/disburse', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const loanId = c.req.param('id');

    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const loan = await c.env.DB.prepare(`
      SELECT la.*, m.full_name, m.member_number
      FROM loan_accounts la
      JOIN members m ON la.member_id = m.id
      WHERE la.id = ? AND la.status = 'approved'
    `).bind(loanId).first();

    if (!loan) {
      return c.json({ error: 'Loan not found or not approved' }, 404);
    }

    const transactionId = generateTransactionId();

    // Update loan status to active
    await c.env.DB.prepare(`
      UPDATE loan_accounts 
      SET status = 'active', disbursement_date = date('now'), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(loanId).run();

    // Record disbursement transaction
    await c.env.DB.prepare(`
      INSERT INTO loan_transactions (
        loan_account_id, transaction_id, transaction_type, amount, 
        principal_amount, outstanding_before, outstanding_after, 
        payment_date, processed_by
      ) VALUES (?, ?, 'disbursement', ?, ?, 0, ?, date('now'), ?)
    `).bind(
      loanId,
      transactionId,
      loan.principal_amount,
      loan.principal_amount,
      loan.principal_amount,
      payload.userId
    ).run();

    // Record general ledger entries
    const kasAccount = await c.env.DB.prepare(
      'SELECT id FROM chart_of_accounts WHERE account_code = "1101"'
    ).first();

    const piutangAccount = await c.env.DB.prepare(
      'SELECT id FROM chart_of_accounts WHERE account_code = "1103"'
    ).first();

    const glEntries = [
      {
        accountId: piutangAccount.id,
        debitAmount: loan.principal_amount,
        creditAmount: 0,
        description: `Pencairan pinjaman ${loan.loan_type} - ${loan.member_number}`,
        referenceType: 'loan',
        referenceId: loanId
      },
      {
        accountId: kasAccount.id,
        debitAmount: 0,
        creditAmount: loan.principal_amount,
        description: `Pencairan pinjaman ${loan.loan_type} - ${loan.member_number}`,
        referenceType: 'loan',
        referenceId: loanId
      }
    ];

    for (const entry of glEntries) {
      await c.env.DB.prepare(`
        INSERT INTO general_ledger (transaction_id, account_id, debit_amount, credit_amount, description, reference_type, reference_id, transaction_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), ?)
      `).bind(
        transactionId,
        entry.accountId,
        entry.debitAmount,
        entry.creditAmount,
        entry.description,
        entry.referenceType,
        entry.referenceId,
        payload.userId
      ).run();
    }

    return c.json({
      message: 'Loan disbursed successfully',
      transactionId,
      amount: loan.principal_amount,
      loan: {
        number: loan.loan_number,
        type: loan.loan_type,
        memberName: loan.full_name
      }
    });

  } catch (error) {
    console.error('Loan disbursement error:', error);
    return c.json({ error: 'Failed to disburse loan' }, 500);
  }
});

// Process loan payment
loans.post('/payments', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const body = await c.req.json();
    const data = loanPaymentSchema.parse(body);

    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const loan = await c.env.DB.prepare(`
      SELECT la.*, m.full_name, m.member_number
      FROM loan_accounts la
      JOIN members m ON la.member_id = m.id
      WHERE la.id = ? AND la.status = 'active'
    `).bind(data.loanAccountId).first();

    if (!loan) {
      return c.json({ error: 'Active loan not found' }, 404);
    }

    if (data.amount > loan.outstanding_balance) {
      return c.json({ error: 'Payment amount exceeds outstanding balance' }, 400);
    }

    const transactionId = generateTransactionId();
    const outstandingBefore = parseFloat(loan.outstanding_balance);
    const outstandingAfter = outstandingBefore - data.amount;

    // Calculate principal and interest portions (simplified)
    const monthlyInterest = (outstandingBefore * loan.interest_rate) / 12;
    const principalAmount = Math.max(0, data.amount - monthlyInterest);
    const interestAmount = data.amount - principalAmount;

    // Update loan outstanding balance
    await c.env.DB.prepare(
      'UPDATE loan_accounts SET outstanding_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(outstandingAfter, data.loanAccountId).run();

    // If fully paid, mark as completed
    if (outstandingAfter === 0) {
      await c.env.DB.prepare(
        'UPDATE loan_accounts SET status = "completed" WHERE id = ?'
      ).bind(data.loanAccountId).run();
    }

    // Record payment transaction
    await c.env.DB.prepare(`
      INSERT INTO loan_transactions (
        loan_account_id, transaction_id, transaction_type, amount,
        principal_amount, interest_amount, outstanding_before, outstanding_after,
        payment_date, processed_by
      ) VALUES (?, ?, 'payment', ?, ?, ?, ?, ?, date('now'), ?)
    `).bind(
      data.loanAccountId,
      transactionId,
      data.amount,
      principalAmount,
      interestAmount,
      outstandingBefore,
      outstandingAfter,
      payload.userId
    ).run();

    return c.json({
      message: 'Payment processed successfully',
      transactionId,
      payment: {
        amount: data.amount,
        principalAmount,
        interestAmount,
        outstandingBefore,
        outstandingAfter,
        isFullyPaid: outstandingAfter === 0
      }
    });

  } catch (error) {
    console.error('Loan payment error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to process payment' }, 500);
  }
});

// Get loans for a member
loans.get('/member/:memberId', async (c) => {
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

    const memberLoans = await c.env.DB.prepare(`
      SELECT * FROM loan_accounts 
      WHERE member_id = ? 
      ORDER BY created_at DESC
    `).bind(memberId).all();

    return c.json({ loans: memberLoans.results });

  } catch (error) {
    console.error('Get member loans error:', error);
    return c.json({ error: 'Failed to get member loans' }, 500);
  }
});

// Get loan transactions
loans.get('/:id/transactions', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const loanId = c.req.param('id');

    const loan = await c.env.DB.prepare(`
      SELECT la.*, m.user_id
      FROM loan_accounts la
      JOIN members m ON la.member_id = m.id
      WHERE la.id = ?
    `).bind(loanId).first();

    if (!loan) {
      return c.json({ error: 'Loan not found' }, 404);
    }

    if (payload.role === 'member' && loan.user_id !== payload.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const transactions = await c.env.DB.prepare(`
      SELECT lt.*, u.username as processed_by_name
      FROM loan_transactions lt
      LEFT JOIN users u ON lt.processed_by = u.id
      WHERE lt.loan_account_id = ?
      ORDER BY lt.payment_date DESC, lt.created_at DESC
    `).bind(loanId).all();

    return c.json({
      transactions: transactions.results,
      loan: {
        id: loan.id,
        loanNumber: loan.loan_number,
        loanType: loan.loan_type,
        principalAmount: loan.principal_amount,
        outstandingBalance: loan.outstanding_balance,
        status: loan.status
      }
    });

  } catch (error) {
    console.error('Get loan transactions error:', error);
    return c.json({ error: 'Failed to get loan transactions' }, 500);
  }
});

export { loans as loanRoutes };
