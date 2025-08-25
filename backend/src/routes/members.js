import { Hono } from 'hono';
import { z } from 'zod';

const members = new Hono();

// Validation schemas
const updateMemberSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['L', 'P']).optional(),
  occupation: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

// Get all members (admin/manager only)
members.get('/', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';
    const status = c.req.query('status') || '';
    
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (m.full_name LIKE ? OR m.member_number LIKE ? OR m.id_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND m.status = ?';
      params.push(status);
    }

    const membersQuery = `
      SELECT m.*, u.username, u.email, u.role,
             (SELECT SUM(balance) FROM savings_accounts WHERE member_id = m.id) as total_savings,
             (SELECT SUM(outstanding_balance) FROM loan_accounts WHERE member_id = m.id AND status = 'active') as total_loans
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM members m
      ${whereClause}
    `;

    const membersList = await c.env.DB.prepare(membersQuery)
      .bind(...params, limit, offset)
      .all();

    const totalResult = await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first();

    return c.json({
      members: membersList.results,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get members error:', error);
    return c.json({ error: 'Failed to get members' }, 500);
  }
});

// Get member statistics (admin/manager only) - MOVED BEFORE /:id route
members.get('/stats/overview', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    if (!['admin', 'manager'].includes(payload.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_members,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_members,
        COUNT(CASE WHEN join_date >= date('now', '-30 days') THEN 1 END) as new_members_30_days
      FROM members
    `).first();

    const savingsStats = await c.env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN account_type = 'pokok' THEN balance ELSE 0 END) as total_simpanan_pokok,
        SUM(CASE WHEN account_type = 'wajib' THEN balance ELSE 0 END) as total_simpanan_wajib,
        SUM(CASE WHEN account_type = 'sukarela' THEN balance ELSE 0 END) as total_simpanan_sukarela,
        SUM(balance) as total_savings
      FROM savings_accounts
    `).first();

    const loanStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        SUM(CASE WHEN status = 'active' THEN outstanding_balance ELSE 0 END) as total_outstanding
      FROM loan_accounts
    `).first();

    return c.json({
      members: stats,
      savings: savingsStats,
      loans: loanStats
    });

  } catch (error) {
    console.error('Get member stats error:', error);
    return c.json({ error: 'Failed to get statistics' }, 500);
  }
});

// Get member by ID
members.get('/:id', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const memberId = c.req.param('id');

    // Members can only view their own profile, admin/manager can view any
    if (payload.role === 'member') {
      const userMember = await c.env.DB.prepare(
        'SELECT id FROM members WHERE user_id = ?'
      ).bind(payload.userId).first();

      if (!userMember || userMember.id != memberId) {
        return c.json({ error: 'Access denied' }, 403);
      }
    }

    const member = await c.env.DB.prepare(`
      SELECT m.*, u.username, u.email, u.role,
             (SELECT SUM(balance) FROM savings_accounts WHERE member_id = m.id) as total_savings,
             (SELECT SUM(outstanding_balance) FROM loan_accounts WHERE member_id = m.id AND status = 'active') as total_loans,
             (SELECT COUNT(*) FROM loan_accounts WHERE member_id = m.id) as total_loan_accounts
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).bind(memberId).first();

    if (!member) {
      return c.json({ error: 'Member not found' }, 404);
    }

    // Get savings accounts
    const savingsAccounts = await c.env.DB.prepare(
      'SELECT * FROM savings_accounts WHERE member_id = ? ORDER BY account_type'
    ).bind(memberId).all();

    // Get active loans
    const activeLoans = await c.env.DB.prepare(
      'SELECT * FROM loan_accounts WHERE member_id = ? AND status IN ("active", "approved") ORDER BY created_at DESC'
    ).bind(memberId).all();

    return c.json({
      member,
      savingsAccounts: savingsAccounts.results,
      activeLoans: activeLoans.results
    });

  } catch (error) {
    console.error('Get member error:', error);
    return c.json({ error: 'Failed to get member' }, 500);
  }
});

// Update member
members.put('/:id', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const memberId = c.req.param('id');
    const body = await c.req.json();
    const data = updateMemberSchema.parse(body);

    // Members can only update their own profile, admin/manager can update any
    if (payload.role === 'member') {
      const userMember = await c.env.DB.prepare(
        'SELECT id FROM members WHERE user_id = ?'
      ).bind(payload.userId).first();

      if (!userMember || userMember.id != memberId) {
        return c.json({ error: 'Access denied' }, 403);
      }

      // Members cannot change their status
      delete data.status;
    }

    const updateFields = [];
    const updateValues = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key === 'fullName' ? 'full_name' : 
                       key === 'dateOfBirth' ? 'date_of_birth' : key;
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updateValues.push(memberId);

    await c.env.DB.prepare(
      `UPDATE members SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(...updateValues).run();

    return c.json({ message: 'Member updated successfully' });

  } catch (error) {
    console.error('Update member error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to update member' }, 500);
  }
});


export { members as memberRoutes };
