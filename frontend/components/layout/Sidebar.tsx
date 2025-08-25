'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  Building2,
  LayoutDashboard,
  Users,
  PiggyBank,
  CreditCard,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Wallet,
  History
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const adminMenuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Anggota',
      href: '/dashboard/members',
      icon: Users,
    },
    {
      title: 'Simpanan',
      href: '/dashboard/savings',
      icon: PiggyBank,
    },
    {
      title: 'Pinjaman',
      href: '/dashboard/loans',
      icon: CreditCard,
    },
    {
      title: 'Transaksi',
      href: '/dashboard/transactions',
      icon: Receipt,
    },
    {
      title: 'Laporan',
      href: '/dashboard/reports',
      icon: FileText,
    },
    {
      title: 'Analitik',
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
  ]

  const memberMenuItems = [
    {
      title: 'Dashboard',
      href: '/member',
      icon: LayoutDashboard,
    },
    {
      title: 'Profil',
      href: '/member/profile',
      icon: User,
    },
    {
      title: 'Simpanan',
      href: '/member/savings',
      icon: Wallet,
    },
    {
      title: 'Pinjaman',
      href: '/member/loans',
      icon: CreditCard,
    },
    {
      title: 'Riwayat',
      href: '/member/history',
      icon: History,
    },
  ]

  const menuItems = user?.role === 'member' ? memberMenuItems : adminMenuItems

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          collapsed ? '-translate-x-full' : 'translate-x-0',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Koperasi Desa</h1>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'Administrator' : 
                   user?.role === 'manager' ? 'Manager' : 'Anggota'}
                </p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.memberNumber || user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.title}
                </Link>
              )
            })}
          </nav>

          {/* Settings and Logout */}
          <div className="px-4 py-4 border-t border-gray-200 space-y-1">
            {user?.role !== 'member' && (
              <Link
                href="/dashboard/settings"
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  pathname === '/dashboard/settings'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Settings className="w-5 h-5 mr-3" />
                Pengaturan
              </Link>
            )}
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  )
}
