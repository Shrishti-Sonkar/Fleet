import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { useAuth } from './context/AuthContext'
import {
  ProtectedRoute, VerifiedRoute, AdminRoute, RoleRoute,
} from './components/ProtectedRoute'
import RenterNav from './components/RenterNav'
import VendorNav from './components/VendorNav'

// Eager import: no splash
import LoginPage from './pages/LoginPage'

// Lazy imports — all pages
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const HomePage           = lazy(() => import('./pages/HomePage'))
const BrowsePage         = lazy(() => import('./pages/BrowsePage'))
const VehicleDetailPage  = lazy(() => import('./pages/VehicleDetailPage'))
const BookingPage        = lazy(() => import('./pages/BookingPage'))
const ActiveRidePage     = lazy(() => import('./pages/ActiveRidePage'))
const MyBookingsPage     = lazy(() => import('./pages/MyBookingsPage'))
const WishlistPage       = lazy(() => import('./pages/WishlistPage'))
const VendorHomePage     = lazy(() => import('./pages/VendorHomePage'))
const OwnerDashboard     = lazy(() => import('./pages/OwnerDashboard'))
const HostPage           = lazy(() => import('./pages/HostPage'))
const AddVehiclePage     = lazy(() => import('./pages/AddVehiclePage'))
const ProfilePage        = lazy(() => import('./pages/ProfilePage'))
const AboutPage          = lazy(() => import('./pages/AboutPage'))
const SupportPage        = lazy(() => import('./pages/SupportPage'))
const VerificationPage   = lazy(() => import('./pages/VerificationPage'))
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'))
const EditProfilePage    = lazy(() => import('./pages/EditProfilePage'))
const NotificationsPage  = lazy(() => import('./pages/NotificationsPage'))
const LegalPage          = lazy(() => import('./pages/LegalPage'))
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'))
const WalletPage         = lazy(() => import('./pages/WalletPage'))
const BookingDetailPage  = lazy(() => import('./pages/BookingDetailPage'))
const VendorEarningsPage = lazy(() => import('./pages/VendorEarningsPage'))
const VendorPayoutsPage  = lazy(() => import('./pages/VendorPayoutsPage'))
const AdminOpsPage       = lazy(() => import('./pages/AdminOpsPage'))

// Loading fallback
function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-container-lowest">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 rounded-full bg-primary-container/20 animate-ping" />
        <div className="w-10 h-10 border-[3px] border-surface-container-high border-t-primary-container rounded-full animate-spin" />
      </div>
      <p className="mt-6 text-label-md font-label-md text-on-surface-variant tracking-wide animate-pulse">
        Loading...
      </p>
    </div>
  )
}

// Role-aware bottom nav
function RoleNav() {
  const { user, isRenter, isVendor } = useAuth()
  if (!user) return null
  if (isRenter) return <RenterNav />
  if (isVendor) return <VendorNav />
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── PUBLIC ── */}
          <Route path={ROUTES.LOGIN}          element={<LoginPage />} />
          <Route path="/signup"               element={<LoginPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.ABOUT}          element={<AboutPage />} />
          <Route path={ROUTES.SUPPORT}        element={<SupportPage />} />
          <Route path={ROUTES.TERMS}          element={<LegalPage />} />
          <Route path={ROUTES.PRIVACY}        element={<LegalPage />} />
          <Route path={ROUTES.REFUND_POLICY}  element={<LegalPage />} />
          <Route path={ROUTES.CANCELLATION_POLICY} element={<LegalPage />} />
          <Route path={ROUTES.INSURANCE_POLICY} element={<LegalPage />} />
          <Route path={ROUTES.SAFETY}         element={<LegalPage />} />
          <Route path={ROUTES.CONTACT}        element={<LegalPage />} />

          {/* ── RENTER ROUTES ── */}
          <Route path={ROUTES.HOME} element={
            <RoleRoute allowedRole="renter"><HomePage /></RoleRoute>
          } />
          <Route path={ROUTES.BROWSE} element={
            <RoleRoute allowedRole="renter"><BrowsePage /></RoleRoute>
          } />
          <Route path={ROUTES.VEHICLE_DETAIL()} element={
            <RoleRoute allowedRole="renter"><VehicleDetailPage /></RoleRoute>
          } />
          <Route path={ROUTES.MY_BOOKINGS} element={
            <RoleRoute allowedRole="renter"><MyBookingsPage /></RoleRoute>
          } />
          <Route path={ROUTES.BOOKING_DETAIL()} element={
            <RoleRoute allowedRole="renter"><BookingDetailPage /></RoleRoute>
          } />
          <Route path={ROUTES.WISHLIST} element={
            <RoleRoute allowedRole="renter"><WishlistPage /></RoleRoute>
          } />
          <Route path={ROUTES.WALLET} element={
            <RoleRoute allowedRole="renter"><WalletPage /></RoleRoute>
          } />
          <Route path={ROUTES.BOOKING()} element={
            <RoleRoute allowedRole="renter"><VerifiedRoute><BookingPage /></VerifiedRoute></RoleRoute>
          } />
          <Route path={ROUTES.ACTIVE_RIDE()} element={
            <RoleRoute allowedRole="renter"><ActiveRidePage /></RoleRoute>
          } />

          {/* ── VENDOR ROUTES ── */}
          <Route path={ROUTES.VENDOR_HOME} element={
            <RoleRoute allowedRole="vendor"><VendorHomePage /></RoleRoute>
          } />
          <Route path={ROUTES.VENDOR_DASHBOARD} element={
            <RoleRoute allowedRole="vendor"><OwnerDashboard /></RoleRoute>
          } />
          <Route path={ROUTES.VENDOR_ADD} element={
            <RoleRoute allowedRole="vendor"><AddVehiclePage /></RoleRoute>
          } />
          <Route path={ROUTES.VENDOR_EARNINGS} element={
            <RoleRoute allowedRole="vendor"><VendorEarningsPage /></RoleRoute>
          } />
          <Route path={ROUTES.VENDOR_PAYOUTS} element={
            <RoleRoute allowedRole="vendor"><VendorPayoutsPage /></RoleRoute>
          } />
          <Route path={ROUTES.HOST} element={
            <HostPage />
          } />

          {/* ── VERIFY (renter KYC) ── */}
          <Route path={ROUTES.VERIFY} element={
            <ProtectedRoute><VerificationPage /></ProtectedRoute>
          } />

          {/* ── SHARED (both roles) ── */}
          <Route path={ROUTES.PROFILE} element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/profile/edit" element={
            <ProtectedRoute><EditProfilePage /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationsPage /></ProtectedRoute>
          } />

          {/* ── ADMIN ── */}
          <Route path={ROUTES.ADMIN} element={
            <AdminRoute><AdminDashboard /></AdminRoute>
          } />
          <Route path={ROUTES.ADMIN_REPORTS} element={
            <AdminRoute><AdminOpsPage /></AdminRoute>
          } />
          <Route path={ROUTES.ADMIN_COUPONS} element={
            <AdminRoute><AdminOpsPage /></AdminRoute>
          } />
          <Route path={ROUTES.ADMIN_SETTINGS} element={
            <AdminRoute><AdminOpsPage /></AdminRoute>
          } />

          {/* ── CATCH ALL ── */}
          <Route path="*" element={<NotFoundPage />} />

        </Routes>

        {/* Role-aware bottom navigation (renders outside Routes) */}
        <RoleNav />
      </Suspense>
    </BrowserRouter>
  )
}
