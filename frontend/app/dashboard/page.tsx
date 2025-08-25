'use client'

import { useQuery } from 'react-query'
import { dashboardAPI } from '@/lib/api'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  Users,
  PiggyBank,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Calendar
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

function StatCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color = 'primary' 
}: {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease'
  icon: any
  color?: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
  }

  return (
    <div className="card">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="flex items-center mt-1">
              {changeType === 'increase' ? (
                <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-danger-500 mr-1" />
              )}
              <span className={`text-sm ${
                changeType === 'increase' ? 'text-success-600' : 'text-danger-600'
              }`}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { data: overview, isLoading: overviewLoading } = useQuery(
    'dashboard-overview',
    dashboardAPI.getOverview
  )

  const { data: charts, isLoading: chartsLoading } = useQuery(
    'dashboard-charts',
    dashboardAPI.getCharts
  )

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const stats = overview?.data

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Ringkasan aktivitas koperasi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Anggota"
          value={formatNumber(stats?.members?.total_members || 0)}
          change={`+${stats?.members?.new_members_30_days || 0} bulan ini`}
          changeType="increase"
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Total Simpanan"
          value={formatCurrency(stats?.savings?.total_balance || 0)}
          icon={PiggyBank}
          color="success"
        />
        <StatCard
          title="Pinjaman Aktif"
          value={formatNumber(stats?.loans?.active_loans || 0)}
          icon={CreditCard}
          color="warning"
        />
        <StatCard
          title="Saldo Outstanding"
          value={formatCurrency(stats?.loans?.total_outstanding || 0)}
          icon={DollarSign}
          color="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Arus Kas Bulan Ini</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success-50 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-success-600 mr-2" />
                <span className="text-sm font-medium text-success-800">Kas Masuk</span>
              </div>
              <span className="text-lg font-bold text-success-800">
                {formatCurrency(stats?.cashFlow?.cashIn || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-danger-50 rounded-lg">
              <div className="flex items-center">
                <TrendingDown className="w-5 h-5 text-danger-600 mr-2" />
                <span className="text-sm font-medium text-danger-800">Kas Keluar</span>
              </div>
              <span className="text-lg font-bold text-danger-800">
                {formatCurrency(stats?.cashFlow?.cashOut || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
              <div className="flex items-center">
                <Activity className="w-5 h-5 text-primary-600 mr-2" />
                <span className="text-sm font-medium text-primary-800">Arus Kas Bersih</span>
              </div>
              <span className="text-lg font-bold text-primary-800">
                {formatCurrency(stats?.cashFlow?.netFlow || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Savings Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Simpanan</h3>
          {!chartsLoading && charts?.data?.savingsDistribution ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={charts.data.savingsDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ account_type, percent }) => 
                    `${account_type} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_balance"
                >
                  {charts.data.savingsDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Growth Trends */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Pertumbuhan (12 Bulan Terakhir)</h3>
        {!chartsLoading && charts?.data ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={charts.data.memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="new_members" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Anggota Baru"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      {/* Recent Activity & Top Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terkini</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {formatNumber(stats?.recentActivity?.transaction_count || 0)} transaksi
                </p>
                <p className="text-xs text-gray-500">7 hari terakhir</p>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(stats?.recentActivity?.total_amount || 0)}
              </span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Users className="w-5 h-5 text-gray-400 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {formatNumber(stats?.members?.new_members_7_days || 0)} anggota baru
                </p>
                <p className="text-xs text-gray-500">7 hari terakhir</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Members */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Anggota Teratas</h3>
          <div className="space-y-3">
            {stats?.topMembers?.slice(0, 5).map((member: any, index: number) => (
              <div key={member.member_number} className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-primary-600">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.full_name}
                  </p>
                  <p className="text-xs text-gray-500">{member.member_number}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(member.total_savings)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}
