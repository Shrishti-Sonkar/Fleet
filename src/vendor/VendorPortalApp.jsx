import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const VendorLoginPage = lazy(() => import('./VendorLoginPage'))
const VendorDashboardPage = lazy(() => import('./VendorDashboardPage'))
const VendorVehiclesPage = lazy(() => import('./VendorVehiclesPage'))
const VendorAddVehiclePage = lazy(() => import('./VendorAddVehiclePage'))
const VendorBookingsPage = lazy(() => import('./VendorBookingsPage'))
const VendorHandoverPage = lazy(() => import('./VendorHandoverPage'))
const VendorEarningsPage = lazy(() => import('./VendorEarningsPage'))
const VendorPayoutsPage = lazy(() => import('./VendorPayoutsPage'))
const VendorSettingsPage = lazy(() => import('./VendorSettingsPage'))

function VendorLoader() {
  return (
    <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-slate-400">
      <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function PendingPartnerGate({ userDoc, onRequest, requesting, onLogout }) {
  const isRequested = Boolean(userDoc?.vendorRequested)

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="w-full max-w-md bg-[#0e1424] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-3xl">hourglass_top</span>
        </div>
        <h1 className="text-xl font-extrabold text-white mb-2">
          {isRequested ? 'Partner Approval Pending' : 'Vendor Access Required'}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {isRequested
            ? 'Your Fleet Partner account request is under review by our team. Once approved, your dashboard will unlock automatically.'
            : 'This account is currently registered as a customer. Request vendor partner access or switch to the customer marketplace.'}
        </p>
        <div className="space-y-3">
          {!isRequested && (
            <button
              onClick={onRequest}
              disabled={requesting}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {requesting ? 'Submitting...' : 'Request Vendor Partner Access'}
            </button>
          )}
          <a
            href="https://fleetmobilities.in"
            className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all"
          >
            Go to Customer Marketplace (.in)
          </a>
          <button
            onClick={onLogout}
            className="w-full py-2.5 text-slate-400 hover:text-red-400 text-xs font-bold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

function ProtectedVendorRoute({ children }) {
  const { user, userDoc, loading, switchRole, logout } = useAuth()
  const [requesting, setRequesting] = useState(false)

  if (loading) return <VendorLoader />
  if (!user) return <Navigate to="/login" replace />
  if (userDoc === undefined) return <VendorLoader />

  const isAuthorizedVendor = ['vendor', 'owner', 'admin'].includes(userDoc?.role)
  if (!isAuthorizedVendor) {
    const handleRequest = async () => {
      setRequesting(true)
      try {
        await switchRole('vendor')
        toast.success('Vendor partner request submitted!')
      } catch (err) {
        toast.error(err.message || 'Could not submit request')
      } finally {
        setRequesting(false)
      }
    }
    return (
      <PendingPartnerGate
        userDoc={userDoc}
        onRequest={handleRequest}
        requesting={requesting}
        onLogout={logout}
      />
    )
  }

  return children
}

export default function VendorPortalApp() {
  useEffect(() => {
    document.title = 'Fleet Partner — Vendor Portal'
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<VendorLoader />}>
        <Routes>
          <Route path="/login" element={<VendorLoginPage />} />
          <Route path="/" element={<ProtectedVendorRoute><VendorDashboardPage /></ProtectedVendorRoute>} />
          <Route path="/vehicles" element={<ProtectedVendorRoute><VendorVehiclesPage /></ProtectedVendorRoute>} />
          <Route path="/vehicles/new" element={<ProtectedVendorRoute><VendorAddVehiclePage /></ProtectedVendorRoute>} />
          <Route path="/bookings" element={<ProtectedVendorRoute><VendorBookingsPage /></ProtectedVendorRoute>} />
          <Route path="/handover/:id" element={<ProtectedVendorRoute><VendorHandoverPage /></ProtectedVendorRoute>} />
          <Route path="/earnings" element={<ProtectedVendorRoute><VendorEarningsPage /></ProtectedVendorRoute>} />
          <Route path="/payouts" element={<ProtectedVendorRoute><VendorPayoutsPage /></ProtectedVendorRoute>} />
          <Route path="/settings" element={<ProtectedVendorRoute><VendorSettingsPage /></ProtectedVendorRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
