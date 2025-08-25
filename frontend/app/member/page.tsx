'use client'

import { useQuery } from 'react-query'
import { dashboardAPI } from '@/lib/api'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { formatCurrency, formatDate, getAccountTypeLabel, getStatusBadge } from '@/lib/utils'
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Calendar,
  Award,
  History,
  Plus,
  Eye
} from 'lucide-react'
import Link from 'next/link'

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'primary',
  href
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  color?: 'primary' | 'success' | 'warning' | 'danger'
  href?: string
}) {
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
  }

  const CardContent = () => (
    <div className="flex items-center">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="card hover:shadow-md transition-shadow">
        <CardContent />
      </Link>
    )
  }

  return (
    <div className="card">
      <CardContent />
    </div>
  )
}

function MemberDashboardContent() {
  const { data: memberData, isLoading } = useQuery(
    'member-dashboard',
    dashboardAPI.getMemberDashboard
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const data = memberData?.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Selamat datang, {data?.member?.fullName}
          </h1>
          <p className="text-gray-600">
            Anggota {data?.member?.memberNumber} • Bergabung {formatDate(data?.member?.joinDate)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`badge ${getStatusBadge(data?.member?.status).className}`}>
            {getStatusBadge(data?.member?.status).label}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Simpanan"
          value={formatCurrency(data?.summary?.totalSavings || 0)}
          subtitle={`${data?.summary?.savingsAccounts || 0} rekening`}
          icon={Wallet}
          color="success"
          href="/member/savings"
        />
        <StatCard
          title="Pinjaman Aktif"
          value={formatCurrency(data?.summary?.totalLoans || 0)}
          subtitle={`${data?.summary?.activeLoans || 0} pinjaman`}
          icon={CreditCard}
          color="warning"
          href="/member/loans"
        />
        <StatCard
          title="Pengajuan Pending"
          value={data?.summary?.pendingApplications || 0}
          subtitle="Menunggu persetujuan"
          icon={Calendar}
          color="primary"
        />
        <StatCard
          title="SHU Terakhir"
          value={formatCurrency(data?.shuHistory?.[0]?.total_shu || 0)}
          subtitle={data?.shuHistory?.[0]?.period_name || 'Belum ada'}
          icon={Award}
          color="primary"
        />
      </div>

      {/* Savings Accounts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rekening Simpanan</h3>
          <Link href="/member/savings" className="btn-primary btn-sm">
            <Eye className="w-4 h-4 mr-2" />
            Lihat Semua
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.savingsAccounts?.map((account: any) => (
            <div key={account.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  {getAccountTypeLabel(account.account_type)}
                </h4>
                <span className="text-xs text-gray-500">{account.account_number}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(account.balance)}
              </p>
              <p className="text-sm text-gray-500">
                Bunga: {(account.interest_rate * 100).toFixed(2)}% per tahun
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Loans */}
      {data?.activeLoans && data.activeLoans.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pinjaman Aktif</h3>
            <Link href="/member/loans" className="btn-primary btn-sm">
              <Eye className="w-4 h-4 mr-2" />
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-4">
            {data.activeLoans.map((loan: any) => (
              <div key={loan.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{loan.loan_number}</h4>
                    <p className="text-sm text-gray-500">
                      {loan.loan_type} • {loan.term_months} bulan
                    </p>
                  </div>
                  <span className={`badge ${getStatusBadge(loan.status).className}`}>
                    {getStatusBadge(loan.status).label}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Pokok</p>
                    <p className="font-medium">{formatCurrency(loan.principal_amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Sisa</p>
                    <p className="font-medium">{formatCurrency(loan.outstanding_balance)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cicilan</p>
                    <p className="font-medium">{formatCurrency(loan.monthly_payment)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Jatuh Tempo</p>
                    <p className="font-medium">{formatDate(loan.maturity_date)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaksi Simpanan Terkini</h3>
            <Link href="/member/history" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-3">
            {data?.recentTransactions?.savings?.slice(0, 5).map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    transaction.transaction_type === 'deposit' 
                      ? 'bg-success-100 text-success-600' 
                      : 'bg-danger-100 text-danger-600'
                  }`}>
                    {transaction.transaction_type === 'deposit' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4 rotate-180" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.transaction_type === 'deposit' ? 'Setoran' : 'Penarikan'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getAccountTypeLabel(transaction.account_type)} • {formatDate(transaction.transaction_date)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  transaction.transaction_type === 'deposit' 
                    ? 'text-success-600' 
                    : 'text-danger-600'
                }`}>
                  {transaction.transaction_type === 'deposit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
            {(!data?.recentTransactions?.savings || data.recentTransactions.savings.length === 0) && (
              <p className="text-gray-500 text-center py-4">Belum ada transaksi</p>
            )}
          </div>
        </div>

        {/* Loan Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaksi Pinjaman Terkini</h3>
            <Link href="/member/history" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-3">
            {data?.recentTransactions?.loans?.slice(0, 5).map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mr-3">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.transaction_type === 'disbursement' ? 'Pencairan' : 'Pembayaran'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.loan_number} • {formatDate(transaction.payment_date)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
            {(!data?.recentTransactions?.loans || data.recentTransactions.loans.length === 0) && (
              <p className="text-gray-500 text-center py-4">Belum ada transaksi</p>
            )}
          </div>
        </div>
      </div>

      {/* SHU History */}
      {data?.shuHistory && data.shuHistory.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat SHU</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Partisipasi Simpanan</th>
                  <th>Partisipasi Pinjaman</th>
                  <th>SHU Simpanan</th>
                  <th>SHU Pinjaman</th>
                  <th>Total SHU</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.shuHistory.map((shu: any) => (
                  <tr key={shu.id}>
                    <td>
                      <div>
                        <p className="font-medium">{shu.period_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(shu.start_date)} - {formatDate(shu.end_date)}
                        </p>
                      </div>
                    </td>
                    <td>{formatCurrency(shu.savings_participation)}</td>
                    <td>{formatCurrency(shu.loan_participation)}</td>
                    <td>{formatCurrency(shu.shu_savings)}</td>
                    <td>{formatCurrency(shu.shu_loan)}</td>
                    <td className="font-medium">{formatCurrency(shu.total_shu)}</td>
                    <td>
                      <span className={`badge ${shu.is_distributed ? 'badge-success' : 'badge-warning'}`}>
                        {shu.is_distributed ? 'Dibagikan' : 'Belum Dibagikan'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MemberDashboardPage() {
  return (
    <DashboardLayout>
      <MemberDashboardContent />
    </DashboardLayout>
  )
}
