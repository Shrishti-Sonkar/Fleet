import { BrowserRouter, Routes, Route, Navigate } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'

import VendorLoginPage from './pages/VendorLoginPage'
import VendorDashboardPage from './pages/VendorDashboardPage'
import VendorVehiclesPage from './pages/VendorVehiclesPage'
import VendorAddVehiclePage from './pages/VendorAddVehiclePage'
import VendorBookingsPage from './pages/VendorBookingsPage'
import VendorHandoverPage from './pages/VendorHandoverPage'
import VendorEarningsPage from './pages/VendorEarningsPage'
import VendorPayoutsPage from './pages/VendorPayoutsPage'
import VendorSettingsPage from './pages/VendorSettingsPage'

function ProtectedVendorRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth */}
          <Route path="/login" element={<VendorLoginPage />} />

          {/* Protected Vendor Portal Routes */}
          <Route
            path="/"
            element={
              <ProtectedVendorRoute>
                <VendorDashboardPage />
              </ProtectedVendorRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <ProtectedVendorRoute>
                <VendorVehiclesPage />
              </ProtectedVendorRoute>
            }
          />
          <Route
            path="/vehicles/new"
            element={
              <ProtectedVendorRoute>
                <VendorAddVehiclePage />
              </ProtectedVendorRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedVendorRoute>
                <VendorBookingsPage />
              </ProtectedVendorRoute>
            }
          />
          <Route
            path="/handover/:id"
            element={
              <ProtectedVendorRoute>
                <VendorHandoverPage />
              </ProtectedVendorRoute>
            }
          />
          <Route
            path="/earnings"
            element={
              <ProtectedVendorRoute>
                <VendorEarningsPage />
              </ProtectedVendorRoute>
            }
          />
          <Route
            path="/payouts"
            element={
              <ProtectedVendorRoute>
                <VendorPayoutsPage />
              </ProtectedVendorRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedVendorRoute>
                <VendorSettingsPage />
              </ProtectedVendorRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
