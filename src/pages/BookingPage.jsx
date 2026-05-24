import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import BookingSteps from '../components/sections/BookingSteps'
import { useBooking } from '../hooks/useBooking'
import { ROUTES } from '@/lib/constants'
import toast from 'react-hot-toast'

// ── Date/Time helpers ─────────────────────────────────────────────────────────
function getNext60Days() {
  const days = []
  for (let i = 0; i < 60; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      value: d.toISOString().slice(0, 10), // YYYY-MM-DD
    })
  }
  return days
}

function getTimeSlots() {
  const slots = []
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
      const ampm = h < 12 ? 'AM' : 'PM'
      const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      slots.push({ label, value })
    }
  }
  return slots
}

const TIME_SLOTS = getTimeSlots()
const DAYS_60 = getNext60Days()

function getDurationText(pickupDate, pickupTime, dropoffDate, dropoffTime) {
  if (!pickupDate || !dropoffDate) return null
  const p = new Date(`${pickupDate}T${pickupTime || '10:00'}`)
  const d = new Date(`${dropoffDate}T${dropoffTime || '10:00'}`)
  const diffMs = d - p
  if (diffMs <= 0) return null
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return `${days > 0 ? `${days} Day${days !== 1 ? 's' : ''} ` : ''}${hours} Hour${hours !== 1 ? 's' : ''}`
}

function getTotalHours(pickupDate, pickupTime, dropoffDate, dropoffTime) {
  const p = new Date(`${pickupDate}T${pickupTime || '10:00'}`)
  const d = new Date(`${dropoffDate}T${dropoffTime || '10:00'}`)
  return Math.max(2, Math.ceil((d - p) / (1000 * 60 * 60)))
}

function getTotalDays(pickupDate, pickupTime, dropoffDate, dropoffTime) {
  const p = new Date(`${pickupDate}T${pickupTime || '10:00'}`)
  const d = new Date(`${dropoffDate}T${dropoffTime || '10:00'}`)
  return Math.max(1, Math.ceil((d - p) / (1000 * 60 * 60 * 24)))
}

// ── Payment methods ───────────────────────────────────────────────────────────
const paymentMethods = [
  { id: 'upi', icon: 'account_balance_wallet', label: 'UPI Payment', sub: 'Google Pay, PhonePe, Paytm' },
  { id: 'card', icon: 'credit_card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', icon: 'account_balance', label: 'Net Banking', sub: 'All Indian Banks' },
]

// ── Quick coupon chips ────────────────────────────────────────────────────────
const QUICK_COUPONS = ['FLEET10', 'NEWUSER', 'REFER20']

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userDoc } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [loadingVehicle, setLoadingVehicle] = useState(true)

  const {
    step, nextStep: _nextStep, prevStep,
    paymentMethod, setPaymentMethod,
    addons,
    confirmed, bookingId, saving,
    saveBookingToFirestore,
    initiateRazorpayPayment,
  } = useBooking()

  // ── Date/Time state ───────────────────────────────────────────────────────
  const today = DAYS_60[0].value
  const [pickupDate, setPickupDate] = useState(today)
  const [pickupTime, setPickupTime] = useState('10:00')
  const [dropoffDate, setDropoffDate] = useState(DAYS_60[3]?.value || today)
  const [dropoffTime, setDropoffTime] = useState('10:00')

  const adjustDate = (dateStr, delta) => {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + delta)
    return d.toISOString().slice(0, 10)
  }

  const handlePickupDate = (val) => {
    setPickupDate(val)
    if (val >= dropoffDate) setDropoffDate(adjustDate(val, 1))
  }

  // ── Rental type ───────────────────────────────────────────────────────────
  const [rentalType, setRentalType] = useState('daily')

  // ── Location ─────────────────────────────────────────────────────────────
  const [location, setLocation] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)

  useEffect(() => {
    if (vehicle?.location) setLocation(vehicle.location)
  }, [vehicle])

  const handleGetLocation = async () => {
    setLocationLoading(true)
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
      const { latitude, longitude } = pos.coords
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
      const data = await resp.json()
      const addr = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      setLocation(addr)
      toast.success('Location detected!')
    } catch {
      toast.error('Could not get location. Please allow location access.')
    } finally {
      setLocationLoading(false)
    }
  }

  // ── Coupon ────────────────────────────────────────────────────────────────
  const [couponOpen, setCouponOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponData, setCouponData] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  const applyCoupon = async (code) => {
    const c = (code || couponCode).trim().toUpperCase()
    if (!c) return
    setCouponLoading(true)
    setCouponError('')
    setCouponData(null)
    try {
      const snap = await getDoc(doc(db, 'coupons', c))
      if (!snap.exists()) {
        setCouponError('Invalid or expired coupon')
        return
      }
      const data = snap.data()
      if (!data.active) { setCouponError('This coupon has expired'); return }
      if (subtotal < (data.minAmount || 0)) {
        setCouponError(`Minimum order ₹${data.minAmount} required`)
        return
      }
      setCouponData({ ...data, code: c })
      setCouponCode(c)
      toast.success(`✅ ${c} applied — ${data.description}`)
    } catch (err) {
      console.error(err)
      setCouponError('Failed to verify coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => { setCouponData(null); setCouponCode(''); setCouponError('') }

  // ── Fetch vehicle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const snap = await getDoc(doc(db, 'vehicles', id))
        if (snap.exists()) {
          setVehicle({ id: snap.id, ...snap.data() })
        } else {
          navigate('/browse')
        }
      } catch {
        navigate('/browse')
      } finally {
        setLoadingVehicle(false)
      }
    }
    fetchVehicle()
  }, [id, navigate])

  // ── Pricing ───────────────────────────────────────────────────────────────
  const hours = getTotalHours(pickupDate, pickupTime, dropoffDate, dropoffTime)
  const days = getTotalDays(pickupDate, pickupTime, dropoffDate, dropoffTime)
  const durationText = getDurationText(pickupDate, pickupTime, dropoffDate, dropoffTime)

  const pricePerHour = vehicle?.pricePerHour || Math.round((vehicle?.dailyPrice || 0) / 8)
  const pricePerDay = vehicle?.dailyPrice || 0
  const pricePerMonth = vehicle?.pricePerMonth || (vehicle?.dailyPrice || 0) * 22

  let rentalCharge = 0
  if (rentalType === 'hourly') rentalCharge = pricePerHour * hours
  else if (rentalType === 'daily') rentalCharge = pricePerDay * days
  else rentalCharge = pricePerMonth

  const insurance = addons?.insurance ? 1500 : 0
  const subtotal = rentalCharge + insurance
  const couponSavings = couponData
    ? couponData.type === 'percent'
      ? Math.round(subtotal * couponData.discount / 100)
      : couponData.discount
    : 0
  const afterCoupon = subtotal - couponSavings
  const gst = Math.round(afterCoupon * 0.18)
  const total = afterCoupon + gst

  const tokensNeeded = rentalType === 'hourly' ? hours : 0
  const userTokens = userDoc?.tokens || 0
  const hasEnoughTokens = tokensNeeded === 0 || userTokens >= tokensNeeded

  const pricing = {
    days, hours, rentalType, rentalCharge, insurance, couponCode: couponData?.code,
    couponSavings, gst, total, subtotal,
    pickupDate, pickupTime, dropoffDate, dropoffTime, pickupLocation: location,
  }

  const handleConfirmBooking = () => {
    if (!vehicle) return
    if (!hasEnoughTokens) { toast.error('Insufficient tokens for this hourly booking'); return }
    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID || ''
    if (rzpKey.includes('test') || rzpKey.includes('YOUR') || !rzpKey) {
      saveBookingToFirestore(vehicle, pricing)
    } else {
      initiateRazorpayPayment(vehicle, pricing, (paymentId) => {
        saveBookingToFirestore(vehicle, pricing, paymentId)
      })
    }
  }

  if (loadingVehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!vehicle) return null

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="text-center relative p-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            </svg>
          </div>
          <h2 className="font-headline-md text-headline-md mb-2">Booking Confirmed!</h2>
          <p className="text-body-lg text-secondary mb-2">Your {vehicle.name} is ready. Awaiting owner approval.</p>
          <p className="text-label-md text-on-surface-variant mb-8">
            Booking ID: <span className="font-bold text-primary">{bookingId}</span>
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="h-12 px-8 bg-on-surface text-white font-bold rounded-lg hover:opacity-90 transition-all"
            >
              Go Home
            </button>
            <Link
              to="/my-bookings"
              className="inline-flex h-12 px-8 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary-fixed/20 transition-all items-center"
            >
              My Bookings
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageLayout showBottomBar={false}>
      {/* Checkout nav */}
      <header className="fixed top-0 w-full h-[68px] bg-surface-container-lowest border-b border-outline-variant z-50">
        <div className="flex items-center justify-between px-gutter max-w-screen-2xl mx-auto h-full">
          <Link to={ROUTES.HOME} className="font-headline-sm text-headline-sm font-black text-primary">Fleet</Link>
          <div className="flex items-center gap-base">
            <span className="text-on-surface-variant font-label-md">Secure Checkout</span>
            <span className="material-symbols-outlined text-primary">lock</span>
          </div>
        </div>
      </header>

      <main className="pt-[100px] pb-section-padding-lg">
        <div className="max-w-4xl mx-auto px-gutter">
          <BookingSteps currentStep={step} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── Left: Configuration ── */}
            <div className="lg:col-span-7 space-y-6">

              {/* Rental Type Toggle */}
              <section className="bg-surface-container-lowest p-6 rounded-xl shadow-soft">
                <h2 className="font-headline-sm text-headline-sm mb-4">Select Rental Type</h2>
                <div className="flex gap-2 bg-surface-container p-1 rounded-xl">
                  {[
                    { id: 'hourly', label: 'Hourly', icon: 'schedule' },
                    { id: 'daily', label: 'Daily', icon: 'calendar_today' },
                    { id: 'monthly', label: 'Monthly', icon: 'calendar_month', badge: 'Best Value' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRentalType(opt.id)}
                      className={`flex-1 py-2.5 rounded-lg text-label-md font-medium transition-all flex flex-col items-center gap-0.5 relative ${
                        rentalType === opt.id
                          ? 'bg-primary-container text-white shadow-soft'
                          : 'text-secondary hover:text-on-surface'
                      }`}
                    >
                      {opt.badge && (
                        <span className="absolute -top-2 right-1 text-[9px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                          {opt.badge}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Date/Time Picker */}
              <section className="bg-surface-container-lowest p-6 rounded-xl shadow-soft">
                <h2 className="font-headline-sm text-headline-sm mb-5">Select Dates & Times</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Pickup */}
                  <div>
                    <label className="block text-label-md font-bold text-on-surface mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>trip_origin</span>
                      Pickup
                    </label>
                    <select
                      value={pickupDate}
                      onChange={e => handlePickupDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all text-sm mb-2"
                    >
                      {DAYS_60.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <select
                        value={pickupTime}
                        onChange={e => setPickupTime(e.target.value)}
                        className="flex-1 h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all text-sm"
                      >
                        {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handlePickupDate(adjustDate(pickupDate, -1))} disabled={pickupDate <= today} className="flex-1 h-8 border border-outline-variant rounded-lg text-xs font-medium hover:bg-surface-container transition-all disabled:opacity-40">−1 Day</button>
                      <button onClick={() => handlePickupDate(adjustDate(pickupDate, 1))} className="flex-1 h-8 border border-outline-variant rounded-lg text-xs font-medium hover:bg-surface-container transition-all">+1 Day</button>
                    </div>
                  </div>

                  {/* Dropoff */}
                  <div>
                    <label className="block text-label-md font-bold text-on-surface mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                      Drop-off
                    </label>
                    <select
                      value={dropoffDate}
                      onChange={e => setDropoffDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all text-sm mb-2"
                    >
                      {DAYS_60.filter(d => d.value > pickupDate).map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <select
                        value={dropoffTime}
                        onChange={e => setDropoffTime(e.target.value)}
                        className="flex-1 h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all text-sm"
                      >
                        {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setDropoffDate(adjustDate(dropoffDate, -1))} disabled={adjustDate(dropoffDate, -1) <= pickupDate} className="flex-1 h-8 border border-outline-variant rounded-lg text-xs font-medium hover:bg-surface-container transition-all disabled:opacity-40">−1 Day</button>
                      <button onClick={() => setDropoffDate(adjustDate(dropoffDate, 1))} className="flex-1 h-8 border border-outline-variant rounded-lg text-xs font-medium hover:bg-surface-container transition-all">+1 Day</button>
                    </div>
                  </div>
                </div>

                {/* Duration chip */}
                {durationText && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-label-md font-bold">
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    {durationText}
                  </div>
                )}
              </section>

              {/* Location */}
              <section className="bg-surface-container-lowest p-6 rounded-xl shadow-soft">
                <h2 className="font-headline-sm text-headline-sm mb-4">📍 Pickup Location</h2>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Enter pickup address"
                  className="w-full h-11 px-4 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all text-sm mb-3"
                />
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={handleGetLocation}
                    disabled={locationLoading}
                    className="flex-1 h-10 border border-primary-container text-primary-container rounded-xl text-label-md font-bold hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">my_location</span>
                    {locationLoading ? 'Locating...' : 'Use Current'}
                  </button>
                  {location && (
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(location)}`, '_blank')}
                      className="flex-1 h-10 border border-outline-variant text-on-surface rounded-xl text-label-md font-bold hover:bg-surface-container transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">map</span>
                      Open in Maps
                    </button>
                  )}
                </div>
                {location && (
                  <iframe
                    title="Pickup Map"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}
                    className="w-full rounded-xl border-0"
                    height="150"
                    loading="lazy"
                  />
                )}
              </section>

              {/* Coupon */}
              <section className="bg-surface-container-lowest p-6 rounded-xl shadow-soft">
                <button
                  onClick={() => setCouponOpen(v => !v)}
                  className="flex items-center justify-between w-full"
                >
                  <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
                    🎟️ Have a coupon?
                  </h2>
                  <span className={`material-symbols-outlined text-secondary transition-transform ${couponOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {couponOpen && (
                  <div className="mt-4">
                    {couponData ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <div>
                            <p className="font-bold text-green-800 text-label-md">{couponData.code} applied</p>
                            <p className="text-green-700 text-xs">You save ₹{couponSavings.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <button onClick={removeCoupon} className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center hover:bg-green-300 transition-all">
                          <span className="material-symbols-outlined text-[14px] text-green-800">close</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Quick chips */}
                        <div className="flex gap-2 mb-3">
                          {QUICK_COUPONS.map(c => (
                            <button
                              key={c}
                              onClick={() => { setCouponCode(c); applyCoupon(c) }}
                              className="px-3 py-1.5 border border-outline-variant rounded-full text-label-md font-medium text-secondary hover:border-primary-container hover:text-primary transition-all"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={couponCode}
                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                            placeholder="Enter coupon code"
                            className="flex-1 h-11 px-4 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all uppercase text-sm"
                          />
                          <button
                            onClick={() => applyCoupon()}
                            disabled={couponLoading || !couponCode}
                            className="h-11 px-5 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-label-md"
                          >
                            {couponLoading ? '...' : 'APPLY'}
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-red-600 text-label-md mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            {couponError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* Payment Method */}
              <section className="bg-surface-container-lowest p-6 rounded-xl shadow-soft">
                <h2 className="font-headline-sm text-headline-sm mb-5">Select Payment Method</h2>
                <div className="space-y-3">
                  {paymentMethods.map(pm => (
                    <label
                      key={pm.id}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === pm.id
                          ? 'border-2 border-primary bg-primary-fixed/20'
                          : 'border border-outline-variant hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-md flex items-center justify-center ${paymentMethod === pm.id ? 'bg-white shadow-sm' : 'bg-surface-container-high'}`}>
                          <span className={`material-symbols-outlined ${paymentMethod === pm.id ? 'text-primary' : 'text-secondary'}`}>{pm.icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{pm.label}</p>
                          <p className="text-label-md text-secondary">{pm.sub}</p>
                        </div>
                      </div>
                      <div
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${paymentMethod === pm.id ? 'border-primary' : 'border-outline-variant'}`}
                      >
                        {paymentMethod === pm.id && <div className="w-3 h-3 bg-primary rounded-full" />}
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </button>
                <button
                  id="pay-btn"
                  onClick={handleConfirmBooking}
                  disabled={saving || !hasEnoughTokens}
                  className="h-12 px-10 bg-primary-container text-white font-bold rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Processing...' : `Pay ₹${total.toLocaleString('en-IN')}`}
                  <span className="material-symbols-outlined">shield</span>
                </button>
              </div>
            </div>

            {/* ── Right: Summary ── */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-soft sticky top-[100px]">
                <h3 className="font-headline-sm text-[20px] mb-5 border-b border-outline-variant pb-4">Booking Summary</h3>

                {/* Vehicle image */}
                <div className="relative h-40 mb-5 bg-gradient-to-b from-white to-surface-container-high rounded-xl overflow-hidden flex items-center justify-center">
                  <img alt={vehicle.name} className="w-4/5 h-auto object-contain z-10" src={vehicle.imageUrl} />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-on-surface">{vehicle.name}</h4>
                      <p className="text-label-md text-secondary">{vehicle.fuelType} • {vehicle.seats} Seater</p>
                    </div>
                    {vehicle.badge && (
                      <span className="bg-on-surface text-white text-[12px] px-2 py-1 rounded font-bold uppercase">{vehicle.badge}</span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="flex justify-between py-3 border-y border-outline-variant text-label-md">
                    <div>
                      <p className="text-secondary">Duration</p>
                      <p className="font-bold">
                        {rentalType === 'monthly' ? '1 Month' :
                         rentalType === 'hourly' ? `${hours} Hour${hours !== 1 ? 's' : ''}` :
                         `${days} Day${days !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-secondary">Type</p>
                      <p className="font-bold capitalize">{rentalType}</p>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-label-md">
                      <span className="text-secondary">
                        {rentalType === 'monthly' ? 'Monthly rate' :
                         rentalType === 'hourly' ? `₹${pricePerHour}/hr × ${hours}hrs` :
                         `₹${pricePerDay}/day × ${days}d`}
                      </span>
                      <span>₹{rentalCharge.toLocaleString('en-IN')}</span>
                    </div>
                    {insurance > 0 && (
                      <div className="flex justify-between text-label-md">
                        <span className="text-secondary">Insurance</span>
                        <span>₹{insurance.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {couponSavings > 0 && (
                      <div className="flex justify-between text-label-md text-green-600">
                        <span>Coupon ({couponData?.code})</span>
                        <span>−₹{couponSavings.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-label-md">
                      <span className="text-secondary">GST (18%)</span>
                      <span>₹{gst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-primary/20">
                      <span className="font-bold text-[22px]">Total</span>
                      <span className="font-bold text-[22px] text-primary">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Token warning */}
                  {rentalType === 'hourly' && (
                    <div className={`p-3 rounded-xl text-label-md flex items-start gap-2 ${
                      hasEnoughTokens ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <span className={`material-symbols-outlined text-[16px] mt-0.5 ${hasEnoughTokens ? 'text-blue-600' : 'text-red-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {hasEnoughTokens ? 'info' : 'error'}
                      </span>
                      <div>
                        <p className={`font-medium ${hasEnoughTokens ? 'text-blue-800' : 'text-red-800'}`}>
                          {tokensNeeded} tokens required · You have {userTokens}
                        </p>
                        {!hasEnoughTokens && (
                          <p className="text-red-600 mt-0.5">Insufficient tokens. Please top up to book hourly.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Protection */}
                <div className="mt-5 p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="text-label-md font-bold text-green-900">Fleet Protection Included</p>
                    <p className="text-[12px] text-green-700">Covered for accidental damage and 24/7 roadside assistance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </PageLayout>
  )
}
