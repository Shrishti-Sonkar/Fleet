import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]           = useState('')
  const [sent, setSent]             = useState(false)
  const [sending, setSending]       = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(id); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  const startTimer = () => setResendTimer(60)

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    setSending(true)
    try {
      await resetPassword(email)
      setSent(true)
      startTimer()
      toast.success('Reset link sent! Check your inbox.')
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : err.code === 'auth/too-many-requests'
          ? 'Too many requests. Try after some time.'
          : 'Failed to send. Check your email and try again.'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    await handleSend()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Back link */}
      <div className="w-full max-w-md mb-6">
        <Link
          to="/login"
          className="flex items-center gap-2 text-label-md text-secondary hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Login
        </Link>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-premium">

        {!sent ? (
          /* ── STATE 1: Email input ── */
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-fixed rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-float">
                <span
                  className="material-symbols-outlined text-primary-container text-[32px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock_reset
                </span>
              </div>
              <h1 className="text-headline-sm font-bold text-on-surface mb-2">
                Forgot Password?
              </h1>
              <p className="text-body-lg text-secondary">
                No worries! Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-label-md font-medium text-secondary mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">
                    mail
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-12 pl-11 pr-4 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary-container outline-none text-body-lg transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                id="send-reset-btn"
                disabled={sending || !email}
                className="w-full h-12 bg-primary-container text-white font-bold rounded-full hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
              >
                {sending ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>

            <p className="text-center text-label-md text-secondary mt-6">
              Remember your password?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </>
        ) : (
          /* ── STATE 2: Success / Email sent ── */
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span
                className="material-symbols-outlined text-green-600 text-[40px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mark_email_read
              </span>
            </div>

            <h2 className="text-headline-sm font-bold text-on-surface mb-3">
              Check your email
            </h2>
            <p className="text-body-lg text-secondary mb-2">
              We sent a password reset link to:
            </p>
            <p className="font-bold text-primary text-body-lg mb-6">{email}</p>

            {/* Info box */}
            <div className="bg-surface-container rounded-xl p-4 text-left mb-8">
              <p className="text-label-md text-secondary flex items-start gap-2">
                <span
                  className="material-symbols-outlined text-[16px] text-primary-container mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  info
                </span>
                Link expires in 1 hour. Check your spam folder if not received.
              </p>
            </div>

            {/* Open Gmail */}
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 bg-primary-container text-white font-bold rounded-full hover:opacity-90 transition-all mb-3"
            >
              <span className="material-symbols-outlined text-[20px]">open_in_new</span>
              Open Gmail
            </a>

            {/* Resend */}
            <button
              id="resend-reset-btn"
              onClick={handleResend}
              disabled={resendTimer > 0}
              className="w-full h-12 border-2 border-outline-variant rounded-full font-bold text-on-surface hover:border-primary-container hover:bg-primary-fixed disabled:opacity-50 transition-all"
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
            </button>

            <p className="text-center text-label-md text-secondary mt-4">
              <Link to="/login" className="text-primary font-bold hover:underline">
                ← Back to Login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
