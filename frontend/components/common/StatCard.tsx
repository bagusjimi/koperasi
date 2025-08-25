import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'primary' | 'success' | 'warning' | 'danger'
  href?: string
  change?: string
  changeType?: 'increase' | 'decrease'
}

const colorClasses = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
}

export function StatCard({ 
  title, 
  value, 
  subtitle,
  change,
  changeType,
  icon: Icon, 
  color = 'primary',
  href
}: StatCardProps) {
  const CardContent = () => (
    <div className="flex items-center">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        {change && (
          <div className="flex items-center mt-1">
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
