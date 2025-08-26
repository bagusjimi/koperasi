import { Hono } from 'hono';
import { z } from 'zod';

// Helper function for getting last insert ID
async function getLastInsertId(db) {
  const result = await db.prepare('SELECT last_insert_rowid() as id').first();
  return result;
}

const reports = new Hono();

// Validation schemas
const reportPeriodSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const shuCalculationSchema = z.object({
  periodId: z.number(),
  savingsPercentage: z.number().min(0).max(100).default(40),
  loanPercentage: z.number().min(0).max(100).default(60),
});

// Generate Balance Sheet (Neraca)
reports.get('/balance-sheet', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const asOfDate = c.req.query('as_of_date') || new Date().toISOString().split('T')[0];

    // Get all accounts with their balances
    const accountBalances = await c.env.DB.prepare(`
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.parent_id,
        COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.transaction_date <= ?
      WHERE coa.is_active = 1
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.parent_id
      ORDER BY coa.account_code
    `).bind(asOfDate).all();

    // Get current savings balances
    const savingsBalances = await c.env.DB.prepare(`
      SELECT 
        account_type,
        SUM(balance) as total_balance
      FROM savings_accounts 
      WHERE is_active = 1
      GROUP BY account_type
    `).all();

    // Get current loan balances
    const loanBalances = await c.env.DB.prepare(`
      SELECT SUM(outstanding_balance) as total_outstanding
      FROM loan_accounts 
      WHERE status = 'active'
    `).first();

    // Organize accounts by type
    const assets = accountBalances.results.filter(acc => acc.account_type === 'asset');
    const liabilities = accountBalances.results.filter(acc => acc.account_type === 'liability');
    const equity = accountBalances.results.filter(acc => acc.account_type === 'equity');

    // Calculate totals
    const totalAssets = assets.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalEquity = equity.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

    // Add current savings to equity accounts
    const savingsEquity = savingsBalances.results.reduce((sum, savings) => sum + parseFloat(savings.total_balance), 0);
    
    // Add current loans to assets (piutang)
    const loanAssets = parseFloat(loanBalances?.total_outstanding || 0);

    return c.json({
      balanceSheet: {
        asOfDate,
        assets: {
          accounts: assets,
          currentSavings: savingsEquity,
          currentLoans: loanAssets,
          total: totalAssets + loanAssets
        },
        liabilities: {
          accounts: liabilities,
          total: totalLiabilities + savingsEquity
        },
        equity: {
          accounts: equity,
          total: totalEquity
        },
        totals: {
          assets: totalAssets + loanAssets,
          liabilitiesAndEquity: totalLiabilities + totalEquity + savingsEquity
        }
      }
    });

  } catch (error) {
    console.error('Balance sheet error:', error);
    return c.json({ error: 'Failed to generate balance sheet' }, 500);
  }
});

// Generate Income Statement (Laporan Laba Rugi)
reports.get('/income-statement', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];

    // Get revenue and expense accounts with balances for the period
    const accountBalances = await c.env.DB.prepare(`
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        SUM(CASE WHEN coa.account_type = 'revenue' THEN gl.credit_amount - gl.debit_amount
                 WHEN coa.account_type = 'expense' THEN gl.debit_amount - gl.credit_amount
                 ELSE 0 END) as balance
      FROM chart_of_accounts coa
      LEFT JOIN general_ledger gl ON coa.id = gl.account_id 
        AND gl.transaction_date BETWEEN ? AND ?
      WHERE coa.account_type IN ('revenue', 'expense') AND coa.is_active = 1
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
      HAVING balance != 0
      ORDER BY coa.account_code
    `).bind(startDate, endDate).all();

    // Calculate interest income from loans
    const loanInterestIncome = await c.env.DB.prepare(`
      SELECT SUM(interest_amount) as total_interest
      FROM loan_transactions 
      WHERE transaction_type = 'payment' 
        AND payment_date BETWEEN ? AND ?
    `).bind(startDate, endDate).first();

    // Calculate interest expense on savings
    const savingsInterestExpense = await c.env.DB.prepare(`
      SELECT 
        SUM(sa.balance * sa.interest_rate / 12) as monthly_interest
      FROM savings_accounts sa
      WHERE sa.account_type IN ('wajib', 'sukarela') AND sa.is_active = 1
    `).first();

    const revenues = accountBalances.results.filter(acc => acc.account_type === 'revenue');
    const expenses = accountBalances.results.filter(acc => acc.account_type === 'expense');

    // Add calculated interest
    const totalLoanInterest = parseFloat(loanInterestIncome?.total_interest || 0);
    const totalSavingsInterest = parseFloat(savingsInterestExpense?.monthly_interest || 0) * 
      (new Date(endDate).getMonth() - new Date(startDate).getMonth() + 1);

    const totalRevenue = revenues.reduce((sum, acc) => sum + parseFloat(acc.balance), 0) + totalLoanInterest;
    const totalExpense = expenses.reduce((sum, acc) => sum + parseFloat(acc.balance), 0) + totalSavingsInterest;
    const netIncome = totalRevenue - totalExpense;

    return c.json({
      incomeStatement: {
        period: { startDate, endDate },
        revenue: {
          accounts: revenues,
          loanInterest: totalLoanInterest,
          total: totalRevenue
        },
        expenses: {
          accounts: expenses,
          savingsInterest: totalSavingsInterest,
          total: totalExpense
        },
        netIncome,
        shu: Math.max(0, netIncome) // SHU is positive net income
      }
    });

  } catch (error) {
    console.error('Income statement error:', error);
    return c.json({ error: 'Failed to generate income statement' }, 500);
  }
});

// Calculate SHU (Sisa Hasil Usaha)
reports.post('/calculate-shu', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const body = await c.req.json();
    const data = shuCalculationSchema.parse(body);

    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Get financial period
    const period = await c.env.DB.prepare(
      'SELECT * FROM financial_periods WHERE id = ?'
    ).bind(data.periodId).first();

    if (!period) {
      return c.json({ error: 'Financial period not found' }, 404);
    }

    // Get net income for the period (SHU to distribute)
    const incomeData = await c.env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN coa.account_type = 'revenue' THEN gl.credit_amount - gl.debit_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN coa.account_type = 'expense' THEN gl.debit_amount - gl.credit_amount ELSE 0 END) as total_expense
      FROM general_ledger gl
      JOIN chart_of_accounts coa ON gl.account_id = coa.id
      WHERE gl.transaction_date BETWEEN ? AND ?
        AND coa.account_type IN ('revenue', 'expense')
    `).bind(period.start_date, period.end_date).first();

    const netIncome = (incomeData.total_revenue || 0) - (incomeData.total_expense || 0);
    const shuToDistribute = Math.max(0, netIncome);

    if (shuToDistribute <= 0) {
      return c.json({ error: 'No SHU to distribute (net income is not positive)' }, 400);
    }

    // Get member participation data
    const memberParticipation = await c.env.DB.prepare(`
      SELECT 
        m.id as member_id,
        m.full_name,
        m.member_number,
        COALESCE(SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE 0 END), 0) as savings_participation,
        COALESCE(SUM(CASE WHEN lt.transaction_type = 'payment' AND lt.interest_amount > 0 THEN lt.interest_amount ELSE 0 END), 0) as loan_participation
      FROM members m
      LEFT JOIN savings_accounts sa ON m.id = sa.member_id
      LEFT JOIN savings_transactions st ON sa.id = st.savings_account_id 
        AND st.transaction_date BETWEEN ? AND ?
      LEFT JOIN loan_accounts la ON m.id = la.member_id
      LEFT JOIN loan_transactions lt ON la.id = lt.loan_account_id 
        AND lt.payment_date BETWEEN ? AND ?
      WHERE m.status = 'active'
      GROUP BY m.id, m.full_name, m.member_number
      HAVING savings_participation > 0 OR loan_participation > 0
    `).bind(period.start_date, period.end_date, period.start_date, period.end_date).all();

    // Calculate total participation
    const totalSavingsParticipation = memberParticipation.results.reduce(
      (sum, member) => sum + parseFloat(member.savings_participation), 0
    );
    const totalLoanParticipation = memberParticipation.results.reduce(
      (sum, member) => sum + parseFloat(member.loan_participation), 0
    );

    // Calculate SHU allocation
    const shuFromSavings = shuToDistribute * (data.savingsPercentage / 100);
    const shuFromLoans = shuToDistribute * (data.loanPercentage / 100);

    // Calculate individual SHU
    const shuCalculations = memberParticipation.results.map(member => {
      const savingsRatio = totalSavingsParticipation > 0 ? 
        parseFloat(member.savings_participation) / totalSavingsParticipation : 0;
      const loanRatio = totalLoanParticipation > 0 ? 
        parseFloat(member.loan_participation) / totalLoanParticipation : 0;

      const shuSavings = shuFromSavings * savingsRatio;
      const shuLoan = shuFromLoans * loanRatio;
      const totalShu = shuSavings + shuLoan;

      return {
        memberId: member.member_id,
        memberName: member.full_name,
        memberNumber: member.member_number,
        savingsParticipation: parseFloat(member.savings_participation),
        loanParticipation: parseFloat(member.loan_participation),
        shuSavings: Math.round(shuSavings),
        shuLoan: Math.round(shuLoan),
        totalShu: Math.round(totalShu)
      };
    });

    // Save calculations to database
    for (const calc of shuCalculations) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO shu_calculations (
          period_id, member_id, savings_participation, loan_participation,
          shu_savings, shu_loan, total_shu, is_distributed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).bind(
        data.periodId,
        calc.memberId,
        calc.savingsParticipation,
        calc.loanParticipation,
        calc.shuSavings,
        calc.shuLoan,
        calc.totalShu
      ).run();
    }

    return c.json({
      message: 'SHU calculated successfully',
      period: {
        id: period.id,
        name: period.period_name,
        startDate: period.start_date,
        endDate: period.end_date
      },
      summary: {
        netIncome,
        shuToDistribute,
        savingsPercentage: data.savingsPercentage,
        loanPercentage: data.loanPercentage,
        shuFromSavings,
        shuFromLoans,
        totalMembers: shuCalculations.length,
        totalDistributed: shuCalculations.reduce((sum, calc) => sum + calc.totalShu, 0)
      },
      calculations: shuCalculations
    });

  } catch (error) {
    console.error('SHU calculation error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to calculate SHU' }, 500);
  }
});

// Get SHU report
reports.get('/shu/:periodId', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const periodId = c.req.param('periodId');

    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Get period info
    const period = await c.env.DB.prepare(
      'SELECT * FROM financial_periods WHERE id = ?'
    ).bind(periodId).first();

    if (!period) {
      return c.json({ error: 'Financial period not found' }, 404);
    }

    // Get SHU calculations
    const shuData = await c.env.DB.prepare(`
      SELECT 
        sc.*,
        m.full_name,
        m.member_number
      FROM shu_calculations sc
      JOIN members m ON sc.member_id = m.id
      WHERE sc.period_id = ?
      ORDER BY sc.total_shu DESC
    `).bind(periodId).all();

    // Get summary
    const summary = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_members,
        SUM(savings_participation) as total_savings_participation,
        SUM(loan_participation) as total_loan_participation,
        SUM(shu_savings) as total_shu_savings,
        SUM(shu_loan) as total_shu_loan,
        SUM(total_shu) as total_shu_distributed
      FROM shu_calculations
      WHERE period_id = ?
    `).bind(periodId).first();

    return c.json({
      period,
      summary,
      calculations: shuData.results
    });

  } catch (error) {
    console.error('Get SHU report error:', error);
    return c.json({ error: 'Failed to get SHU report' }, 500);
  }
});

// Get general ledger report
reports.get('/general-ledger', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    const accountCode = c.req.query('account_code') || '';
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE gl.transaction_date BETWEEN ? AND ?';
    let params = [startDate, endDate];

    if (accountCode) {
      whereClause += ' AND coa.account_code = ?';
      params.push(accountCode);
    }

    const ledgerEntries = await c.env.DB.prepare(`
      SELECT 
        gl.*,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        u.username as created_by_name
      FROM general_ledger gl
      JOIN chart_of_accounts coa ON gl.account_id = coa.id
      LEFT JOIN users u ON gl.created_by = u.id
      ${whereClause}
      ORDER BY gl.transaction_date DESC, gl.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM general_ledger gl
      JOIN chart_of_accounts coa ON gl.account_id = coa.id
      ${whereClause}
    `).bind(...params).first();

    // Calculate running balances by account
    const balanceSummary = await c.env.DB.prepare(`
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        SUM(gl.debit_amount) as total_debit,
        SUM(gl.credit_amount) as total_credit,
        SUM(gl.debit_amount - gl.credit_amount) as balance
      FROM general_ledger gl
      JOIN chart_of_accounts coa ON gl.account_id = coa.id
      ${whereClause}
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
      ORDER BY coa.account_code
    `).bind(...params).all();

    return c.json({
      period: { startDate, endDate },
      entries: ledgerEntries.results,
      balanceSummary: balanceSummary.results,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('General ledger report error:', error);
    return c.json({ error: 'Failed to generate general ledger report' }, 500);
  }
});

// Get financial periods
reports.get('/periods', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const periods = await c.env.DB.prepare(`
      SELECT * FROM financial_periods 
      ORDER BY start_date DESC
    `).all();

    return c.json({ periods: periods.results });

  } catch (error) {
    console.error('Get financial periods error:', error);
    return c.json({ error: 'Failed to get financial periods' }, 500);
  }
});

// Create financial period
reports.post('/periods', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const body = await c.req.json();
    const data = reportPeriodSchema.parse(body);

    if (payload.role !== 'admin') {
      return c.json({ error: 'Only admin can create financial periods' }, 403);
    }

    const periodName = body.periodName || `Periode ${data.startDate} - ${data.endDate}`;

    await c.env.DB.prepare(`
      INSERT INTO financial_periods (period_name, start_date, end_date)
      VALUES (?, ?, ?)
    `).bind(periodName, data.startDate, data.endDate).run();
    
    const result = await getLastInsertId(c.env.DB);

    return c.json({
      message: 'Financial period created successfully',
      periodId: result.id,
      period: {
        id: result.id,
        name: periodName,
        startDate: data.startDate,
        endDate: data.endDate
      }
    }, 201);

  } catch (error) {
    console.error('Create financial period error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to create financial period' }, 500);
  }
});

export { reports as reportRoutes };
