import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { ProtectedRoute, VerifiedRoute, AdminRoute } from './components/ProtectedRoute'

// Eager import: SplashPage loads instantly (entry screen)
import SplashPage from './pages/SplashPage'

// Lazy imports
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const HostPage = lazy(() => import('./pages/HostPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const VerificationPage = lazy(() => import('./pages/VerificationPage'))
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'))
const AddVehiclePage = lazy(() => import('./pages/AddVehiclePage'))
const WishlistPage = lazy(() => import('./pages/WishlistPage'))

// Loading fallback
function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-container-lowest">
      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        <div className="absolute w-16 h-16 rounded-full bg-primary-container/20 animate-ping" />
        {/* Spinner ring */}
        <div className="w-10 h-10 border-[3px] border-surface-container-high border-t-primary-container rounded-full animate-spin" />
      </div>
      <p className="mt-6 text-label-md font-label-md text-on-surface-variant tracking-wide animate-pulse">
        Loading...
      </p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.SPLASH} element={<SplashPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.BROWSE} element={<BrowsePage />} />
          <Route path={ROUTES.VEHICLE_DETAIL()} element={<VehicleDetailPage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.SUPPORT} element={<SupportPage />} />
          <Route path={ROUTES.HOST} element={<HostPage />} />

          {/* Protected: Login required */}
          <Route path={ROUTES.VERIFY} element={
            <ProtectedRoute><VerificationPage /></ProtectedRoute>
          } />
          <Route path={ROUTES.PROFILE} element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path={ROUTES.MY_BOOKINGS} element={
            <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
          } />
          <Route path={ROUTES.WISHLIST} element={
            <ProtectedRoute><WishlistPage /></ProtectedRoute>
          } />

          {/* Protected: KYC verified required */}
          <Route path={ROUTES.BOOKING()} element={
            <VerifiedRoute><BookingPage /></VerifiedRoute>
          } />

          {/* Protected: Owner/Admin only */}
          <Route path={ROUTES.DASHBOARD} element={
            <ProtectedRoute><OwnerDashboard /></ProtectedRoute>
          } />
          <Route path={ROUTES.ADD_VEHICLE} element={
            <ProtectedRoute><AddVehiclePage /></ProtectedRoute>
          } />

          {/* Protected: Admin only */}
          <Route path={ROUTES.ADMIN} element={
            <AdminRoute><AdminDashboard /></AdminRoute>
          } />

          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}