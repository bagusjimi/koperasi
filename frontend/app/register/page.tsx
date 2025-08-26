'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { validateIDNumber, validatePhone } from '@/lib/utils'
import { Building2, ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    idNumber: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    occupation: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama')
      setLoading(false)
      return
    }

    if (!validateIDNumber(formData.idNumber)) {
      setError('Nomor KTP harus 16 digit')
      setLoading(false)
      return
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setError('Format nomor telepon tidak valid')
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.register(formData)
      setSuccess(`Pendaftaran berhasil! Nomor anggota Anda: ${response.data.memberNumber}`)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Pendaftaran gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center mb-8">
            <button
              onClick={() => router.push('/login')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center mr-3">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Daftar Anggota Baru</h1>
                <p className="text-gray-600">Bergabung dengan Koperasi Desa</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-danger-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg">
              <p className="text-success-800 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Akun</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label text-gray-700 mb-2 block">Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label text-gray-700 mb-2 block">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label text-gray-700 mb-2 block">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input w-full"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="label text-gray-700 mb-2 block">Konfirmasi Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input w-full"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Pribadi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label text-gray-700 mb-2 block">Nama Lengkap *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label text-gray-700 mb-2 block">Nomor KTP *</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className="input w-full"
                    maxLength={16}
                    pattern="[0-9]{16}"
                    required
                  />
                </div>
                <div>
                  <label className="label text-gray-700 mb-2 block">Nomor Telepon</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="label text-gray-700 mb-2 block">Tanggal Lahir</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label text-gray-700 mb-2 block">Jenis Kelamin</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    <option value="">Pilih jenis kelamin</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label text-gray-700 mb-2 block">Pekerjaan</label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label text-gray-700 mb-2 block">Alamat</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="input w-full"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="btn-secondary"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Mendaftar...
                  </div>
                ) : (
                  'Daftar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
