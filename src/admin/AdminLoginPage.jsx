import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const [adminId, setAdminId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { user, userDoc, adminSignin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && userDoc?.role === 'admin') {
      navigate('/', { replace: true })
    }
  }, [user, userDoc, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!adminId.trim() || !password) {
      return toast.error('Admin ID and password are required.')
    }

    setSubmitting(true)
    try {
      await adminSignin(adminId.trim(), password)
      toast.success('Admin authenticated.')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Invalid Admin ID or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-[#060911] text-slate-100 flex items-center justify-center p-6"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      <div className="w-full max-w-md bg-[#0b1120] border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-orange-950/20">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-600/40">
            F
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-white">Fleet Admin Console</h1>
            <p className="text-xs text-slate-400">Restricted platform administration</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Administrator Sign In</h2>
        <p className="text-sm text-slate-400 mb-6">
          Enter your assigned Admin ID and password. Public registration is disabled.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Admin ID</label>
            <input
              type="text"
              autoComplete="username"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="Enter Admin ID"
              className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-orange-500 text-sm text-white outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-900 border border-slate-800 focus:border-orange-500 text-sm text-white outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 mt-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Sign In to Admin Console'}
          </button>
        </form>
      </div>
    </div>
  )
}
