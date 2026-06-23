import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import DropoffPinModal from '../components/DropoffPinModal'
import CancelRideModal from '../components/CancelRideModal'
import PostRideRating from '../components/PostRideRating'
import toast from 'react-hot-toast'
import { generateInvoice } from '../lib/invoiceGenerator'

const ISSUE_CATEGORIES = [
  'Vehicle breakdown',
  'Accident',
  'Vehicle not as described',
  'Owner unresponsive',
  'Other',
]

function useCountdown(booking) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [isLate, setIsLate] = useState(false)

  useEffect(() => {
    if (!booking?.dropoffDate) return

    const update = () => {
      const [y, m, d] = booking.dropoffDate.split('-').map(Number)
      const [h, min] = (booking.dropoffTime || '10:00').split(':').map(Number)
      const target = new Date(y, m - 1, d, h, min)
      const diff = target - new Date()

      if (diff <= 0) {
        setIsLate(true)
        setTimeLeft(null)
      } else {
        setIsLate(false)
        setTimeLeft({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          mins: Math.floor((diff % 3600000) / 60000),
        })
      }
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [booking])

  return { timeLeft, isLate }
}

export default function ActiveRidePage() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [ownerData, setOwnerData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [showDropoff, setShowDropoff] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportIssue, setReportIssue] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  const { timeLeft, isLate } = useCountdown(booking)

  const handleDownloadInvoice = async () => {
    if (!booking) return
    setDownloadingInvoice(true)
    try {
      const vSnap = await getDoc(doc(db, 'vehicles', booking.vehicleId))
      const vehicleData = vSnap.exists() ? { id: vSnap.id, ...vSnap.data() } : null
      generateInvoice(booking, vehicleData, user)
    } catch (err) {
      console.error('Invoice download error:', err)
      toast.error('Failed to generate invoice. Please try again.')
    } finally {
      setDownloadingInvoice(false)
    }
  }

  useEffect(() => {
    if (!bookingId) return
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'bookings', bookingId))
        if (!snap.exists()) { navigate('/my-bookings'); return }
        const data = { id: snap.id, ...snap.data() }

        // Guard: only renter can view
        if (data.renterId !== user?.uid) { navigate('/my-bookings'); return }

        setBooking(data)

        // Fetch owner
        if (data.ownerId) {
          const ownerSnap = await getDoc(doc(db, 'users', data.ownerId))
          if (ownerSnap.exists()) setOwnerData(ownerSnap.data())
        }
      } catch (err) {
        console.error(err)
        navigate('/my-bookings')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [bookingId, user, navigate])

  const submitReport = async () => {
    if (!reportIssue) { toast.error('Select an issue type'); return }
    setReportSubmitting(true)
    try {
      await addDoc(collection(db, 'reports'), {
        bookingId,
        renterId: user.uid,
        vehicleId: booking.vehicleId,
        issue: reportIssue,
        description: reportDesc,
        createdAt: serverTimestamp(),
      })
      toast.success('Report submitted. Our team will reach out.')
      setShowReport(false)
      setReportIssue('')
      setReportDesc('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit report.')
    } finally {
      setReportSubmitting(false)
    }
  }

  const getStatusBadge = () => {
    if (isLate) return { label: 'LATE — Please return immediately', color: 'bg-red-500 animate-pulse' }
    if (!timeLeft) return { label: 'ACTIVE', color: 'bg-green-500' }
    const totalHours = timeLeft.days * 24 + timeLeft.hours
    if (totalHours < 1) return { label: 'RETURNING SOON', color: 'bg-amber-500' }
    if (totalHours < 4) return { label: 'RETURNING SOON', color: 'bg-amber-500' }
    return { label: 'ON TIME', color: 'bg-green-500' }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!booking) return null

  const badge = getStatusBadge()
  const ownerPhone = ownerData?.phone || ownerData?.phoneNumber

  return (
    <PageLayout showBottomBar={false}>
      <div className="max-w-lg mx-auto">
        {/* Vehicle Image Header */}
        <div className="relative h-56 bg-surface-container overflow-hidden">
          {booking.vehicleImage ? (
            <img src={booking.vehicleImage} alt={booking.vehicleName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-8xl text-secondary">directions_car</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

          {/* Back + Badge */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black tracking-widest px-3 py-1.5 rounded-full text-white ${badge.color}`}>
                {badge.label}
              </span>
              <span className="text-[10px] font-black tracking-widest px-2 py-1.5 rounded-full bg-red-500 text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />
                LIVE
              </span>
            </div>
          </div>

          {/* Vehicle name */}
          <div className="absolute bottom-4 left-4">
            <h1 className="text-white font-bold text-xl">{booking.vehicleName}</h1>
            <p className="text-white/70 text-sm">{booking.vehicleNumber || 'Fleet Vehicle'}</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-5">
          {/* Pickup / Dropoff Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pickup', date: booking.pickupDate, time: booking.pickupTime || '10:00', icon: 'trip_origin' },
              { label: 'Drop-off', date: booking.dropoffDate, time: booking.dropoffTime || '10:00', icon: 'flag' },
            ].map(({ label, date, time, icon }) => (
              <div key={label} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  <p className="text-[10px] uppercase tracking-wide text-secondary font-bold">{label}</p>
                </div>
                <p className="font-bold text-on-surface">{time}</p>
                <p className="text-secondary text-label-md">{date}</p>
              </div>
            ))}
          </div>

          {/* Countdown / Completed Status Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
            {booking.status === 'completed' ? (
              <div className="text-center py-2">
                <span className="material-symbols-outlined text-green-600 text-5xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                <p className="font-bold text-on-surface text-lg">Ride Completed</p>
                <p className="text-secondary text-label-md mt-1">Thank you for riding with Fleet!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
                  <p className="font-bold text-on-surface">Time Remaining</p>
                </div>
                {isLate ? (
                  <p className="text-red-600 font-bold text-lg animate-pulse">⚠ Overdue — Please return immediately</p>
                ) : timeLeft ? (
                  <div className="flex gap-4">
                    {timeLeft.days > 0 && (
                      <div className="text-center">
                        <p className="text-3xl font-black text-on-surface tabular-nums">{String(timeLeft.days).padStart(2, '0')}</p>
                        <p className="text-[10px] uppercase text-secondary tracking-wide">Days</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-3xl font-black text-on-surface tabular-nums">{String(timeLeft.hours).padStart(2, '0')}</p>
                      <p className="text-[10px] uppercase text-secondary tracking-wide">Hrs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-on-surface tabular-nums">{String(timeLeft.mins).padStart(2, '0')}</p>
                      <p className="text-[10px] uppercase text-secondary tracking-wide">Min</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-secondary">Calculating...</p>
                )}
              </>
            )}
          </div>

          {/* Location */}
          {booking.pickupLocation && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  <div>
                    <p className="text-[10px] uppercase text-secondary tracking-wide font-bold mb-0.5">Pickup Location</p>
                    <p className="font-medium text-on-surface text-sm">{booking.pickupLocation}</p>
                  </div>
                </div>
                <button
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(booking.pickupLocation)}`, '_blank')}
                  className="text-primary-container text-label-md font-bold hover:opacity-80 transition-all shrink-0 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Maps
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {ownerPhone && (
              <a
                href={`tel:${ownerPhone}`}
                className="flex items-center justify-center gap-3 w-full h-12 bg-surface-container border border-outline-variant rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">call</span>
                Call Owner
              </a>
            )}
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center justify-center gap-3 w-full h-12 bg-surface-container border border-outline-variant rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[20px] text-amber-600">warning</span>
              Report an Issue
            </button>
          </div>

          <div className="border-t border-outline-variant" />

          {/* End / Cancel / Completed Actions */}
          {booking.status === 'completed' ? (
            <div className="space-y-3">
              <button
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="w-full h-14 bg-primary-container text-white font-black text-lg rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined">download</span>
                {downloadingInvoice ? 'Generating Invoice...' : 'DOWNLOAD INVOICE'}
              </button>
              <button
                onClick={() => navigate('/my-bookings')}
                className="w-full h-12 bg-surface-container border border-outline-variant rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-all"
              >
                Go to My Bookings
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowDropoff(true)}
                className="w-full h-14 bg-primary-container text-white font-black text-lg rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                END RIDE
              </button>
              <button
                onClick={() => setShowCancel(true)}
                className="w-full text-error text-label-md font-bold hover:opacity-70 transition-all text-center py-2"
              >
                Cancel Booking
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report Issue Sheet */}
      {showReport && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-on-surface">Report an Issue</h3>
              <button onClick={() => setShowReport(false)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {ISSUE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setReportIssue(cat)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-label-md ${
                    reportIssue === cat
                      ? 'border-primary-container bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant text-on-surface hover:border-primary-container'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <textarea
              value={reportDesc}
              onChange={e => setReportDesc(e.target.value)}
              placeholder="Describe the issue (optional)"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all resize-none text-label-md mb-4"
            />
            <button
              onClick={submitReport}
              disabled={reportSubmitting || !reportIssue}
              className="w-full h-12 bg-amber-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {reportSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDropoff && (
        <DropoffPinModal
          booking={booking}
          onClose={() => setShowDropoff(false)}
          onSuccess={() => { setShowDropoff(false); setShowRating(true) }}
        />
      )}
      {showCancel && (
        <CancelRideModal booking={booking} onClose={() => setShowCancel(false)} />
      )}
      {showRating && (
        <PostRideRating booking={booking} onDone={() => setShowRating(false)} />
      )}
    </PageLayout>
  )
}
