import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import BookingPage from './pages/BookingPage'
import HostPage from './pages/HostPage'
import AboutPage from './pages/AboutPage'
import SupportPage from './pages/SupportPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/vehicle/:id" element={<VehicleDetailPage />} />
        <Route path="/booking/:id" element={<BookingPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
