import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SideDrawer from './SideDrawer'
import TokenBadge from '../ui/TokenBadge'
import NotificationBell from '../ui/NotificationBell'
import { ROUTES } from '../../lib/constants'

export default function TopNavBar() {
  const location  = useLocation()
  const { user, userDoc } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: ROUTES.BROWSE, label: 'Browse'       },
    { to: ROUTES.HOST,   label: 'List Vehicle' },
    { to: ROUTES.ABOUT,  label: 'About'        },
    { to: ROUTES.SUPPORT,label: 'Support'      },
  ]

  return (
    <>
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <header className="fixed top-0 w-full h-[68px] border-b border-outline-variant bg-surface-container-lowest z-40">
        <nav className="flex items-center justify-between px-gutter max-w-screen-2xl mx-auto h-full">

          {/* LEFT: Hamburger + Logo + Desktop links */}
          <div className="flex items-center gap-4">
            <button
              id="hamburger-btn"
              onClick={() => setDrawerOpen(true)}
              className="w-10 h-10 rounded-xl hover:bg-surface-container flex items-center justify-center transition-all"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-on-surface text-[24px]">menu</span>
            </button>

            <Link to={ROUTES.HOME} className="font-headline-sm text-headline-sm font-black text-primary">
              Fleet
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex gap-8 items-center">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`font-body-lg text-body-lg font-medium transition-colors duration-200 py-5 ${
                    isActive(link.to)
                      ? 'text-primary font-bold border-b-2 border-primary'
                      : 'text-on-surface hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* RIGHT: Tokens + Bell + Profile / Auth */}
          <div className="flex items-center gap-3">
            {/* Token badge — only when logged in, desktop */}
            {user && (
              <div className="relative group hidden md:flex">
                <TokenBadge size="compact" />
                {/* Tooltip */}
                <div className="absolute top-full mt-2 right-0 bg-on-surface text-white text-[11px] rounded-xl p-3 w-52 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  <p className="font-bold mb-1">🪙 Fleet Tokens</p>
                  <p className="opacity-80">1 token = 1 hour of rental.</p>
                  <p className="opacity-80 mt-1">Earn more by referring friends or completing rides.</p>
                </div>
              </div>
            )}

            {/* Notification bell */}
            {user && <NotificationBell />}

            {/* Auth: profile avatar or Sign In / Rent Now */}
            {user ? (
              <Link
                to={ROUTES.PROFILE}
                className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-on-primary-fixed hover:ring-2 hover:ring-primary-container transition-all overflow-hidden"
                aria-label="My profile"
              >
                {userDoc?.selfieUrl ? (
                  <img src={userDoc.selfieUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[14px] font-black">
                    {userDoc?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </Link>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="font-medium text-on-surface hover:text-primary transition-colors font-body-lg text-body-lg"
                >
                  Sign In
                </Link>
                <Link
                  to={ROUTES.BROWSE}
                  className="bg-primary-container text-white px-6 py-2 rounded-full font-bold transition-all font-body-lg text-body-lg hover:opacity-90 active:scale-95"
                >
                  Rent Now
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
    </>
  )
}
