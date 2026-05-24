import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Loading spinner shared component
function LoadingSpinner({ full = true, dark = false }) {
  return (
    <div className={`${full ? 'min-h-screen' : ''} flex items-center justify-center ${dark ? 'bg-black' : 'bg-background'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className={`w-12 h-12 border-4 ${dark ? 'border-white/30 border-t-white' : 'border-primary-container border-t-transparent'} rounded-full animate-spin`} />
        {!dark && <p className="text-label-md text-secondary">Loading Fleet...</p>}
      </div>
    </div>
  )
}

// Basic login required
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// KYC approved required (booking ke liye)
export function VerifiedRoute({ children }) {
  const { user, userDoc, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (userDoc?.kycStatus !== 'approved') {
    return (
      <Navigate
        to="/verify"
        state={{ message: 'Complete KYC verification to book vehicles', from: location }}
        replace
      />
    )
  }

  return children
}

// Admin only
export function AdminRoute({ children }) {
  const { user, userDoc, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user || userDoc?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// Owner/Vendor only
export function OwnerRoute({ children }) {
  const { user, userDoc, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (userDoc?.role !== 'owner' && userDoc?.role !== 'admin') {
    return <Navigate to="/host" replace />
  }
  return children
}

/**
 * RoleRoute — only allow users with a specific role.
 * - Not logged in → /login
 * - Role not yet loaded (undefined) → tiny dark spinner (< 500ms)
 * - Role loaded but null (no role set) → /choose-role
 * - Wrong role → correct home
 * - Correct role → render
 */
export function RoleRoute({ allowedRole, children }) {
  const { user, userRole } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  // Role not yet loaded from Firestore — brief moment only
  if (userRole === undefined) return <LoadingSpinner dark />

  // No role set yet — send to role selection
  if (userRole === null) return <Navigate to="/choose-role" replace />

  // Admin bypass — always allow access regardless of role
  if (userRole === 'admin') return children

  // Wrong role — redirect to correct home
  if (userRole !== allowedRole) {
    return <Navigate to={userRole === 'vendor' ? '/vendor' : '/'} replace />
  }

  return children
}
