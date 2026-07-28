import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/vehicles', label: 'My Vehicles', icon: 'directions_car' },
  { path: '/bookings', label: 'Bookings & Handovers', icon: 'calendar_month' },
  { path: '/earnings', label: 'Earnings & Revenue', icon: 'payments' },
  { path: '/payouts', label: 'Payout Setup', icon: 'account_balance' },
  { path: '/settings', label: 'Account Settings', icon: 'settings' },
]

export default function Sidebar() {
  const { userDoc, logout } = useAuth()

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-600/30">
          F
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-white tracking-tight">Fleet Partner</h1>
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">
            Vendor Portal
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Add New Vehicle CTA */}
      <div className="p-4 border-t border-slate-800/80">
        <NavLink
          to="/vehicles/new"
          className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all border border-slate-700 hover:border-slate-600"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          List New Vehicle
        </NavLink>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#090d18] flex items-center justify-between">
        <div className="flex items-center gap-3 truncate">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-blue-400 shrink-0">
            {(userDoc?.name || 'V')[0].toUpperCase()}
          </div>
          <div className="truncate">
            <p className="font-bold text-xs text-white truncate">{userDoc?.name || 'Vendor'}</p>
            <p className="text-[11px] text-slate-500 truncate">{userDoc?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </aside>
  )
}
