import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Helper function for getting last insert ID
async function getLastInsertId(db) {
  const result = await db.prepare('SELECT last_insert_rowid() as id').first();
  return result;
}

const auth = new Hono();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  idNumber: z.string().min(16).max(16),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['L', 'P']).optional(),
  occupation: z.string().optional(),
});

// Login endpoint
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = loginSchema.parse(body);

    // Get user from database
    const user = await c.env.DB.prepare(
      'SELECT u.*, m.full_name, m.member_number FROM users u LEFT JOIN members m ON u.id = m.user_id WHERE u.username = ? AND u.is_active = 1'
    ).bind(username).first();

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        memberNumber: user.member_number 
      },
      c.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return c.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        memberNumber: user.member_number,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Register new member
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const data = registerSchema.parse(body);

    // Check if username or email already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(data.username, data.email).first();

    if (existingUser) {
      return c.json({ error: 'Username or email already exists' }, 409);
    }

    // Check if ID number already exists
    const existingMember = await c.env.DB.prepare(
      'SELECT id FROM members WHERE id_number = ?'
    ).bind(data.idNumber).first();

    if (existingMember) {
      return c.json({ error: 'ID number already registered' }, 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Generate unique member number with retry logic
    let memberNumber;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const memberCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM members'
      ).first();
      memberNumber = `KOP${String(memberCount.count + 1 + attempts).padStart(3, '0')}`;
      
      // Check if member number already exists
      const existing = await c.env.DB.prepare(
        'SELECT id FROM members WHERE member_number = ?'
      ).bind(memberNumber).first();
      
      if (!existing) {
        break;
      }
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      return c.json({ error: 'Unable to generate unique member number' }, 500);
    }

    // Start transaction - use D1 compatible pattern with transaction
    try {
      await c.env.DB.prepare('BEGIN TRANSACTION').run();
      
      await c.env.DB.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).bind(data.username, data.email, passwordHash, 'member').run();
      
      const userId = await getLastInsertId(c.env.DB);

      await c.env.DB.prepare(
        `INSERT INTO members (user_id, member_number, full_name, id_number, phone, address, date_of_birth, gender, occupation, join_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`
      ).bind(
        userId.id,
        memberNumber,
        data.fullName,
        data.idNumber,
        data.phone || null,
        data.address || null,
        data.dateOfBirth || null,
        data.gender || null,
        data.occupation || null
      ).run();
      
      const memberId = await getLastInsertId(c.env.DB);

      // Create default savings accounts
      const savingsTypes = [
        { type: 'pokok', amount: 100000, rate: 0.0000 },
        { type: 'wajib', amount: 0, rate: 0.0200 },
        { type: 'sukarela', amount: 0, rate: 0.0300 }
      ];

      for (const savings of savingsTypes) {
        const accountNumber = `S${savings.type.charAt(0).toUpperCase()}${memberNumber.slice(3)}`;
        await c.env.DB.prepare(
          'INSERT INTO savings_accounts (member_id, account_type, account_number, balance, interest_rate) VALUES (?, ?, ?, ?, ?)'
        ).bind(memberId.id, savings.type, accountNumber, savings.amount, savings.rate).run();
      }
      
      await c.env.DB.prepare('COMMIT').run();

      return c.json({
        message: 'Registration successful',
        memberNumber,
        user: {
          id: userId.id,
          username: data.username,
          email: data.email,
          role: 'member',
          fullName: data.fullName,
          memberNumber,
        }
      }, 201);
      
    } catch (dbError) {
      await c.env.DB.prepare('ROLLBACK').run();
      throw dbError;
    }

  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.errors }, 400);
    }
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Get current user profile
auth.get('/profile', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    const user = await c.env.DB.prepare(
      `SELECT u.id, u.username, u.email, u.role, u.created_at,
              m.member_number, m.full_name, m.id_number, m.phone, m.address, 
              m.date_of_birth, m.gender, m.occupation, m.join_date, m.status
       FROM users u 
       LEFT JOIN members m ON u.id = m.user_id 
       WHERE u.id = ?`
    ).bind(payload.userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });

  } catch (error) {
    console.error('Profile error:', error);
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

export { auth as authRoutes };
