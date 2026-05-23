import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, VerifiedRoute, AdminRoute } from './components/ProtectedRoute'

// Existing pages
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import BookingPage from './pages/BookingPage'
import HostPage from './pages/HostPage'
import AboutPage from './pages/AboutPage'
import SupportPage from './pages/SupportPage'

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
      <Routes>
        {/* Public routes */}
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/vehicle/:id" element={<VehicleDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/host" element={<HostPage />} />

        {/* Protected: Login required */}
        <Route path="/verify" element={
          <ProtectedRoute><VerificationPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/my-bookings" element={
          <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
        } />

        {/* Protected: KYC verified required */}
        <Route path="/booking/:id" element={
          <VerifiedRoute><BookingPage /></VerifiedRoute>
        } />

        {/* Protected: Owner/Admin only */}
        <Route path="/dashboard" element={
          <ProtectedRoute><OwnerDashboard /></ProtectedRoute>
        } />
        <Route path="/add-vehicle" element={
          <ProtectedRoute><AddVehiclePage /></ProtectedRoute>
        } />

        {/* Protected: Admin only */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
