import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [remember, setRemember] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loadingState, setLoadingState] = useState(false)
  const navigate = useNavigate()
  const { signin, signup, googleSignin } = useAuth()

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoadingState(true)
    try {
      await signin(email, password)
      toast.success('Welcome back to Fleet!')
      navigate('/')
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Login failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoadingState(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Name is required')
    if (password.length < 8) return setError('Password must be 8+ characters')
    setLoadingState(true)
    try {
      await signup(email, password, name, phone)
      toast.success('Account created! Welcome to Fleet.')
      setShowSuccess(true)
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'Email already registered. Please sign in.'
          : 'Signup failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoadingState(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await googleSignin()
      toast.success('Signed in with Google!')
      navigate('/')
    } catch {
      toast.error('Google sign-in failed')
    }
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center text-center p-gutter">
        <div className="w-24 h-24 bg-primary-container/10 rounded-full flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Welcome aboard!</h3>
        <p className="text-secondary max-w-sm mb-10">Your account has been successfully created. Let's get you on the road.</p>
        <button
          onClick={() => navigate('/')}
          className="w-full max-w-xs h-12 bg-primary-container text-white font-bold rounded-xl active:scale-95 transition-all"
        >
          Start Browsing Vehicles
        </button>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* Left – Brand Panel */}
      <section className="hidden lg:flex lg:w-1/2 bg-primary-container relative flex-col items-center justify-center p-section-padding-lg overflow-hidden">
        <div className="absolute top-12 left-12 flex items-center gap-2">
          <span className="font-headline-sm text-headline-sm font-black text-white">Fleet</span>
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="mb-12 relative">
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-80 h-20 rounded-[100%] opacity-40"
              style={{ background: 'radial-gradient(circle at 50% 90%, rgba(0,0,0,0.1) 0%, transparent 70%)' }} />
            <img
              alt="3D Premium Scooter"
              className="relative z-20 w-full h-auto drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZMM-cx_8_SAbgfeJqgF0Le75-tRHkpTQ1_ZxiXVFgMMOwauF1AA0wKSVpoVfz2MXlDmxO3XMoL9yNt4vpnm1M8NDMQT-gDIBEixYov1cswPPMnpq-kzZxwqMaEMiBaVD1Nvj5iIZC1S6nJSZ10BU7-K3ui2nbV9mPDFU0nlUyxUzPOolzDnKqJrSRwYfO0giLkdD0yuUJ9iG-iH0A4dlfdzJKyUhtanyOlswLDRC9qAXJyUOMlSlFW7l5ji6GoWoqRoqOUkB0uFIe"
            />
          </div>
          <h1 className="font-display text-display text-white mb-4">India's favourite ride rental</h1>
          <p className="font-headline-sm text-headline-sm text-white opacity-90">Premium mobility for the modern explorer.</p>
        </div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-20 w-64 h-64 bg-black opacity-5 rounded-full blur-2xl" />
      </section>

      {/* Right – Auth Forms */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col items-center justify-center px-gutter py-section-padding-lg">
        <div className="w-full max-w-md">
          {/* Tab toggle */}
          <nav className="flex gap-8 mb-10">
            <button
              onClick={() => setActiveTab('signin')}
              className={`font-headline-sm text-headline-sm pb-2 transition-all ${
                activeTab === 'signin' ? 'active-tab' : 'text-secondary hover:text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`font-headline-sm text-headline-sm pb-2 transition-all ${
                activeTab === 'signup' ? 'active-tab' : 'text-secondary hover:text-primary'
              }`}
            >
              Sign Up
            </button>
          </nav>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">
                  Welcome back
                </h2>
                <p className="text-secondary mt-2">Enter your credentials to access your Fleet account.</p>
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-3 gap-4">
                <button id="google-login" onClick={handleGoogle} className="flex items-center justify-center py-3 border border-outline-variant rounded-xl hover:bg-surface transition-all active:scale-95 duration-150">
                  <img alt="Google" className="w-6 h-6"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzTHQA-pNCZsOzWipp1tT5As3nesnTsrV5XYnI6_s_MIqbOmr-ZdlDE6Il6ONK0HlhzO0kKU2yNPCG81joorZv1aC2JLgt30INqTC8N5ZEVXVWPtun3uFtP8yFNLSQbNYEfvbqzt-_2lxPr-dCOCrsAbLC9vzTe7AXixOzOzfZU20b-KW-TyW6RjGnEaJ5LgCouWarXdNAXCLKhrEXwb1AmA3oryaW77MeLAiqVWu5HG9XZHk4uGMj6ZOoIia8TMrQYN7qoK06kbDU" />
                </button>
                <button id="phone-login" className="flex items-center justify-center py-3 border border-outline-variant rounded-xl hover:bg-surface transition-all active:scale-95 duration-150">
                  <span className="material-symbols-outlined text-on-surface">phone</span>
                </button>
                <button id="email-login" className="flex items-center justify-center py-3 border border-outline-variant rounded-xl hover:bg-surface transition-all active:scale-95 duration-150">
                  <span className="material-symbols-outlined text-on-surface">mail</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center gap-4">
                <div className="flex-grow h-px bg-outline-variant" />
                <span className="text-label-md font-label-md text-secondary uppercase tracking-widest">Or login with</span>
                <div className="flex-grow h-px bg-outline-variant" />
              </div>

              {/* Form */}
              <form className="space-y-6" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <label htmlFor="email" className="font-label-md text-label-md text-on-surface-variant ml-1 block">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label htmlFor="password" className="font-label-md text-label-md text-on-surface-variant">Password</label>
                    <a href="#" className="text-label-md font-label-md text-primary hover:underline">Forgot?</a>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 px-1">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="remember" className="font-label-md text-label-md text-secondary cursor-pointer">Keep me signed in</label>
                </div>
                {error && (
                  <p className="text-error text-label-md bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>
                )}
                <button
                  type="submit"
                  id="signin-btn"
                  disabled={loadingState}
                  className="w-full h-12 bg-primary-container text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary-container/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingState ? 'Signing in...' : 'Sign In to Fleet'}
                </button>
              </form>

              <p className="text-center text-label-md font-label-md text-secondary">
                Don't have an account?{' '}
                <button onClick={() => setActiveTab('signup')} className="text-primary font-bold hover:underline">
                  Create an account
                </button>
              </p>
            </div>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Create account</h2>
                <p className="text-secondary mt-2">Join India's most premium vehicle rental community.</p>
              </div>
              <form className="space-y-5" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <label htmlFor="signup-name" className="font-label-md text-label-md text-on-surface-variant ml-1 block">Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Rahul Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="font-label-md text-label-md text-on-surface-variant ml-1 block">Email Address</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-phone" className="font-label-md text-label-md text-on-surface-variant ml-1 block">Mobile Number</label>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center justify-center px-4 bg-surface rounded-xl text-secondary font-label-md border border-outline-variant">+91</span>
                    <input
                      id="signup-phone"
                      type="tel"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="flex-grow h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="font-label-md text-label-md text-on-surface-variant ml-1 block">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="py-2">
                  <p className="text-[12px] text-secondary leading-relaxed">
                    By clicking "Create Account", you agree to our{' '}
                    <a href="#" className="text-primary underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-primary underline">Privacy Policy</a>.
                  </p>
                </div>
                {error && (
                  <p className="text-error text-label-md bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>
                )}
                <button
                  type="submit"
                  id="signup-btn"
                  disabled={loadingState}
                  className="w-full h-12 bg-primary-container text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary-container/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingState ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
