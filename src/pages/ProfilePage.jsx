import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, userDoc, logout, isAdmin, isOwner } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(userDoc?.name || '')
  const [phone, setPhone] = useState(userDoc?.phone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { name, phone })
      toast.success('Profile updated!')
      setEditing(false)
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const kycStatusConfig = {
    not_submitted: { label: 'Not Submitted', color: 'bg-surface-container text-secondary', icon: 'pending', action: '/verify', actionLabel: 'Start Verification' },
    pending: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: 'schedule', action: null, actionLabel: null },
    approved: { label: 'Verified ✅', color: 'bg-green-100 text-green-800', icon: 'verified_user', action: null, actionLabel: null },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: 'cancel', action: '/verify', actionLabel: 'Re-submit Documents' },
  }

  const kyc = kycStatusConfig[userDoc?.kycStatus || 'not_submitted']

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center mb-4 text-white text-3xl font-bold shadow-premium">
            {(userDoc?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{userDoc?.name || 'Fleet User'}</h1>
          <p className="text-secondary text-label-md mt-1">{user?.email}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${kyc.color}`}>
              {kyc.label}
            </span>
            {(isAdmin() || isOwner()) && (
              <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                {isAdmin() ? 'Admin' : 'Owner'}
              </span>
            )}
          </div>
        </div>

        {/* KYC Banner */}
        {userDoc?.kycStatus !== 'approved' && (
          <div className="mb-6 p-4 border border-outline-variant rounded-2xl bg-surface-container-lowest flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>{kyc.icon}</span>
              <div>
                <p className="font-bold text-on-surface text-label-md">KYC Status: {kyc.label}</p>
                <p className="text-secondary text-[12px]">
                  {userDoc?.kycStatus === 'pending'
                    ? 'Your documents are under review. This usually takes 24 hours.'
                    : userDoc?.kycStatus === 'rejected'
                    ? 'Your documents were rejected. Please re-submit with valid documents.'
                    : 'Verify your identity to start booking vehicles on Fleet.'}
                </p>
              </div>
            </div>
            {kyc.action && (
              <Link
                to={kyc.action}
                className="shrink-0 h-9 px-4 bg-primary-container text-white rounded-lg font-bold text-label-md hover:opacity-90 transition-all"
              >
                {kyc.actionLabel}
              </Link>
            )}
          </div>
        )}

        {/* Profile Details */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-on-surface">Profile Details</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-label-md text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-label-md text-secondary block mb-1">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 h-10 border border-outline-variant rounded-xl text-label-md font-medium hover:bg-surface-container transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] h-10 bg-primary-container text-white rounded-xl font-bold text-label-md hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Full Name', value: userDoc?.name || '—', icon: 'person' },
                { label: 'Email', value: user?.email || '—', icon: 'mail' },
                { label: 'Phone', value: userDoc?.phone || '—', icon: 'phone' },
                { label: 'Member Since', value: userDoc?.createdAt?.toDate ? userDoc.createdAt.toDate().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—', icon: 'calendar_month' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[18px]">{icon}</span>
                  <div>
                    <p className="text-[11px] text-secondary uppercase tracking-wide">{label}</p>
                    <p className="font-medium text-on-surface text-label-md">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden mb-5">
          {[
            { label: 'My Bookings', icon: 'confirmation_number', to: '/my-bookings' },
            ...(isOwner() ? [{ label: 'Owner Dashboard', icon: 'dashboard', to: '/dashboard' }] : []),
            ...(isAdmin() ? [{ label: 'Admin Panel', icon: 'admin_panel_settings', to: '/admin' }] : []),
            { label: 'Browse Vehicles', icon: 'search', to: '/browse' },
            { label: 'Help & Support', icon: 'help', to: '/support' },
          ].map(({ label, icon, to }, i, arr) => (
            <Link
              key={label}
              to={to}
              className={`flex items-center justify-between px-5 py-4 hover:bg-surface-container transition-all ${i < arr.length - 1 ? 'border-b border-outline-variant' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[18px]">{icon}</span>
                <span className="font-medium text-on-surface text-label-md">{label}</span>
              </div>
              <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full h-12 border-2 border-error text-error font-bold rounded-xl hover:bg-error hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign Out
        </button>
      </div>
    </PageLayout>
  )
}
