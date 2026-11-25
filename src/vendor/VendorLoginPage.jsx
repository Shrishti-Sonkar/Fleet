import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function VendorLoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { user, signin, signup, googleSignin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Email and password required.')
    if (isRegister && !name) return toast.error('Please enter your business/full name.')

    setSubmitting(true)
    try {
      if (isRegister) {
        await signup(email, password, name, phone, 'vendor')
        toast.success('Vendor partner request submitted!')
      } else {
        await signin(email, password)
        toast.success('Logged in successfully!')
      }
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Authentication failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setSubmitting(true)
    try {
      await googleSignin()
      toast.success('Signed in with Google!')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="w-full max-w-md bg-[#0e1424] border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-blue-950/30">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-blue-600/40">
            F
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-white">Fleet Partner Portal</h1>
            <p className="text-xs text-slate-400">List vehicles &amp; manage bookings</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isRegister ? 'Create Vendor Account' : 'Vendor Sign In'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {isRegister
            ? 'Apply to list your fleet and earn with Fleet.'
            : 'Access your dashboard, bookings, and payouts.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Business / Owner Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Himalayan Rentals / Rajesh Sharma"
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@fleetmobilities.info"
              className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : isRegister ? 'Register as Vendor' : 'Sign In to Dashboard'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full h-11 mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="mt-6 text-center pt-6 border-t border-slate-800/80">
          <p className="text-sm text-slate-400">
            {isRegister ? 'Already registered?' : 'Want to become a vendor Partner?'}{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="font-bold text-blue-400 hover:underline ml-1"
            >
              {isRegister ? 'Sign In' : 'Register Now'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
