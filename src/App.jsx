import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

// ── Eager import: SplashPage loads instantly (entry screen) ──
import SplashPage from './pages/SplashPage'

// ── Lazy imports: each page is a separate chunk, loaded on demand ──
const LoginPage = lazy(() => import('./pages/LoginPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const HostPage = lazy(() => import('./pages/HostPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))

// ── Loading fallback: branded spinner matching the design system ──
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

// New pages
import VerificationPage from './pages/VerificationPage'
import OwnerDashboard from './pages/OwnerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProfilePage from './pages/ProfilePage'
import MyBookingsPage from './pages/MyBookingsPage'
import AddVehiclePage from './pages/AddVehiclePage'

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public routes ── */}
          <Route path={ROUTES.SPLASH} element={<SplashPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.BROWSE} element={<BrowsePage />} />
          <Route path={ROUTES.VEHICLE_DETAIL()} element={<VehicleDetailPage />} />
          <Route path={ROUTES.BOOKING()} element={<BookingPage />} />
          <Route path={ROUTES.HOST} element={<HostPage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.SUPPORT} element={<SupportPage />} />

          {/* ── Future: wrap routes needing auth ──
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.BOOKING()} element={<BookingPage />} />
          </Route>
          */}

          {/* ── Catch-all redirect ── */}
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}