import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  updateDoc,
  doc,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import { ROUTES } from '../lib/constants'
import toast from 'react-hot-toast'

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

export default function ProfilePage() {
  const { user, userDoc, logout, isAdmin, isOwner, refreshUserDoc, isVendor, isRenter } = useAuth()
  const navigate = useNavigate()

  // ── Stats state ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ trips: 0, rating: '—', savings: 0 })

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('profile') // 'profile' | 'verification' | 'addresses' | 'emergency'

  // ── Address states ────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState([])
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addrLabel, setAddrLabel] = useState('Home')
  const [customLabel, setCustomLabel] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [savingAddr, setSavingAddr] = useState(false)

  // ── Emergency Contact states ──────────────────────────────────────────────
  const [ecName, setEcName] = useState('')
  const [ecPhone, setEcPhone] = useState('')
  const [ecRelation, setEcRelation] = useState('Parent')
  const [savingEC, setSavingEC] = useState(false)

  // ── Captain Mode & Selfie camera states ────────────────────────────────────
  const [captainMode, setCaptainMode] = useState(userDoc?.captainMode ?? false)
  const [cameraStream, setCameraStream] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(userDoc?.selfieUrl || null)
  const [uploadingSelfie, setUploadingSelfie] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // ── Fetch user stats once on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const fetchStats = async () => {
      try {
        // Completed trips
        const tripsSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('renterId', '==', user.uid),
          where('status', '==', 'completed')
        ))

        // Total savings from coupons
        const totalSavings = tripsSnap.docs.reduce((sum, docSnap) => {
          const d = docSnap.data()
          return sum + (d.couponDiscount || d.pricing?.couponSavings || 0)
        }, 0)

        // Average rating received (as renter)
        const reviewsSnap = await getDocs(query(
          collection(db, 'reviews'),
          where('renterId', '==', user.uid)
        ))
        const ratings = reviewsSnap.docs.map(d => d.data().renterRating || d.data().rating).filter(Boolean)
        const avgRating = ratings.length
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : '—'

        setStats({ trips: tripsSnap.size, rating: avgRating, savings: totalSavings })
      } catch (err) {
        console.error('Error fetching user stats:', err)
      }
    }
    fetchStats()
  }, [user])

  // ── Fetch addresses in real-time ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'addresses'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
        setAddresses(list)
      }
    )
    return unsub
  }, [user])

  // ── Pre-fill Emergency Contact ────────────────────────────────────────────
  useEffect(() => {
    if (userDoc?.emergencyContact) {
      setEcName(userDoc.emergencyContact.name || '')
      setEcPhone(userDoc.emergencyContact.phone || '')
      setEcRelation(userDoc.emergencyContact.relation || 'Parent')
    }
  }, [userDoc])

  // ── Sync Captain Mode ─────────────────────────────────────────────────────
  useEffect(() => {
    if (userDoc) {
      setCaptainMode(userDoc.captainMode ?? false)
    }
  }, [userDoc])

  const toggleCaptain = async () => {
    const next = !captainMode
    setCaptainMode(next)
    try {
      await updateDoc(doc(db, 'users', user.uid), { captainMode: next })
      await refreshUserDoc()
      toast.success(next ? '⚡ Captain Mode ON' : 'Captain Mode off')
    } catch (err) {
      console.error(err)
      toast.error('Failed to toggle Captain Mode')
      setCaptainMode(!next) // revert
    }
  }

  // ── KYC Config ────────────────────────────────────────────────────────────
  const kycStatusConfig = {
    not_submitted: { label: 'Not Verified ⚠️', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200', icon: 'shield', action: '/verify', actionLabel: 'Start Verification' },
    pending:       { label: 'Under Review ⏳', color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200', icon: 'schedule', action: null, actionLabel: null },
    approved:      { label: 'Verified ✅',   color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200', icon: 'verified_user', action: null, actionLabel: null },
    rejected:      { label: 'Verification Failed ⚠️', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200', icon: 'cancel', action: '/verify', actionLabel: 'Re-submit Documents' },
  }
  const kyc = kycStatusConfig[userDoc?.kycStatus || 'not_submitted'] || kycStatusConfig.not_submitted

  const kycBannerText = {
    approved: 'Your identity is verified. You can book any vehicle.',
    pending: 'Documents submitted. Under review (1–2 business days).',
    rejected: 'Your documents could not be verified. Please re-upload clear photos.',
    not_submitted: 'Verify your ID to unlock bookings on Fleet.',
  }[userDoc?.kycStatus || 'not_submitted'] || 'Verify your ID to unlock bookings on Fleet.'

  // ── Section Tab Definitions ───────────────────────────────────────────────
  const sections = [
    { key: 'profile',       label: 'Profile',       icon: 'person' },
    { key: 'verification',  label: 'Verification',  icon: 'verified_user' },
    { key: 'addresses',     label: 'Addresses',     icon: 'location_on' },
    { key: 'emergency',     label: 'Emergency',     icon: 'contact_phone' },
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  // ── Address sheet handlers ────────────────────────────────────────────────
  const openAddSheet = () => {
    setEditingAddress(null)
    setAddrLabel('Home')
    setCustomLabel('')
    setLine1('')
    setLine2('')
    setCity('')
    setPincode('')
    setIsDefault(false)
    setIsSheetOpen(true)
  }

  const openEditSheet = (addr) => {
    setEditingAddress(addr)
    setAddrLabel(addr.label || 'Home')
    setCustomLabel(addr.customLabel || '')
    setLine1(addr.line1 || '')
    setLine2(addr.line2 || '')
    setCity(addr.city || '')
    setPincode(addr.pincode || '')
    setIsDefault(addr.isDefault || false)
    setIsSheetOpen(true)
  }

  const closeSheet = () => {
    setIsSheetOpen(false)
    setEditingAddress(null)
  }

  const saveAddress = async () => {
    if (!line1.trim() || !city.trim() || !pincode.trim()) {
      toast.error('Please fill in required fields')
      return
    }

    setSavingAddr(true)
    try {
      const addressData = {
        label: addrLabel,
        customLabel: addrLabel === 'Other' ? customLabel.trim() : '',
        line1: line1.trim(),
        line2: line2.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        isDefault,
        ...(editingAddress ? {} : { createdAt: serverTimestamp() })
      }

      // If setting as default, unset all others first
      if (isDefault) {
        const batch = writeBatch(db)
        addresses.forEach(addr => {
          if (!editingAddress || addr.id !== editingAddress.id) {
            batch.update(doc(db, 'users', user.uid, 'addresses', addr.id), 
              { isDefault: false })
          }
        })
        await batch.commit()
      }

      if (editingAddress) {
        await updateDoc(
          doc(db, 'users', user.uid, 'addresses', editingAddress.id), 
          addressData
        )
        toast.success('Address updated!')
      } else {
        await addDoc(
          collection(db, 'users', user.uid, 'addresses'), 
          addressData
        )
        toast.success('Address saved!')
      }
      closeSheet()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save address')
    } finally {
      setSavingAddr(false)
    }
  }

  const deleteAddress = async (addressId) => {
    if (!window.confirm('Delete this address?')) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'addresses', addressId))
      toast.success('Address removed')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete address')
    }
  }

  // ── Emergency contact handlers ────────────────────────────────────────────
  const saveEmergencyContact = async () => {
    if (!ecName.trim() || ecPhone.length < 10) {
      toast.error('Please enter a valid name and 10-digit phone number')
      return
    }
    setSavingEC(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        emergencyContact: {
          name: ecName.trim(),
          phone: ecPhone,
          relation: ecRelation
        }
      })
      await refreshUserDoc()
      toast.success('Emergency contact saved!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save contact')
    } finally {
      setSavingEC(false)
    }
  }

  // ── Camera handlers for verification tab ──────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      setCameraStream(stream)
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
        kycStatus: userDoc?.kycStatus === 'approved' ? 'approved' : 'pending',
        updatedAt: serverTimestamp(),
      })
      await refreshUserDoc()
      toast.success('Selfie uploaded successfully!')
    } catch (err) {
      console.error(err)
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

  // ── Settings configurations ───────────────────────────────────────────────
  const settingsItems = [
    { icon: '🔒', label: 'Change Password', action: () => navigate(ROUTES.FORGOT_PASSWORD) },
    { icon: '📄', label: 'Terms & Conditions', action: () => window.open('/terms', '_blank') },
    { icon: '🔏', label: 'Privacy Policy', action: () => window.open('/privacy', '_blank') },
    {
      icon: '🗑️',
      label: 'Delete Account',
      action: () => {
        const confirmed = window.confirm('⚠ WARNING: Delete your account permanently? This action is irreversible.')
        if (confirmed) {
          toast.error('Account deletion is restricted in demo mode. Please contact support.', { duration: 5000 })
        }
      },
      danger: true,
    },
  ]

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Avatar + Name ── */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-24 h-24 mb-4">
            {user?.photoURL || userDoc?.photoURL ? (
              <img
                src={user?.photoURL || userDoc?.photoURL}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border border-outline-variant shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-white text-3xl font-bold border border-outline-variant shadow-md">
                {getInitials(userDoc?.name || user?.email)}
              </div>
            )}
            <button
              onClick={() => navigate('/profile/edit')}
              className="absolute bottom-0 right-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg border border-white hover:scale-105 active:scale-95 transition-all"
              aria-label="Edit Profile"
            >
              <span className="material-symbols-outlined text-[16px] text-white">photo_camera</span>
            </button>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{userDoc?.name || 'Fleet User'}</h1>
          <p className="text-secondary text-label-md mt-1">{user?.email}</p>
          
          <div className="flex items-center gap-2 mt-3 mb-6">
            <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${kyc.color}`}>
              {userDoc?.kycStatus === 'approved' ? 'Verified ✅' : userDoc?.kycStatus === 'pending' ? 'KYC Under Review ⏳' : 'KYC Not Verified ⚠️'}
            </span>
            {(isAdmin() || isOwner()) && (
              <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                {isAdmin() ? 'Admin' : 'Owner'}
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="w-full max-w-sm flex justify-around py-4 border-y border-outline-variant">
            {[
              { value: stats.trips, label: 'Trips' },
              { value: stats.rating, label: 'Rating' },
              { value: `₹${stats.savings}`, label: 'Saved' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-bold text-on-surface">{value}</p>
                <p className="text-xs text-secondary mt-0.5">{label}</p>
              </div>
            ))}
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
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold border border-outline-variant'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            PROFILE TAB (INFO & GENERAL)
        ════════════════════════════════════════════════ */}
        {activeSection === 'profile' && (
          <div className="space-y-5">
            {/* KYC Status banner */}
            <div className={`flex items-start gap-3 p-4 rounded-2xl border ${kyc.color}`}>
              <span className="text-xl leading-none">
                {userDoc?.kycStatus === 'approved' ? '✅' : userDoc?.kycStatus === 'pending' ? '⏳' : '⚠️'}
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">KYC Banner Alert</p>
                <p className="text-xs text-secondary mt-0.5">{kycBannerText}</p>
              </div>
            </div>

            {/* Profile Info Display (Read-Only) */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-on-surface">Profile Details</h2>
                <button
                  onClick={() => navigate('/profile/edit')}
                  className="flex items-center gap-1 text-label-md text-primary font-bold hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Full Name',     value: userDoc?.name || '—',  icon: 'person' },
                  { label: 'Email',         value: user?.email || '—',    icon: 'mail' },
                  { label: 'Phone',         value: userDoc?.phone || '—', icon: 'phone' },
                  { label: 'Date of Birth', value: userDoc?.dob || '—',   icon: 'cake' },
                  { label: 'Gender',        value: userDoc?.gender || '—',icon: 'wc' },
                  { label: 'Bio',           value: userDoc?.bio || '—',   icon: 'description' },
                  {
                    label: 'Member Since',
                    value: userDoc?.createdAt?.toDate
                      ? userDoc.createdAt.toDate().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                      : '—',
                    icon: 'calendar_month',
                  },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">{icon}</span>
                    <div>
                      <p className="text-[11px] text-secondary uppercase tracking-wide">{label}</p>
                      <p className={`text-label-md text-on-surface ${value === '—' ? 'text-secondary/50 font-normal italic' : 'font-medium'}`}>
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role / Account Switcher Card */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
              <p className="text-xs text-secondary mb-1 font-medium">Account Mode</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">
                    {isVendor ? '🏢 Vehicle Owner (Vendor)' : isRenter ? '🚗 Renter' : '— Not set'}
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    {isVendor ? 'You list vehicles and earn money' : 'You search and rent vehicles'}
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

            {/* Captain Mode Toggle Switch */}
            <div className="flex items-center justify-between p-5 rounded-2xl border border-outline-variant bg-surface-container-lowest">
              <div>
                <p className="font-bold text-sm text-on-surface">⚡ Captain Mode</p>
                <p className="text-xs text-secondary mt-0.5">Offer rides and earn as a driver</p>
              </div>

              <button
                onClick={toggleCaptain}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none
                  ${captainMode ? 'bg-primary-container' : 'bg-outline-variant'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full shadow transition-transform duration-200 bg-white
                  ${captainMode ? 'translate-x-7' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Developer Console (Admin only) */}
            {isAdmin() && (
              <div className="p-5 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-purple-800">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>build</span>
                  <span className="font-bold text-label-md">Developer Console</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <button
                    onClick={async () => {
                      try {
                        const querySnapshot = await getDocs(collection(db, 'users'))
                        const batch = writeBatch(db)
                        let count = 0
                        querySnapshot.forEach((docSnap) => {
                          const data = docSnap.data()
                          if (data.tokens === undefined) {
                            batch.update(docSnap.ref, { tokens: 10, tokensUsed: 0 })
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
              </div>
            )}

            {/* Settings links */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
              {settingsItems.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-container transition-all
                    ${i > 0 ? 'border-t border-outline-variant' : ''}
                    ${item.danger ? 'text-error font-bold' : 'text-on-surface font-medium'}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm flex-1">{item.label}</span>
                  <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
                </button>
              ))}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full h-12 border-2 border-error text-error font-bold rounded-2xl hover:bg-error hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            VERIFICATION TAB
        ════════════════════════════════════════════════ */}
        {activeSection === 'verification' && (
          <div className="space-y-5">
            {/* KYC Status Banner */}
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${kyc.color}`}>
              <span className="material-symbols-outlined text-[32px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                {kyc.icon}
              </span>
              <div>
                <p className="font-bold text-on-surface">{kyc.label}</p>
                <p className="text-label-md text-secondary">{kycBannerText}</p>
              </div>
            </div>

            {/* Selfie upload card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>face</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-on-surface">Live Selfie</h3>
                  <p className="text-label-md text-secondary">Required for identity verification</p>
                </div>
                {userDoc?.selfieUrl && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 shrink-0 border border-green-200">
                    Uploaded ✓
                  </span>
                )}
              </div>

              {/* Camera capture element */}
              {cameraStream ? (
                <div className="relative mb-4 rounded-2xl overflow-hidden bg-black aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-44 h-56 border-4 border-white/70 rounded-full" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button
                      onClick={stopCamera}
                      className="px-5 py-2 bg-white/90 text-on-surface font-bold rounded-full text-label-md hover:bg-white transition-all shadow"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={captureSelfie}
                      className="px-6 py-2 bg-primary-container text-white font-bold rounded-full text-label-md flex items-center gap-2 hover:opacity-90 transition-all shadow"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      Capture
                    </button>
                  </div>
                </div>
              ) : selfiePreview ? (
                <div className="relative mb-4 rounded-2xl overflow-hidden border border-outline-variant shadow-sm max-h-64">
                  <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
                  {uploadingSelfie && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-label-md">Uploading...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-surface-container rounded-2xl p-8 flex flex-col items-center mb-4 border-2 border-dashed border-outline-variant">
                  <span className="material-symbols-outlined text-5xl text-secondary mb-3">add_a_photo</span>
                  <p className="text-body-lg font-semibold text-on-surface mb-1">No selfie yet</p>
                  <p className="text-label-md text-secondary text-center">
                    Take a clear photo in good lighting. Face must be fully visible.
                  </p>
                </div>
              )}

              {!cameraStream && (
                <div className="flex gap-3">
                  <button
                    onClick={startCamera}
                    className="flex-1 h-11 bg-primary-container text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-label-md shadow"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    Open Camera
                  </button>
                  <label className="flex-1 h-11 border border-outline-variant rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-surface-container transition-all text-label-md">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleSelfieFile} />
                  </label>
                </div>
              )}
            </div>

            {/* Aadhaar card */}
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
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                  userDoc?.aadhaarUrl ? 'bg-green-100 text-green-700 border-green-200' : 'bg-surface-container text-secondary border-outline-variant'
                }`}>
                  {userDoc?.aadhaarUrl ? 'Uploaded ✓' : 'Not uploaded'}
                </span>
              </div>
              {userDoc?.aadhaarUrl ? (
                <a
                  href={userDoc.aadhaarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary text-label-md font-bold hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  View uploaded Aadhaar
                </a>
              ) : (
                <button
                  onClick={() => navigate('/verify')}
                  className="w-full h-11 border border-primary-container text-primary font-bold rounded-xl hover:bg-primary/5 transition-all text-label-md"
                >
                  Upload Aadhaar →
                </button>
              )}
            </div>

            {/* DL Card */}
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
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                  userDoc?.dlUrl ? 'bg-green-100 text-green-700 border-green-200' : 'bg-surface-container text-secondary border-outline-variant'
                }`}>
                  {userDoc?.dlUrl ? 'Uploaded ✓' : 'Not uploaded'}
                </span>
              </div>
              {userDoc?.dlUrl ? (
                <a
                  href={userDoc.dlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary text-label-md font-bold hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  View uploaded License
                </a>
              ) : (
                <button
                  onClick={() => navigate('/verify')}
                  className="w-full h-11 border border-primary-container text-primary font-bold rounded-xl hover:bg-primary/5 transition-all text-label-md"
                >
                  Upload Driving License →
                </button>
              )}
            </div>

            {/* Direct Verification CTA */}
            {userDoc?.kycStatus !== 'approved' && userDoc?.kycStatus !== 'pending' && (
              <button
                onClick={() => navigate('/verify')}
                className="w-full h-12 bg-primary-container text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                Complete Full KYC Verification →
              </button>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            ADDRESSES TAB (Firestore subcollection)
        ════════════════════════════════════════════════ */}
        {activeSection === 'addresses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-on-surface">Saved Addresses</h2>
              <span className="text-xs text-secondary font-medium">{addresses.length} saved</span>
            </div>

            {addresses.length === 0 ? (
              <div className="bg-surface-container rounded-2xl p-10 flex flex-col items-center border border-outline-variant text-center">
                <span className="text-5xl mb-3">📍</span>
                <p className="font-bold text-on-surface">No saved addresses</p>
                <p className="text-sm text-secondary mt-1 max-w-xs">
                  Save your address details to autofill pickup and delivery points during booking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    className="flex items-start gap-3.5 p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm hover:shadow-soft transition-all"
                  >
                    <span className="text-2xl mt-0.5 shrink-0 leading-none">
                      {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '💼' : '📍'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-on-surface">
                          {addr.label === 'Other' ? addr.customLabel || 'Other' : addr.label}
                        </p>
                        {addr.isDefault && (
                          <span className="text-[8px] bg-on-surface text-surface-container-lowest px-2 py-0.5 rounded-full font-black tracking-wider uppercase">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary mt-1 leading-relaxed">
                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city} - {addr.pincode}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditSheet(addr)}
                        className="text-secondary hover:text-on-surface p-1 hover:bg-surface-container rounded-lg transition-all"
                        title="Edit Address"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteAddress(addr.id)}
                        className="text-secondary hover:text-error p-1 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Address"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={openAddSheet}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-outline-variant text-sm font-bold text-secondary hover:border-primary hover:text-primary transition-all mt-3"
            >
              + Add New Address
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            EMERGENCY TAB
        ════════════════════════════════════════════════ */}
        {activeSection === 'emergency' && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="font-bold text-on-surface text-lg">Emergency Contact Details</h2>
              <p className="text-xs text-secondary mt-1 leading-relaxed">
                In case of emergency during an active rental, Fleet operations may contact this person on your behalf.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-secondary mb-1 block">Full Name *</label>
                <input
                  type="text"
                  value={ecName}
                  onChange={e => setEcName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full h-12 px-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1 block">Phone Number *</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-4 bg-surface-container border border-outline-variant rounded-2xl text-sm font-semibold text-secondary">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={ecPhone}
                    onChange={e => setEcPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="w-full h-12 px-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1 block">Relation</label>
                <select
                  value={ecRelation}
                  onChange={e => setEcRelation(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all"
                >
                  {['Parent', 'Spouse', 'Sibling', 'Friend', 'Other'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={saveEmergencyContact}
              disabled={savingEC}
              className="w-full h-12 bg-primary-container text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-4 text-sm shadow-md"
            >
              {savingEC ? 'Saving...' : userDoc?.emergencyContact ? 'Update Contact' : 'Save Contact'}
            </button>
          </div>
        )}

      </div>

      {/* ── Address Bottom Sheet Modal ── */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isSheetOpen ? 'visible' : 'invisible'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${isSheetOpen ? 'opacity-40' : 'opacity-0'}`}
          onClick={closeSheet}
        />
        {/* Sheet */}
        <div className={`absolute bottom-0 left-0 right-0 bg-surface-container-lowest dark:bg-gray-900 rounded-t-3xl p-6 transition-transform duration-300 border-t border-outline-variant shadow-2xl ${
          isSheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}>
          <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-6" />
          <h3 className="font-bold text-lg mb-4 text-on-surface">
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </h3>
          
          {/* Label Selector */}
          <div className="flex gap-2 mb-4">
            {['Home', 'Work', 'Other'].map(l => (
              <button
                key={l}
                onClick={() => setAddrLabel(l)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5
                  ${addrLabel === l
                    ? 'bg-on-surface text-surface-container-lowest border-on-surface font-bold shadow-sm'
                    : 'border-outline-variant text-secondary bg-surface-container hover:bg-surface-container-high'}`}
              >
                <span>{l === 'Home' ? '🏠' : l === 'Work' ? '💼' : '📍'}</span>
                <span>{l}</span>
              </button>
            ))}
          </div>

          {addrLabel === 'Other' && (
            <input
              placeholder="Label name (e.g. Gym, Parents)"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none mb-3 text-sm text-on-surface"
            />
          )}

          <input
            placeholder="Address Line 1 *"
            value={line1}
            onChange={e => setLine1(e.target.value)}
            className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none mb-3 text-sm text-on-surface"
          />
          <input
            placeholder="Address Line 2 (optional)"
            value={line2}
            onChange={e => setLine2(e.target.value)}
            className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none mb-3 text-sm text-on-surface"
          />

          <div className="flex gap-3 mb-4">
            <input
              placeholder="City *"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-sm text-on-surface"
            />
            <input
              placeholder="Pincode *"
              value={pincode}
              maxLength={6}
              onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-28 h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-sm text-on-surface"
            />
          </div>

          <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-primary-container focus:ring-primary-container"
            />
            <span className="text-sm text-secondary">Set as default address</span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={closeSheet}
              className="flex-1 h-12 border border-outline-variant text-on-surface font-semibold rounded-2xl hover:bg-surface-container transition-all text-sm"
            >
              Cancel
            </button>
            <button
              onClick={saveAddress}
              disabled={savingAddr}
              className="flex-[2] h-12 bg-primary-container text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 text-sm shadow-md"
            >
              {savingAddr ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
