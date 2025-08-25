import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API functions
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: any) =>
    api.post('/auth/register', data),
  getProfile: () =>
    api.get('/auth/profile'),
}

export const membersAPI = {
  getAll: (params?: any) =>
    api.get('/members', { params }),
  getById: (id: number) =>
    api.get(`/members/${id}`),
  update: (id: number, data: any) =>
    api.put(`/members/${id}`, data),
  getStats: () =>
    api.get('/members/stats/overview'),
}

export const savingsAPI = {
  getAccounts: (memberId: number) =>
    api.get(`/savings/accounts/${memberId}`),
  getTransactions: (accountId: number, params?: any) =>
    api.get(`/savings/accounts/${accountId}/transactions`, { params }),
  processTransaction: (data: any) =>
    api.post('/savings/transactions', data),
  getSummary: () =>
    api.get('/savings/summary'),
}

export const loansAPI = {
  apply: (data: any) =>
    api.post('/loans/apply', data),
  getApplications: (params?: any) =>
    api.get('/loans/applications', { params }),
  approve: (id: number, data: any) =>
    api.put(`/loans/applications/${id}/approve`, data),
  disburse: (id: number) =>
    api.post(`/loans/${id}/disburse`),
  processPayment: (data: any) =>
    api.post('/loans/payments', data),
  getMemberLoans: (memberId: number) =>
    api.get(`/loans/member/${memberId}`),
  getTransactions: (loanId: number) =>
    api.get(`/loans/${loanId}/transactions`),
}

export const transactionsAPI = {
  getAll: (params?: any) =>
    api.get('/transactions', { params }),
  createBusiness: (data: any) =>
    api.post('/transactions/business', data),
  getSummary: (params?: any) =>
    api.get('/transactions/summary', { params }),
}

export const reportsAPI = {
  getBalanceSheet: (params?: any) =>
    api.get('/reports/balance-sheet', { params }),
  getIncomeStatement: (params?: any) =>
    api.get('/reports/income-statement', { params }),
  calculateSHU: (data: any) =>
    api.post('/reports/calculate-shu', data),
  getSHU: (periodId: number) =>
    api.get(`/reports/shu/${periodId}`),
  getGeneralLedger: (params?: any) =>
    api.get('/reports/general-ledger', { params }),
  getPeriods: () =>
    api.get('/reports/periods'),
  createPeriod: (data: any) =>
    api.post('/reports/periods', data),
}

export const dashboardAPI = {
  getOverview: () =>
    api.get('/dashboard/overview'),
  getMemberDashboard: () =>
    api.get('/dashboard/member'),
  getCharts: () =>
    api.get('/dashboard/charts'),
}
