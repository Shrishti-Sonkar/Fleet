import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useTokens } from '../../hooks/useTokens'
import toast from 'react-hot-toast'

// Role-aware navigation — riders only see rider features, vendors only vendor features
const RENTER_NAV = [
  { icon: 'home',           label: 'Home',            to: '/'            },
  { icon: 'search',         label: 'Browse Vehicles', to: '/browse'      },
  { icon: 'book_online',    label: 'My Trips',        to: '/my-bookings' },
  { icon: 'favorite',       label: 'My Wishlist',     to: '/wishlist'    },
  { icon: 'account_balance_wallet', label: 'Wallet & Tokens', to: '/wallet' },
]

const VENDOR_NAV = [
  { icon: 'dashboard',        label: 'Dashboard',     to: '/vendor'            },
  { icon: 'directions_car',   label: 'My Fleet',      to: '/vendor/dashboard'  },
  { icon: 'add_circle',       label: 'Add Vehicle',   to: '/vendor/add-vehicle'},
  { icon: 'payments',         label: 'Earnings',      to: '/vendor/earnings'   },
  { icon: 'account_balance',  label: 'Payouts',       to: '/vendor/payouts'    },
]

const COMMON_NAV = [
  { icon: 'support_agent',  label: 'Help & Support', to: '/support' },
  { icon: 'info',           label: 'About Fleet',    to: '/about'   },
]

export default function SideDrawer({ open, onClose }) {
  const { user, userDoc, logout, switchRole, isAdmin } = useAuth()
  const { isDark, toggleTheme }   = useTheme()
  const { tokensRemaining }        = useTokens()
  const navigate  = useNavigate()
  const location  = useLocation()
  const drawerRef = useRef(null)
  const [switching, setSwitching] = useState(false)

  // Close on route change
  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose()
    }
    const tid = setTimeout(() => document.addEventListener('mousedown', handler), 100)
    return () => {
      clearTimeout(tid)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/')
    onClose()
  }

  // One account, both modes — current mode derived from the stored role
  // (legacy 'owner' counts as vendor).
  const isVendorMode = userDoc?.role === 'vendor' || userDoc?.role === 'owner'

  const handleSwitchMode = async () => {
    if (!user || switching) return
    const target = isVendorMode ? 'renter' : 'vendor'
    setSwitching(true)
    try {
      await switchRole(target)
      toast.success(
        target === 'vendor'
          ? '🏪 Switched to Vendor mode'
          : '🛵 Switched to Rider mode'
      )
      navigate(target === 'vendor' ? '/vendor' : '/')
      onClose()
    } catch {
      toast.error('Could not switch mode. Please try again.')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-surface-container-lowest z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <Link to="/" className="font-black text-[22px] text-primary">Fleet</Link>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center transition-all"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[22px] text-secondary">close</span>
          </button>
        </div>

        {/* User profile section */}
        {user ? (
          <div
            className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant cursor-pointer hover:bg-surface-container transition-all"
            onClick={() => { navigate('/profile'); onClose() }}
          >
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden shrink-0">
              {userDoc?.selfieUrl ? (
                <img src={userDoc.selfieUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-[18px] text-on-primary-fixed">
                  {userDoc?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-on-surface truncate">{userDoc?.name || 'Fleet User'}</p>
              <p className="text-label-sm text-secondary truncate">{user.email || userDoc?.phone}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  userDoc?.kycStatus === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {userDoc?.kycStatus === 'approved' ? '✓ Verified' : 'Verify ID'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  🪙 {tokensRemaining} tokens
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">chevron_right</span>
          </div>
        ) : (
          <div className="px-5 py-4 border-b border-outline-variant">
            <button
              onClick={() => { navigate('/login'); onClose() }}
              className="w-full h-10 bg-primary-container text-white font-bold rounded-full hover:opacity-90 transition-all"
            >
              Sign In / Sign Up
            </button>
          </div>
        )}

        {/* Nav items — role-aware */}
        <nav className="flex-1 overflow-y-auto py-2">
          {[...(isVendorMode ? VENDOR_NAV : RENTER_NAV), ...COMMON_NAV].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container transition-all ${
                location.pathname === item.to
                  ? 'text-primary bg-primary-fixed/50 font-bold border-r-4 border-primary-container'
                  : 'text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-label-md font-medium">{item.label}</span>
            </Link>
          ))}

          {/* Rider ⇄ Vendor mode switch (one account, both modes) */}
          {user && !isAdmin() && (
            <div className="mx-4 my-3 rounded-2xl overflow-hidden border border-primary-container/20 bg-primary-fixed/40 shadow-sm">
              <div className="px-4 pt-3 pb-2">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-bold">Current mode</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isVendorMode ? 'storefront' : 'two_wheeler'}
                  </span>
                  <p className="font-bold text-on-surface">{isVendorMode ? 'Vendor' : 'Rider'}</p>
                </div>
              </div>
              <button
                onClick={handleSwitchMode}
                disabled={switching}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-container text-white hover:opacity-90 transition-all text-label-md font-bold disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                {switching
                  ? 'Switching…'
                  : isVendorMode ? 'Switch to Rider' : 'Switch to Vendor'}
              </button>
            </div>
          )}

          <div className="h-px bg-outline-variant mx-4 my-2" />

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-container transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[22px] text-secondary">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
              <span className="text-label-md font-medium text-on-surface">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all duration-300 relative ${isDark ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${isDark ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-outline-variant px-4 py-3 space-y-1">
          <button
            onClick={() => { navigate('/support?type=report'); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 text-secondary hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">flag</span>
            <span className="text-label-md font-medium">Report an Issue</span>
          </button>

          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-error-container/20 rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
              <span className="text-label-md font-bold">Log Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
