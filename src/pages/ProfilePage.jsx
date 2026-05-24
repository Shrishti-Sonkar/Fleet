import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateDoc, doc, serverTimestamp, collection, getDocs, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, userDoc, logout, isAdmin, isOwner, refreshUserDoc, isVendor, isRenter } = useAuth()
  const navigate = useNavigate()

  // ── Profile edit ──────────────────────────────────────────────────────────
  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState(userDoc?.name || '')
  const [phone, setPhone]       = useState(userDoc?.phone || '')
  const [saving, setSaving]     = useState(false)

  // ── Section tabs ──────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('profile') // 'profile' | 'verification'

  // ── Selfie / camera ───────────────────────────────────────────────────────
  const [cameraStream, setCameraStream]       = useState(null)
  const [selfiePreview, setSelfiePreview]     = useState(userDoc?.selfieUrl || null)
  const [uploadingSelfie, setUploadingSelfie] = useState(false)
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)

  // ── Profile handlers ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { name, phone, updatedAt: serverTimestamp() })
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

  const handleSwitchRole = async () => {
    const newRole = isVendor ? 'renter' : 'vendor'
    const confirmed = window.confirm(
      `Switch to ${newRole} mode? You'll be taken to your new home screen. You can switch back anytime.`
    )
    if (!confirmed) return
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole })
      await refreshUserDoc()
      toast.success(`Switched to ${newRole} mode!`)
      navigate(newRole === 'vendor' ? '/vendor' : '/', { replace: true })
    } catch {
      toast.error('Failed to switch role. Try again.')
    }
  }

  // ── Camera handlers ───────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      setCameraStream(stream)
      // Small delay to let React render the video element
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 100)
    } catch {
      toast.error('Camera access denied. Please upload a photo instead.')
    }
  }

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
  }

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    canvasRef.current.width  = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    canvasRef.current.toBlob(async (blob) => {
      const preview = URL.createObjectURL(blob)
      setSelfiePreview(preview)
      stopCamera()
      await uploadSelfieBlob(blob)
    }, 'image/jpeg', 0.9)
  }

  const uploadSelfieBlob = async (blob) => {
    if (!user) return
    setUploadingSelfie(true)
    try {
      const storageRef = ref(storage, `kyc/${user.uid}/selfie`)
      await uploadBytes(storageRef, blob)
      const url = await getDownloadURL(storageRef)
      await updateDoc(doc(db, 'users', user.uid), {
        selfieUrl: url,
        updatedAt: serverTimestamp(),
      })
      await refreshUserDoc()
      toast.success('Selfie uploaded successfully!')
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploadingSelfie(false)
    }
  }

  const handleSelfieFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.')
      return
    }
    setSelfiePreview(URL.createObjectURL(file))
    await uploadSelfieBlob(file)
  }

  // ── KYC config ────────────────────────────────────────────────────────────
  const kycStatusConfig = {
    not_submitted: { label: 'Not Submitted', color: 'bg-surface-container text-secondary',   icon: 'pending',       action: '/verify', actionLabel: 'Start Verification' },
    pending:       { label: 'Under Review',  color: 'bg-yellow-100 text-yellow-800',          icon: 'schedule',      action: null,      actionLabel: null },
    approved:      { label: 'Verified ✅',   color: 'bg-green-100 text-green-800',            icon: 'verified_user', action: null,      actionLabel: null },
    rejected:      { label: 'Rejected',      color: 'bg-red-100 text-red-800',               icon: 'cancel',        action: '/verify', actionLabel: 'Re-submit Documents' },
  }
  const kyc = kycStatusConfig[userDoc?.kycStatus || 'not_submitted']

  // ── Section tab definitions ───────────────────────────────────────────────
  const sections = [
    { key: 'profile',       label: 'Profile',       icon: 'person' },
    { key: 'verification',  label: 'Verification',  icon: 'verified_user' },
  ]

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Avatar + Name ── */}
        <div className="flex flex-col items-center text-center mb-8">
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

        {/* ── Section Tab Bar ── */}
        <div className="flex gap-1 mb-6 bg-surface-container p-1 rounded-xl overflow-x-auto">
          {sections.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-label-md font-medium transition-all whitespace-nowrap ${
                activeSection === key
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            PROFILE SECTION
        ════════════════════════════════════════════════ */}
        {activeSection === 'profile' && (
          <div className="space-y-5">
            {/* KYC Banner */}
            {userDoc?.kycStatus !== 'approved' && (
              <div className="p-4 border border-outline-variant rounded-2xl bg-surface-container-lowest flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {kyc.icon}
                  </span>
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
                    className="shrink-0 h-9 px-4 bg-primary-container text-white rounded-lg font-bold text-label-md hover:opacity-90 transition-all flex items-center"
                  >
                    {kyc.actionLabel}
                  </Link>
                )}
              </div>
            )}

            {/* Profile Details Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
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
                      onChange={e => setName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-label-md text-secondary block mb-1">Phone Number</label>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
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
                    { label: 'Full Name',     value: userDoc?.name || '—',  icon: 'person' },
                    { label: 'Email',         value: user?.email || '—',    icon: 'mail' },
                    { label: 'Phone',         value: userDoc?.phone || '—', icon: 'phone' },
                    {
                      label: 'Member Since',
                      value: userDoc?.createdAt?.toDate
                        ? userDoc.createdAt.toDate().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                        : '—',
                      icon: 'calendar_month',
                    },
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
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
              {[
                { label: 'My Bookings',   icon: 'confirmation_number', to: '/my-bookings' },
                ...(isOwner() ? [{ label: 'Owner Dashboard', icon: 'dashboard', to: '/dashboard' }] : []),
                ...(isAdmin() ? [{ label: 'Admin Panel', icon: 'admin_panel_settings', to: '/admin' }] : []),
                { label: 'Browse Vehicles', icon: 'search', to: '/browse' },
                { label: 'Help & Support',  icon: 'help',   to: '/support' },
              ].map(({ label, icon, to }, i, arr) => (
                <Link
                  key={label}
                  to={to}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-surface-container transition-all ${
                    i < arr.length - 1 ? 'border-b border-outline-variant' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[18px]">{icon}</span>
                    <span className="font-medium text-on-surface text-label-md">{label}</span>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
                </Link>
              ))}
            </div>

            {/* [DEV] Developer Console — Admin only */}
            {isAdmin() && (
              <div className="p-5 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-purple-800">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>build</span>
                  <span className="font-bold text-label-md">Developer Console</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Reset current user tokens */}
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'users', user.uid), {
                          tokens: 10,
                          tokensUsed: 0,
                          updatedAt: serverTimestamp()
                        })
                        await refreshUserDoc()
                        toast.success('Your tokens have been reset to 10!')
                      } catch (err) {
                        toast.error('Failed to reset tokens: ' + err.message)
                      }
                    }}
                    className="h-11 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2 text-label-md shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    Reset My Tokens (10)
                  </button>

                  {/* Migrate All Users */}
                  <button
                    onClick={async () => {
                      try {
                        const querySnapshot = await getDocs(collection(db, 'users'))
                        const batch = writeBatch(db)
                        let count = 0

                        querySnapshot.forEach((docSnap) => {
                          const data = docSnap.data()
                          if (data.tokens === undefined) {
                            batch.update(docSnap.ref, {
                              tokens: 10,
                              tokensUsed: 0
                            })
                            count++
                          }
                        })

                        if (count > 0) {
                          await batch.commit()
                          toast.success(`Successfully migrated ${count} users!`)
                          await refreshUserDoc()
                        } else {
                          toast.success('All existing users already have tokens.')
                        }
                      } catch (err) {
                        toast.error('Migration failed: ' + err.message)
                      }
                    }}
                    className="h-11 bg-white text-purple-700 font-bold border border-purple-300 rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-label-md shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">database</span>
                    Migrate All Users
                  </button>
                </div>

                {userDoc?.role !== 'admin' && (
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'users', user.uid), { role: 'admin' })
                        await refreshUserDoc()
                        toast.success('You are now an Admin! Enjoy dev features.')
                      } catch (err) {
                        toast.error('Failed to make admin: ' + err.message)
                      }
                    }}
                    className="w-full h-11 bg-purple-100 text-purple-800 font-bold rounded-xl hover:bg-purple-200 transition-all flex items-center justify-center gap-2 text-label-md border border-purple-200"
                  >
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    Make Me Admin
                  </button>
                )}
              </div>
            )}

            {/* Account Type / Role Switcher */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="text-xs text-secondary mb-1 font-medium">Account Type</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">
                    {isVendor ? '🏢 Vehicle Owner (Vendor)' : isRenter ? '🚗 Renter' : '— Not set'}
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    {isVendor ? 'You can list vehicles and earn' : 'You can browse and book vehicles'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSwitchRole}
                className="mt-3 text-sm font-bold text-primary hover:underline flex items-center gap-1"
              >
                Switch to {isVendor ? 'Renter' : 'Vendor'} account →
              </button>
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
        )}

        {/* ════════════════════════════════════════════════
            VERIFICATION SECTION
        ════════════════════════════════════════════════ */}
        {activeSection === 'verification' && (
          <div className="space-y-5">

            {/* KYC Status Banner */}
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
              userDoc?.kycStatus === 'approved'
                ? 'bg-green-50 border-green-200'
                : userDoc?.kycStatus === 'pending'
                ? 'bg-yellow-50 border-yellow-200'
                : userDoc?.kycStatus === 'rejected'
                ? 'bg-red-50 border-red-200'
                : 'bg-surface-container border-outline-variant'
            }`}>
              <span
                className={`material-symbols-outlined text-[32px] shrink-0 ${
                  userDoc?.kycStatus === 'approved'  ? 'text-green-600'  :
                  userDoc?.kycStatus === 'pending'   ? 'text-yellow-600' :
                  userDoc?.kycStatus === 'rejected'  ? 'text-red-600'    :
                  'text-secondary'
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {userDoc?.kycStatus === 'approved'  ? 'verified_user' :
                 userDoc?.kycStatus === 'pending'   ? 'pending'       :
                 userDoc?.kycStatus === 'rejected'  ? 'gpp_bad'       :
                 'shield'}
              </span>
              <div>
                <p className="font-bold text-on-surface">
                  {userDoc?.kycStatus === 'approved'  ? 'Identity Verified ✓'          :
                   userDoc?.kycStatus === 'pending'   ? 'Verification Under Review'    :
                   userDoc?.kycStatus === 'rejected'  ? 'Verification Failed — Resubmit' :
                   'Identity Not Verified'}
                </p>
                <p className="text-label-md text-secondary">
                  {userDoc?.kycStatus === 'approved'
                    ? 'You can book any vehicle on Fleet'
                    : userDoc?.kycStatus === 'pending'
                    ? 'Our team will review within 24 hours'
                    : 'Complete verification to unlock bookings'}
                </p>
              </div>
            </div>

            {/* ── Selfie Card ── */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
                    face
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-on-surface">Live Selfie</h3>
                  <p className="text-label-md text-secondary">Required for identity verification</p>
                </div>
                {userDoc?.selfieUrl && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 shrink-0">
                    Uploaded ✓
                  </span>
                )}
              </div>

              {/* Camera view */}
              {cameraStream ? (
                <div className="relative mb-4 rounded-2xl overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-44 h-56 border-4 border-white/70 rounded-full" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button
                      onClick={stopCamera}
                      className="px-5 py-2.5 bg-white/90 text-on-surface font-bold rounded-full text-label-md hover:bg-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={captureSelfie}
                      className="px-6 py-2.5 bg-primary-container text-white font-bold rounded-full text-label-md flex items-center gap-2 hover:opacity-90 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      Capture
                    </button>
                  </div>
                </div>
              ) : selfiePreview ? (
                /* Selfie preview */
                <div className="relative mb-4 rounded-2xl overflow-hidden">
                  <img
                    src={selfiePreview}
                    alt="Your selfie"
                    className="w-full max-h-64 object-cover rounded-2xl"
                  />
                  {uploadingSelfie && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-label-md">Uploading...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state */
                <div className="bg-surface-container rounded-2xl p-8 flex flex-col items-center mb-4 border-2 border-dashed border-outline-variant">
                  <span className="material-symbols-outlined text-5xl text-secondary mb-3">add_a_photo</span>
                  <p className="text-body-lg font-medium text-on-surface mb-1">No selfie yet</p>
                  <p className="text-label-md text-secondary text-center">
                    Take a clear photo in good lighting. Face must be fully visible.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {!cameraStream && (
                <div className="flex gap-3">
                  <button
                    id="open-camera-btn"
                    onClick={startCamera}
                    className="flex-1 h-11 bg-primary-container text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    Open Camera
                  </button>
                  <label className="flex-1 h-11 border-2 border-outline-variant rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:border-primary-container hover:bg-primary-fixed transition-all">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={handleSelfieFile}
                    />
                  </label>
                </div>
              )}

              <p className="text-label-sm text-secondary text-center mt-3">
                🔒 Your selfie is encrypted and only used for KYC verification
              </p>
            </div>

            {/* ── Aadhaar Card ── */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Aadhaar Card</h3>
                    <p className="text-label-md text-secondary">Government ID</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  userDoc?.aadhaarUrl ? 'bg-green-100 text-green-700' : 'bg-surface-container text-secondary'
                }`}>
                  {userDoc?.aadhaarUrl ? 'Uploaded ✓' : 'Not uploaded'}
                </span>
              </div>
              {userDoc?.aadhaarUrl ? (
                <a
                  href={userDoc.aadhaarUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2 text-primary text-label-md font-bold hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  View uploaded Aadhaar
                </a>
              ) : (
                <button
                  onClick={() => navigate('/verify')}
                  className="w-full h-11 border-2 border-primary-container text-primary font-bold rounded-xl hover:bg-primary-fixed transition-all"
                >
                  Upload Aadhaar →
                </button>
              )}
            </div>

            {/* ── Driving License ── */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>drive_eta</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Driving License</h3>
                    <p className="text-label-md text-secondary">Valid Indian DL required</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  userDoc?.dlUrl ? 'bg-green-100 text-green-700' : 'bg-surface-container text-secondary'
                }`}>
                  {userDoc?.dlUrl ? 'Uploaded ✓' : 'Not uploaded'}
                </span>
              </div>
              {userDoc?.dlUrl ? (
                <a
                  href={userDoc.dlUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2 text-primary text-label-md font-bold hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  View uploaded License
                </a>
              ) : (
                <button
                  onClick={() => navigate('/verify')}
                  className="w-full h-11 border-2 border-primary-container text-primary font-bold rounded-xl hover:bg-primary-fixed transition-all"
                >
                  Upload Driving License →
                </button>
              )}
            </div>

            {/* Full KYC CTA */}
            {(userDoc?.kycStatus === 'not_submitted' || userDoc?.kycStatus === 'rejected') && (
              <button
                onClick={() => navigate('/verify')}
                className="w-full h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                Complete Full KYC Verification →
              </button>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
