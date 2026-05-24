import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

const tabs = [
  { icon: 'dashboard',   label: 'Overview', path: ROUTES.VENDOR_HOME,      highlight: false },
  { icon: 'directions_car', label: 'Fleet', path: ROUTES.VENDOR_DASHBOARD, highlight: false },
  { icon: 'add',         label: 'Add',      path: ROUTES.VENDOR_ADD,        highlight: true  },
  { icon: 'payments',    label: 'Earnings', path: ROUTES.VENDOR_EARNINGS,   highlight: false },
  { icon: 'person',      label: 'Profile',  path: ROUTES.PROFILE,           highlight: false },
]

export default function VendorNav() {
  const location = useLocation()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 h-16 flex items-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path

        if (tab.highlight) {
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
            >
              {/* Elevated Add button */}
              <div className="w-12 h-12 -mt-5 bg-black rounded-full flex items-center justify-center shadow-lg shadow-black/30">
                <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  add
                </span>
              </div>
              <span className="text-[10px] font-semibold text-gray-400 -mt-1">Add</span>
            </Link>
          )
        }

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
