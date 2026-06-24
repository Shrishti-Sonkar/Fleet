import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '../context/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signin, signup, googleSignin, sendOTP, verifyOTP } = useAuth()

  // ── Role-aware post-login redirect ────────────────────────────────────────
  const redirectForRole = (role) => {
    const normalized = role === 'owner' ? 'vendor' : role
    navigate(normalized === 'vendor' ? ROUTES.VENDOR_HOME : ROUTES.HOME, { replace: true })
  }

  const handlePostLogin = async (firebaseUser) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
      let role = userSnap.exists() ? userSnap.data().role : null
      if (!role) {
        // New user with no role — default to renter
        const { setDoc, serverTimestamp } = await import('firebase/firestore')
        await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'renter', roleSetAt: serverTimestamp() }, { merge: true })
        role = 'renter'
      }
      redirectForRole(role)
    } catch {
      navigate(ROUTES.HOME, { replace: true })
    }
  }

  // ── Top-level tab: Sign In / Sign Up ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState('signin')

  // ── Sign-In state ─────────────────────────────────────────────────────────
  const [loginTab, setLoginTab] = useState('email') // 'email' | 'otp'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showSigninPwd, setShowSigninPwd] = useState(false)
  const [rememberMe, setRememberMe]       = useState(true)
  const [signinError, setSigninError]     = useState('')
  const [signinLoading, setSigninLoading] = useState(false)

  // ── OTP state ─────────────────────────────────────────────────────────────
  const [otpPhone, setOtpPhone]       = useState('')
  const [otp, setOtp]                 = useState(['', '', '', '', '', ''])
  const [otpSent, setOtpSent]         = useState(false)
  const [otpTimer, setOtpTimer]       = useState(0)
  const [sendingOtp, setSendingOtp]   = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  // OTP countdown
  useEffect(() => {
    if (otpTimer <= 0) return
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [otpTimer])

  // ── Sign-Up state (dedicated — no collision with sign-in) ─────────────────
  const [signupName, setSignupName]       = useState('')
  const [signupEmail, setSignupEmail]     = useState('')
  const [signupPhone, setSignupPhone]     = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [showSignupPwd, setShowSignupPwd] = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [agreeTerms, setAgreeTerms]       = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError]     = useState('')
  const [showSuccess, setShowSuccess]     = useState(false)
  const [signupRole, setSignupRole]       = useState('renter') // 'renter' | 'vendor'

  // ── Password strength helper ───────────────────────────────────────────────
  const pwdStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '' }
    if (pwd.length < 4) return { level: 1, label: 'Weak' }
    if (pwd.length < 6) return { level: 2, label: 'Fair' }
    if (pwd.length < 8) return { level: 3, label: 'Good' }
    return { level: 4, label: 'Strong' }
  }
  const strength = pwdStrength(signupPassword)

  // ── Handlers — Sign In ────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault()
    setSigninError('')
    setSigninLoading(true)
    try {
      const cred = await signin(email, password, rememberMe)
      toast.success('Welcome back to Fleet!')
      await handlePostLogin(cred.user)
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Login failed. Please try again.'
      setSigninError(msg)
      toast.error(msg)
    } finally {
      setSigninLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      const cred = await googleSignin()
      toast.success('Signed in with Google!')
      await handlePostLogin(cred.user)
    } catch {
      toast.error('Google sign-in failed')
    }
  }

  // ── Handlers — OTP ────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const cleaned = otpPhone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }
    setSendingOtp(true)
    try {
      await sendOTP('+91' + cleaned)
      setOtpSent(true)
      setOtpTimer(30)
      toast.success('OTP sent to +91 ' + cleaned)
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-phone-number'
          ? 'Invalid phone number'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try after some time.'
          : 'Failed to send OTP. Try again.'
      toast.error(msg)
    } finally {
      setSendingOtp(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs[index + 1].current?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus()
    }
  }

  const handleVerifyOTP = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Enter complete 6-digit OTP')
      return
    }
    setVerifyingOtp(true)
    try {
      const cred = await verifyOTP(otpString)
      toast.success('Phone verified! Welcome to Fleet 🎉')
      await handlePostLogin(cred.user)
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-verification-code'
          ? 'Wrong OTP. Please check and retry.'
          : 'Verification failed. Try again.'
      toast.error(msg)
      setOtp(['', '', '', '', '', ''])
      otpRefs[0].current?.focus()
    } finally {
      setVerifyingOtp(false)
    }
  }

  // ── Handlers — Sign Up ────────────────────────────────────────────────────
  const validateSignup = () => {
    if (!signupName.trim() || signupName.trim().length < 2)
      return 'Enter your full name (min 2 characters)'
    if (!signupEmail || !signupEmail.includes('@'))
      return 'Enter a valid email address'
    if (!signupPhone || signupPhone.replace(/\D/g, '').length !== 10)
      return 'Enter a valid 10-digit mobile number'
    if (signupPassword.length < 8)
      return 'Password must be at least 8 characters'
    if (signupPassword !== signupConfirm)
      return 'Passwords do not match'
    if (!agreeTerms)
      return 'Please accept the Terms & Conditions to continue'
    return null
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    const err = validateSignup()
    if (err) {
      setSignupError(err)
      toast.error(err)
      return
    }
    setSignupLoading(true)
    setSignupError('')
    try {
      await signup(signupEmail, signupPassword, signupName.trim(), '+91' + signupPhone.replace(/\D/g, ''), signupRole)
      toast.success(
        signupRole === 'vendor'
          ? 'Vendor account created! Welcome to Fleet 🎉'
          : 'Account created! Welcome to Fleet 🎉'
      )
      redirectForRole(signupRole)
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'This email is already registered. Please sign in.'
          : err.code === 'auth/weak-password'
          ? 'Password is too weak. Use 8+ characters.'
          : 'Signup failed. Please try again.'
      setSignupError(msg)
      toast.error(msg)
    } finally {
      setSignupLoading(false)
    }
  }



  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* ── Left: Brand Panel ── */}
      <section className="hidden lg:flex lg:w-1/2 bg-primary-container relative flex-col items-center justify-center p-section-padding-lg overflow-hidden">
        <div className="absolute top-12 left-12 flex items-center gap-2">
          <span className="text-headline-sm font-black text-white">Fleet</span>
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="mb-12 relative">
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-80 h-20 rounded-[100%] opacity-40"
              style={{ background: 'radial-gradient(circle at 50% 90%, rgba(0,0,0,0.1) 0%, transparent 70%)' }}
            />
            <img
              alt="3D Premium Scooter"
              className="relative z-20 w-full h-auto drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZMM-cx_8_SAbgfeJqgF0Le75-tRHkpTQ1_ZxiXVFgMMOwauF1AA0wKSVpoVfz2MXlDmxO3XMoL9yNt4vpnm1M8NDMQT-gDIBEixYov1cswPPMnpq-kzZxwqMaEMiBaVD1Nvj5iIZC1S6nJSZ10BU7-K3ui2nbV9mPDFU0nlUyxUzPOolzDnKqJrSRwYfO0giLkdD0yuUJ9iG-iH0A4dlfdzJKyUhtanyOlswLDRC9qAXJyUOMlSlFW7l5ji6GoWoqRoqOUkB0uFIe"
            />
          </div>
          <h1 className="text-display-mobile font-bold text-white mb-4">India's favourite ride rental</h1>
          <p className="text-headline-sm text-white opacity-90">Premium mobility for the modern explorer.</p>
        </div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-20 w-64 h-64 bg-black opacity-5 rounded-full blur-2xl" />
      </section>

      {/* ── Right: Auth Forms ── */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col items-center justify-center px-gutter py-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Top tab nav: Sign In | Sign Up */}
          <nav className="flex gap-8 mb-8">
            <button
              onClick={() => setActiveTab('signin')}
              className={`text-headline-sm pb-2 transition-all ${activeTab === 'signin' ? 'active-tab font-bold border-b-2 border-primary-container text-on-surface' : 'text-secondary hover:text-primary'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`text-headline-sm pb-2 transition-all ${activeTab === 'signup' ? 'active-tab font-bold border-b-2 border-primary-container text-on-surface' : 'text-secondary hover:text-primary'}`}
            >
              Sign Up
            </button>
          </nav>

          {/* ════════════════════════════════════════════════
              SIGN IN TAB
          ════════════════════════════════════════════════ */}
          {activeTab === 'signin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-headline-lg-mobile font-bold text-on-surface">Welcome back</h2>
                <p className="text-secondary mt-1 text-body-md">Enter your credentials to access your Fleet account.</p>
              </div>

              {/* Email | Mobile OTP sub-tab switcher */}
              <div className="flex bg-surface-container p-1 rounded-xl">
                <button
                  onClick={() => setLoginTab('email')}
                  className={`flex-1 py-2 rounded-lg text-label-md font-medium transition-all ${
                    loginTab === 'email'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  📧 Email
                </button>
                <button
                  onClick={() => setLoginTab('otp')}
                  className={`flex-1 py-2 rounded-lg text-label-md font-medium transition-all ${
                    loginTab === 'otp'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  📱 Mobile OTP
                </button>
              </div>

              {/* ── EMAIL LOGIN ── */}
              {loginTab === 'email' && (
                <form className="space-y-5" onSubmit={handleSignIn}>
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-label-md font-medium text-secondary mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">mail</span>
                      <input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all text-body-lg"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-label-md font-medium text-secondary mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">lock</span>
                      <input
                        id="password"
                        type={showSigninPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full h-12 pl-11 pr-12 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all text-body-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSigninPwd(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showSigninPwd ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Remember Me + Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <button
                        type="button"
                        onClick={() => setRememberMe(v => !v)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          rememberMe
                            ? 'bg-primary-container border-primary-container'
                            : 'border-outline-variant bg-surface'
                        }`}
                      >
                        {rememberMe && (
                          <span className="material-symbols-outlined text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check
                          </span>
                        )}
                      </button>
                      <span className="text-label-md text-on-surface group-hover:text-primary transition-colors">
                        Remember me
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-label-md text-primary font-medium hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Error */}
                  {signinError && (
                    <p className="text-error text-label-md bg-red-50 border border-red-200 px-4 py-3 rounded-xl">{signinError}</p>
                  )}

                  <button
                    type="submit"
                    id="signin-btn"
                    disabled={signinLoading}
                    className="w-full h-12 bg-primary-container text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {signinLoading ? 'Signing in...' : 'Sign In to Fleet →'}
                  </button>

                  {/* Divider */}
                  <div className="relative flex items-center gap-4">
                    <div className="flex-grow h-px bg-outline-variant" />
                    <span className="text-label-md text-secondary uppercase tracking-widest">or</span>
                    <div className="flex-grow h-px bg-outline-variant" />
                  </div>

                  {/* Google */}
                  <button
                    type="button"
                    id="google-login"
                    onClick={handleGoogle}
                    className="w-full h-12 border-2 border-outline-variant rounded-full font-bold flex items-center justify-center gap-3 hover:border-primary-container hover:bg-primary-fixed transition-all"
                  >
                    <img
                      alt="Google"
                      className="w-5 h-5"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzTHQA-pNCZsOzWipp1tT5As3nesnTsrV5XYnI6_s_MIqbOmr-ZdlDE6Il6ONK0HlhzO0kKU2yNPCG81joorZv1aC2JLgt30INqTC8N5ZEVXVWPtun3uFtP8yFNLSQbNYEfvbqzt-_2lxPr-dCOCrsAbLC9vzTe7AXixOzOzfZU20b-KW-TyW6RjGnEaJ5LgCouWarXdNAXCLKhrEXwb1AmA3oryaW77MeLAiqVWu5HG9XZHk4uGMj6ZOoIia8TMrQYN7qoK06kbDU"
                    />
                    Continue with Google
                  </button>
                </form>
              )}

              {/* ── MOBILE OTP LOGIN ── */}
              {loginTab === 'otp' && (
                <div className="space-y-4">
                  {!otpSent ? (
                    <>
                      {/* Phone input */}
                      <div>
                        <label className="block text-label-md font-medium text-secondary mb-1.5">
                          Mobile Number
                        </label>
                        <div className="flex h-12 border border-outline-variant rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-container">
                          <div className="flex items-center px-4 bg-surface-container border-r border-outline-variant shrink-0">
                            <span className="text-label-md font-bold text-on-surface">🇮🇳 +91</span>
                          </div>
                          <input
                            type="tel"
                            value={otpPhone}
                            onChange={e => setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="9876543210"
                            className="flex-1 px-4 bg-transparent outline-none text-body-lg"
                            maxLength={10}
                          />
                        </div>
                        <p className="text-label-sm text-secondary mt-1">OTP will be sent via SMS</p>
                      </div>

                      <button
                        id="send-otp-btn"
                        onClick={handleSendOTP}
                        disabled={sendingOtp || otpPhone.length !== 10}
                        className="w-full h-12 bg-primary-container text-white font-bold rounded-full hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        {sendingOtp ? 'Sending OTP...' : 'Send OTP →'}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* OTP entry screen */}
                      <div className="text-center">
                        <p className="text-body-lg text-on-surface font-medium">Enter OTP sent to</p>
                        <p className="text-primary font-bold text-body-lg">+91 {otpPhone}</p>
                        <button
                          onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']) }}
                          className="text-label-md text-secondary underline mt-1 hover:text-primary transition-colors"
                        >
                          Change number
                        </button>
                      </div>

                      {/* 6-digit OTP boxes */}
                      <div className="flex gap-3 justify-center my-4">
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={otpRefs[i]}
                            type="tel"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className={`w-11 h-14 text-center text-[22px] font-bold border-2 rounded-xl outline-none transition-all ${
                              digit
                                ? 'border-primary-container bg-primary-fixed text-on-primary-fixed'
                                : 'border-outline-variant bg-surface'
                            } focus:border-primary-container focus:ring-2 focus:ring-primary-fixed`}
                          />
                        ))}
                      </div>

                      {/* Resend timer */}
                      <p className="text-center text-label-md text-secondary">
                        {otpTimer > 0 ? (
                          <>Resend OTP in <span className="font-bold text-primary">{otpTimer}s</span></>
                        ) : (
                          <button onClick={handleSendOTP} className="text-primary font-bold underline">
                            Resend OTP
                          </button>
                        )}
                      </p>

                      <button
                        id="verify-otp-btn"
                        onClick={handleVerifyOTP}
                        disabled={verifyingOtp || otp.join('').length !== 6}
                        className="w-full h-12 bg-primary-container text-white font-bold rounded-full hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify & Login ✓'}
                      </button>
                    </>
                  )}

                  {/* Divider + Google */}
                  <div className="relative flex items-center gap-4 mt-2">
                    <div className="flex-grow h-px bg-outline-variant" />
                    <span className="text-label-md text-secondary">or</span>
                    <div className="flex-grow h-px bg-outline-variant" />
                  </div>
                  <button
                    onClick={handleGoogle}
                    className="w-full h-12 border-2 border-outline-variant rounded-full font-bold flex items-center justify-center gap-3 hover:border-primary-container hover:bg-primary-fixed transition-all"
                  >
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzTHQA-pNCZsOzWipp1tT5As3nesnTsrV5XYnI6_s_MIqbOmr-ZdlDE6Il6ONK0HlhzO0kKU2yNPCG81joorZv1aC2JLgt30INqTC8N5ZEVXVWPtun3uFtP8yFNLSQbNYEfvbqzt-_2lxPr-dCOCrsAbLC9vzTe7AXixOzOzfZU20b-KW-TyW6RjGnEaJ5LgCouWarXdNAXCLKhrEXwb1AmA3oryaW77MeLAiqVWu5HG9XZHk4uGMj6ZOoIia8TMrQYN7qoK06kbDU"
                      alt="Google"
                      className="w-5 h-5"
                    />
                    Continue with Google
                  </button>
                </div>
              )}

              <p className="text-center text-label-md text-secondary pt-2">
                Don't have an account?{' '}
                <button onClick={() => setActiveTab('signup')} className="text-primary font-bold hover:underline">
                  Create an account
                </button>
              </p>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              SIGN UP TAB
          ════════════════════════════════════════════════ */}
          {activeTab === 'signup' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-headline-lg-mobile font-bold text-on-surface">Create account</h2>
                <p className="text-secondary mt-1 text-body-md">Join India's most premium vehicle rental community.</p>
              </div>

              {/* ── Role chooser: Renter vs Vendor ── */}
              <div>
                <label className="block text-label-md font-medium text-secondary mb-2">I want to join as</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'renter', icon: 'two_wheeler', title: 'Rider', sub: 'Rent & ride vehicles' },
                    { id: 'vendor', icon: 'storefront', title: 'Vendor', sub: 'List & earn from vehicles' },
                  ].map(opt => {
                    const selected = signupRole === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSignupRole(opt.id)}
                        className={`relative flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all ${
                          selected
                            ? 'border-primary-container bg-primary-fixed/30 shadow-sm'
                            : 'border-outline-variant bg-surface hover:border-primary-container/60'
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-2.5 right-2.5 material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                        )}
                        <span className={`material-symbols-outlined text-[26px] ${selected ? 'text-primary' : 'text-secondary'}`} style={{ fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0" }}>
                          {opt.icon}
                        </span>
                        <span className="font-bold text-on-surface text-body-md">{opt.title}</span>
                        <span className="text-label-sm text-secondary leading-tight">{opt.sub}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSignUp}>
                {/* Error banner */}
                {signupError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                    <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                      error
                    </span>
                    <p className="text-label-md text-error">{signupError}</p>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-label-md font-medium text-secondary mb-1.5">Full Name *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">person</span>
                    <input
                      id="signup-name"
                      type="text"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      placeholder="Rahul Sharma"
                      className="w-full h-12 pl-11 pr-4 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary-container outline-none text-body-lg transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-label-md font-medium text-secondary mb-1.5">Email Address *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">mail</span>
                    <input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-12 pl-11 pr-4 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary-container outline-none text-body-lg transition-all"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-label-md font-medium text-secondary mb-1.5">Mobile Number *</label>
                  <div className="flex h-12 border border-outline-variant rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-container">
                    <div className="flex items-center px-4 bg-surface-container border-r border-outline-variant shrink-0">
                      <span className="text-label-md font-bold">🇮🇳 +91</span>
                    </div>
                    <input
                      id="signup-phone"
                      type="tel"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="flex-1 px-4 bg-transparent outline-none text-body-lg"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-label-sm text-secondary mt-1">Used for booking confirmations &amp; OTP</p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-label-md font-medium text-secondary mb-1.5">Password *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">lock</span>
                    <input
                      id="signup-password"
                      type={showSignupPwd ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-12 pl-11 pr-12 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary-container outline-none text-body-lg transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPwd(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showSignupPwd ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {signupPassword && (
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4].map(level => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            strength.level >= level
                              ? level === 1 ? 'bg-red-400'
                              : level === 2 ? 'bg-yellow-400'
                              : level === 3 ? 'bg-blue-400'
                              : 'bg-green-500'
                              : 'bg-surface-container-high'
                          }`}
                        />
                      ))}
                      <span className="text-label-sm text-secondary ml-2 shrink-0">{strength.label}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-label-md font-medium text-secondary mb-1.5">Confirm Password *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">lock_clock</span>
                    <input
                      id="signup-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={signupConfirm}
                      onChange={e => setSignupConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className={`w-full h-12 pl-11 pr-12 border rounded-xl bg-surface focus:ring-2 outline-none text-body-lg transition-all ${
                        signupConfirm && signupPassword !== signupConfirm
                          ? 'border-error focus:ring-red-200'
                          : signupConfirm && signupPassword === signupConfirm
                          ? 'border-green-500 focus:ring-green-200'
                          : 'border-outline-variant focus:ring-primary-container'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-10 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showConfirm ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    {/* Match icon */}
                    {signupConfirm && (
                      <span
                        className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] ${
                          signupPassword === signupConfirm ? 'text-green-500' : 'text-error'
                        }`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {signupPassword === signupConfirm ? 'check_circle' : 'cancel'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => setAgreeTerms(v => !v)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      agreeTerms
                        ? 'bg-primary-container border-primary-container'
                        : 'border-outline-variant bg-surface'
                    }`}
                  >
                    {agreeTerms && (
                      <span className="material-symbols-outlined text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                    )}
                  </button>
                  <p className="text-label-md text-secondary leading-relaxed">
                    I agree to Fleet's{' '}
                    <a href="/terms" target="_blank" className="text-primary font-bold hover:underline">Terms &amp; Conditions</a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-primary font-bold hover:underline">Privacy Policy</a>.
                    {' '}I confirm I'm 18+ and hold a valid driving license.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  id="signup-btn"
                  disabled={signupLoading || !agreeTerms}
                  className="w-full h-12 bg-primary-container text-white font-bold rounded-full hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {signupLoading ? 'Creating Account...' : 'Join Fleet →'}
                </button>

                {/* Divider */}
                <div className="relative flex items-center gap-4">
                  <div className="flex-grow h-px bg-outline-variant" />
                  <span className="text-label-md text-secondary">or sign up with</span>
                  <div className="flex-grow h-px bg-outline-variant" />
                </div>

                {/* Google signup */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full h-12 border-2 border-outline-variant rounded-full font-bold flex items-center justify-center gap-3 hover:border-primary-container hover:bg-primary-fixed transition-all"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzTHQA-pNCZsOzWipp1tT5As3nesnTsrV5XYnI6_s_MIqbOmr-ZdlDE6Il6ONK0HlhzO0kKU2yNPCG81joorZv1aC2JLgt30INqTC8N5ZEVXVWPtun3uFtP8yFNLSQbNYEfvbqzt-_2lxPr-dCOCrsAbLC9vzTe7AXixOzOzfZU20b-KW-TyW6RjGnEaJ5LgCouWarXdNAXCLKhrEXwb1AmA3oryaW77MeLAiqVWu5HG9XZHk4uGMj6ZOoIia8TMrQYN7qoK06kbDU"
                    alt=""
                    className="w-5 h-5"
                  />
                  Continue with Google
                </button>
                <p className="text-center text-label-sm text-secondary">
                  Google sign-up auto-accepts our Terms &amp; Conditions
                </p>
              </form>

              <p className="text-center text-label-md text-secondary">
                Already have an account?{' '}
                <button onClick={() => setActiveTab('signin')} className="text-primary font-bold hover:underline">
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
