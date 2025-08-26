import { Hono } from 'hono';

const dashboard = new Hono();

// Get dashboard overview
dashboard.get('/overview', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Member statistics
    const memberStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members,
        COUNT(CASE WHEN join_date >= date('now', '-30 days') THEN 1 END) as new_members_30_days,
        COUNT(CASE WHEN join_date >= date('now', '-7 days') THEN 1 END) as new_members_7_days
      FROM members
    `).first();

    // Savings statistics
    const savingsStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_accounts,
        SUM(balance) as total_balance,
        SUM(CASE WHEN account_type = 'pokok' THEN balance ELSE 0 END) as simpanan_pokok,
        SUM(CASE WHEN account_type = 'wajib' THEN balance ELSE 0 END) as simpanan_wajib,
        SUM(CASE WHEN account_type = 'sukarela' THEN balance ELSE 0 END) as simpanan_sukarela
      FROM savings_accounts 
      WHERE is_active = 1
    `).first();

    // Loan statistics
    const loanStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
        SUM(CASE WHEN status = 'active' THEN outstanding_balance ELSE 0 END) as total_outstanding,
        SUM(CASE WHEN status = 'active' THEN principal_amount ELSE 0 END) as total_principal_active
      FROM loan_accounts
    `).first();

    // Recent transactions (last 7 days)
    const recentTransactions = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount
      FROM (
        SELECT amount, transaction_date FROM savings_transactions WHERE transaction_date >= date('now', '-7 days')
        UNION ALL
        SELECT amount, payment_date as transaction_date FROM loan_transactions WHERE payment_date >= date('now', '-7 days')
        UNION ALL
        SELECT amount, transaction_date FROM business_transactions WHERE transaction_date >= date('now', '-7 days')
      )
    `).first();

    // Cash flow (this month)
    const cashFlow = await c.env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN gl.debit_amount > 0 AND coa.account_code = '1101' THEN gl.debit_amount ELSE 0 END) as cash_in,
        SUM(CASE WHEN gl.credit_amount > 0 AND coa.account_code = '1101' THEN gl.credit_amount ELSE 0 END) as cash_out
      FROM general_ledger gl
      JOIN chart_of_accounts coa ON gl.account_id = coa.id
      WHERE gl.transaction_date >= date('now', 'start of month')
        AND coa.account_code = '1101'
    `).first();

    // Monthly growth trends (last 6 months)
    const monthlyTrends = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(members) as new_members,
        SUM(savings) as savings_growth,
        SUM(loans) as loans_disbursed
      FROM (
        SELECT 
          join_date as date,
          1 as members,
          0 as savings,
          0 as loans
        FROM members 
        WHERE join_date >= date('now', '-6 months')
        
        UNION ALL
        
        SELECT 
          transaction_date as date,
          0 as members,
          CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END as savings,
          0 as loans
        FROM savings_transactions 
        WHERE transaction_date >= date('now', '-6 months')
        
        UNION ALL
        
        SELECT 
          disbursement_date as date,
          0 as members,
          0 as savings,
          CASE WHEN transaction_type = 'disbursement' THEN amount ELSE 0 END as loans
        FROM loan_transactions lt
        JOIN loan_accounts la ON lt.loan_account_id = la.id
        WHERE disbursement_date >= date('now', '-6 months')
      )
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
      LIMIT 6
    `).all();

    // Top performing members (by total savings)
    const topMembers = await c.env.DB.prepare(`
      SELECT 
        m.full_name,
        m.member_number,
        SUM(sa.balance) as total_savings,
        COUNT(la.id) as total_loans
      FROM members m
      LEFT JOIN savings_accounts sa ON m.id = sa.member_id AND sa.is_active = 1
      LEFT JOIN loan_accounts la ON m.id = la.member_id AND la.status = 'active'
      WHERE m.status = 'active'
      GROUP BY m.id, m.full_name, m.member_number
      ORDER BY total_savings DESC
      LIMIT 10
    `).all();

    // Loan portfolio analysis
    const loanPortfolio = await c.env.DB.prepare(`
      SELECT 
        loan_type,
        COUNT(*) as count,
        SUM(outstanding_balance) as total_outstanding,
        AVG(outstanding_balance) as avg_outstanding,
        SUM(principal_amount) as total_principal
      FROM loan_accounts 
      WHERE status = 'active'
      GROUP BY loan_type
    `).all();

    return c.json({
      members: memberStats,
      savings: savingsStats,
      loans: loanStats,
      recentActivity: recentTransactions,
      cashFlow: {
        cashIn: parseFloat(cashFlow?.cash_in || 0),
        cashOut: parseFloat(cashFlow?.cash_out || 0),
        netFlow: parseFloat(cashFlow?.cash_in || 0) - parseFloat(cashFlow?.cash_out || 0)
      },
      monthlyTrends: monthlyTrends.results.reverse(), // Show oldest to newest
      topMembers: topMembers.results,
      loanPortfolio: loanPortfolio.results
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    return c.json({ error: 'Failed to get dashboard overview' }, 500);
  }
});

// Get member dashboard (for regular members)
dashboard.get('/member', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    // Get member info
    const member = await c.env.DB.prepare(
      'SELECT * FROM members WHERE user_id = ?'
    ).bind(payload.userId).first();

    if (!member) {
      return c.json({ error: 'Member not found' }, 404);
    }

    // Get savings accounts
    const savingsAccounts = await c.env.DB.prepare(`
      SELECT * FROM savings_accounts 
      WHERE member_id = ? AND is_active = 1
      ORDER BY account_type
    `).bind(member.id).all();

    // Get active loans
    const activeLoans = await c.env.DB.prepare(`
      SELECT * FROM loan_accounts 
      WHERE member_id = ? AND status IN ('pending', 'approved', 'active')
      ORDER BY created_at DESC
    `).bind(member.id).all();

    // Get recent transactions (last 10)
    const recentSavingsTransactions = await c.env.DB.prepare(`
      SELECT 
        st.*,
        sa.account_type,
        sa.account_number
      FROM savings_transactions st
      JOIN savings_accounts sa ON st.savings_account_id = sa.id
      WHERE sa.member_id = ?
      ORDER BY st.transaction_date DESC, st.created_at DESC
      LIMIT 10
    `).bind(member.id).all();

    const recentLoanTransactions = await c.env.DB.prepare(`
      SELECT 
        lt.*,
        la.loan_number,
        la.loan_type
      FROM loan_transactions lt
      JOIN loan_accounts la ON lt.loan_account_id = la.id
      WHERE la.member_id = ?
      ORDER BY lt.payment_date DESC, lt.created_at DESC
      LIMIT 10
    `).bind(member.id).all();

    // Calculate totals
    const totalSavings = savingsAccounts.results.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalLoans = activeLoans.results.reduce((sum, loan) => sum + parseFloat(loan.outstanding_balance || 0), 0);

    // Get SHU history
    const shuHistory = await c.env.DB.prepare(`
      SELECT 
        sc.*,
        fp.period_name,
        fp.start_date,
        fp.end_date
      FROM shu_calculations sc
      JOIN financial_periods fp ON sc.period_id = fp.id
      WHERE sc.member_id = ?
      ORDER BY fp.end_date DESC
      LIMIT 5
    `).bind(member.id).all();

    return c.json({
      member: {
        id: member.id,
        memberNumber: member.member_number,
        fullName: member.full_name,
        joinDate: member.join_date,
        status: member.status
      },
      summary: {
        totalSavings,
        totalLoans,
        savingsAccounts: savingsAccounts.results.length,
        activeLoans: activeLoans.results.filter(loan => loan.status === 'active').length,
        pendingApplications: activeLoans.results.filter(loan => loan.status === 'pending').length
      },
      savingsAccounts: savingsAccounts.results,
      activeLoans: activeLoans.results,
      recentTransactions: {
        savings: recentSavingsTransactions.results,
        loans: recentLoanTransactions.results
      },
      shuHistory: shuHistory.results
    });

  } catch (error) {
    console.error('Member dashboard error:', error);
    return c.json({ error: 'Failed to get member dashboard' }, 500);
  }
});

// Get financial summary for charts
dashboard.get('/charts', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Monthly savings growth (last 12 months)
    const savingsGrowth = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE -amount END) as net_savings
      FROM savings_transactions 
      WHERE transaction_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month
    `).all();

    // Loan disbursement trends (last 12 months)
    const loanTrends = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', disbursement_date) as month,
        COUNT(*) as loan_count,
        SUM(principal_amount) as total_amount
      FROM loan_accounts 
      WHERE disbursement_date >= date('now', '-12 months')
        AND status IN ('active', 'completed')
      GROUP BY strftime('%Y-%m', disbursement_date)
      ORDER BY month
    `).all();

    // Member growth (last 12 months)
    const memberGrowth = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', join_date) as month,
        COUNT(*) as new_members
      FROM members 
      WHERE join_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', join_date)
      ORDER BY month
    `).all();

    // Savings distribution by type
    const savingsDistribution = await c.env.DB.prepare(`
      SELECT 
        account_type,
        COUNT(*) as account_count,
        SUM(balance) as total_balance
      FROM savings_accounts 
      WHERE is_active = 1
      GROUP BY account_type
    `).all();

    // Loan distribution by type
    const loanDistribution = await c.env.DB.prepare(`
      SELECT 
        loan_type,
        COUNT(*) as loan_count,
        SUM(outstanding_balance) as total_outstanding
      FROM loan_accounts 
      WHERE status = 'active'
      GROUP BY loan_type
    `).all();

    return c.json({
      savingsGrowth: savingsGrowth.results,
      loanTrends: loanTrends.results,
      memberGrowth: memberGrowth.results,
      savingsDistribution: savingsDistribution.results,
      loanDistribution: loanDistribution.results
    });

  } catch (error) {
    console.error('Dashboard charts error:', error);
    return c.json({ error: 'Failed to get chart data' }, 500);
  }
});

export { dashboard as dashboardRoutes };
