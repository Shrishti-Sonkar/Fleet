import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

const tabs = [
  { icon: 'home',          label: 'Home',    path: ROUTES.HOME },
  { icon: 'explore',       label: 'Browse',  path: ROUTES.BROWSE },
  { icon: 'calendar_month',label: 'Trips',   path: ROUTES.MY_BOOKINGS },
  { icon: 'favorite',      label: 'Saved',   path: ROUTES.WISHLIST },
  { icon: 'person',        label: 'Profile', path: ROUTES.PROFILE },
]

export default function RenterNav() {
  const location = useLocation()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 h-16 flex items-center safe-area-inset-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
              isActive ? 'text-black' : 'text-gray-400'
            }`}
          >
            <span
              className={`material-symbols-outlined transition-all ${isActive ? 'text-[24px]' : 'text-[22px]'}`}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className={`text-[10px] font-semibold ${isActive ? 'text-black' : 'text-gray-400'}`}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
