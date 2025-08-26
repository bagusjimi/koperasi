import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: id })
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: id })
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'pokok': 'Simpanan Pokok',
    'wajib': 'Simpanan Wajib',
    'sukarela': 'Simpanan Sukarela',
  }
  return labels[type] || type
}

export function getLoanTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'konsumtif': 'Pinjaman Konsumtif',
    'produktif': 'Pinjaman Produktif',
    'darurat': 'Pinjaman Darurat',
  }
  return labels[type] || type
}

export function getStatusBadge(status: string): { label: string; className: string } {
  const statusMap: Record<string, { label: string; className: string }> = {
    'active': { label: 'Aktif', className: 'badge-success' },
    'inactive': { label: 'Tidak Aktif', className: 'badge-gray' },
    'suspended': { label: 'Ditangguhkan', className: 'badge-warning' },
    'pending': { label: 'Menunggu', className: 'badge-warning' },
    'approved': { label: 'Disetujui', className: 'badge-primary' },
    'rejected': { label: 'Ditolak', className: 'badge-danger' },
    'completed': { label: 'Selesai', className: 'badge-success' },
    'defaulted': { label: 'Macet', className: 'badge-danger' },
  }
  return statusMap[status] || { label: status, className: 'badge-gray' }
}

export function calculateLoanPayment(principal: number, rate: number, months: number): number {
  if (rate === 0) return principal / months
  const monthlyRate = rate / 12
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
         (Math.pow(1 + monthlyRate, months) - 1)
}

export function generateAccountNumber(type: string, memberNumber: string): string {
  const prefix = type === 'pokok' ? 'SP' : type === 'wajib' ? 'SW' : 'SS'
  return `${prefix}${memberNumber.slice(3)}`
}

export function validateIDNumber(idNumber: string): boolean {
  return /^\d{16}$/.test(idNumber)
}

export function validatePhone(phone: string): boolean {
  return /^(\+62|62|0)[0-9]{9,13}$/.test(phone)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function downloadCSV(data: any[], filename: string) {
  if (!data.length) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function printElement(elementId: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .mb-4 { margin-bottom: 16px; }
          .mt-4 { margin-top: 16px; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `)
  
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}
