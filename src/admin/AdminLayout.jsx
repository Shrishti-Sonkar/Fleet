import AdminSidebar from './AdminSidebar'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout({ children, title, subtitle, actions }) {
  const { userDoc } = useAuth()

  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800/80 bg-[#0b1120]/85 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-extrabold text-lg text-white tracking-tight truncate">{title || 'Admin Console'}</h1>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {actions}
            <div className="hidden sm:flex items-center gap-2 bg-orange-950/60 border border-orange-800/50 text-orange-300 px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              {userDoc?.adminId || 'Admin'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
