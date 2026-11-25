import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function VendorLayout({ children, title, subtitle }) {
  const { user, userDoc } = useAuth()

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight">{title || 'Vendor Portal'}</h1>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Store Active
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-200">{userDoc?.name || 'Vendor'}</p>
              <p className="text-[10px] text-slate-500">{userDoc?.phone || userDoc?.email || user?.email}</p>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
