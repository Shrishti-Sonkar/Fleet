import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { useNotifications } from '../hooks/useNotifications'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { icon: 'home',          label: 'Home',    path: ROUTES.HOME },
  { icon: 'explore',       label: 'Browse',  path: ROUTES.BROWSE },
  { icon: 'calendar_month',label: 'Trips',   path: ROUTES.MY_BOOKINGS },
  { icon: 'notifications', label: 'Alerts',  path: '/notifications', badge: true },
  { icon: 'person',        label: 'Profile', path: ROUTES.PROFILE },
]

export default function RenterNav() {
  const location = useLocation()
  const { user } = useAuth()
  const { unreadCount } = useNotifications(user?.uid)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 h-16 flex items-center safe-area-inset-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors relative ${
              isActive ? 'text-primary' : 'text-gray-400'
            }`}
          >
            <span
              className={`material-symbols-outlined transition-all ${isActive ? 'text-[24px]' : 'text-[22px]'}`}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            {tab.badge && unreadCount > 0 && (
              <span className="absolute top-2.5 right-6 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-gray-400'}`}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
