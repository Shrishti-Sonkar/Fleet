import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminLoginPage = lazy(() => import('./AdminLoginPage'))
const AdminOverviewPage = lazy(() => import('./AdminOverviewPage'))
const AdminVendorsPage = lazy(() => import('./AdminVendorsPage'))
const AdminKycPage = lazy(() => import('./AdminKycPage'))
const AdminVehiclesPage = lazy(() => import('./AdminVehiclesPage'))
const AdminBookingsPage = lazy(() => import('./AdminBookingsPage'))
const AdminUsersPage = lazy(() => import('./AdminUsersPage'))
const AdminPaymentsPage = lazy(() => import('./AdminPaymentsPage'))
const AdminCouponsPage = lazy(() => import('./AdminCouponsPage'))
const AdminReportsPage = lazy(() => import('./AdminReportsPage'))
const AdminSettingsPage = lazy(() => import('./AdminSettingsPage'))

function AdminLoader() {
  return (
    <div className="min-h-screen bg-[#060911] flex items-center justify-center text-slate-400">
      <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedAdminRoute({ children }) {
  const { user, userDoc, loading, logout } = useAuth()

  if (loading) return <AdminLoader />
  if (!user) return <Navigate to="/login" replace />
  if (userDoc === undefined) return <AdminLoader />

  if (userDoc?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#060911] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0b1120] border border-slate-800 rounded-3xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-rose-400 mb-3 block">gpp_bad</span>
          <h1 className="text-xl font-extrabold text-white mb-2">Administrator Access Required</h1>
          <p className="text-sm text-slate-400 mb-6">
            This session does not have admin privileges. Sign out and sign in with an authorized Admin ID.
          </p>
          <button
            onClick={logout}
            className="w-full h-11 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm"
          >
            Sign Out &amp; Use Admin Login
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default function AdminPortalApp({ basename = '/' }) {
  useEffect(() => {
    document.title = 'Fleet — Admin Console'
  }, [])

  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<AdminLoader />}>
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="/" element={<ProtectedAdminRoute><AdminOverviewPage /></ProtectedAdminRoute>} />
          <Route path="/vendors" element={<ProtectedAdminRoute><AdminVendorsPage /></ProtectedAdminRoute>} />
          <Route path="/kyc" element={<ProtectedAdminRoute><AdminKycPage /></ProtectedAdminRoute>} />
          <Route path="/vehicles" element={<ProtectedAdminRoute><AdminVehiclesPage /></ProtectedAdminRoute>} />
          <Route path="/bookings" element={<ProtectedAdminRoute><AdminBookingsPage /></ProtectedAdminRoute>} />
          <Route path="/users" element={<ProtectedAdminRoute><AdminUsersPage /></ProtectedAdminRoute>} />
          <Route path="/payments" element={<ProtectedAdminRoute><AdminPaymentsPage /></ProtectedAdminRoute>} />
          <Route path="/coupons" element={<ProtectedAdminRoute><AdminCouponsPage /></ProtectedAdminRoute>} />
          <Route path="/reports" element={<ProtectedAdminRoute><AdminReportsPage /></ProtectedAdminRoute>} />
          <Route path="/settings" element={<ProtectedAdminRoute><AdminSettingsPage /></ProtectedAdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
