import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', label: 'Overview', icon: 'dashboard' },
  { path: '/vendors', label: 'Vendors & Splits', icon: 'percent' },
  { path: '/kyc', label: 'KYC Requests', icon: 'verified_user' },
  { path: '/vehicles', label: 'All Vehicles', icon: 'directions_car' },
  { path: '/bookings', label: 'All Bookings', icon: 'confirmation_number' },
  { path: '/users', label: 'Users', icon: 'people' },
  { path: '/payments', label: 'Payments', icon: 'payments' },
  { path: '/coupons', label: 'Coupons', icon: 'local_offer' },
  { path: '/reports', label: 'Reports', icon: 'flag' },
  { path: '/settings', label: 'Site & Settings', icon: 'tune' },
]

export default function AdminSidebar() {
  const { user, userDoc, logout } = useAuth()

  return (
    <aside className="w-64 bg-[#0b1120] border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-orange-600/30">
          F
        </div>
        <div>
          <h1 className="font-extrabold text-base text-white tracking-tight">Fleet Control</h1>
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-950/70 px-2 py-0.5 rounded border border-orange-800/50">
            Admin Console
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Admin Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#080c17] flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-orange-400 shrink-0">
            {(userDoc?.name || userDoc?.adminId || 'A')[0].toUpperCase()}
          </div>
          <div className="truncate">
            <p className="font-bold text-xs text-white truncate">{userDoc?.name || 'Admin'}</p>
            <p className="text-[10px] text-slate-500 truncate">{userDoc?.adminId || user?.uid}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </aside>
  )
}
