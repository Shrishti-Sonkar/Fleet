import { Link, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/browse', icon: 'explore', label: 'Browse' },
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/host', icon: 'directions_car', label: 'Host' },
  { to: '/login', icon: 'account_circle', label: 'Profile' },
]

export default function BottomTabBar() {
  const location = useLocation()

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest h-16 flex items-center justify-around border-t border-outline-variant z-50">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.to
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-bold">{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
