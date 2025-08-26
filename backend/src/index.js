import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { authRoutes } from './routes/auth.js';
import { memberRoutes } from './routes/members.js';
import { savingsRoutes } from './routes/savings.js';
import { loanRoutes } from './routes/loans.js';
import { transactionRoutes } from './routes/transactions.js';
import { reportRoutes } from './routes/reports.js';
import { dashboardRoutes } from './routes/dashboard.js';

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://your-domain.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({ 
    message: 'Koperasi Desa API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Public routes (no authentication required)
app.route('/api/auth', authRoutes);

// Protected routes (authentication required)
app.use('/api/*', jwt({
  secret: (c) => c.env.JWT_SECRET,
}));

// API routes
app.route('/api/members', memberRoutes);
app.route('/api/savings', savingsRoutes);
app.route('/api/loans', loanRoutes);
app.route('/api/transactions', transactionRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/dashboard', dashboardRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ 
    error: 'Internal server error',
    message: err.message 
  }, 500);
});

export default app;
