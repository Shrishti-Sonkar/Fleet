import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveBooking } from '../../hooks/useActiveBooking'
import StartRideModal from '../StartRideModal'

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(targetDateStr, targetTimeStr) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [isLate, setIsLate]     = useState(false)

  useEffect(() => {
    if (!targetDateStr) return

    const update = () => {
      const parts     = targetDateStr.split('-')
      const timeParts = (targetTimeStr || '10:00').split(':')
      const target    = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1])
      )
      const diff = target - Date.now()

      if (diff < 0) {
        setIsLate(true)
        const abs = Math.abs(diff)
        setTimeLeft({
          hours:   Math.floor(abs / 3600000),
          minutes: Math.floor((abs % 3600000) / 60000),
          seconds: Math.floor((abs % 60000) / 1000),
        })
      } else {
        setIsLate(false)
        setTimeLeft({
          days:    Math.floor(diff / 86400000),
          hours:   Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        })
      }
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetDateStr, targetTimeStr])

  return { timeLeft, isLate }
}

// ── CountdownUnit ─────────────────────────────────────────────────────────────
function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center min-w-[36px]">
      <span className="text-[20px] font-black leading-none tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-widest opacity-70 mt-0.5">{label}</span>
    </div>
  )
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'UPCOMING RIDE', badgeBg: 'bg-amber-400', badgeText: 'text-amber-900',
    cardBg: 'bg-white border border-outline-variant', textColor: 'text-on-surface', subColor: 'text-secondary',
    timerLabel: 'Pick-up in',
  },
  approved: {
    label: 'CONFIRMED RIDE', badgeBg: 'bg-amber-400', badgeText: 'text-amber-900',
    cardBg: 'bg-white border border-outline-variant', textColor: 'text-on-surface', subColor: 'text-secondary',
    timerLabel: 'Pick-up in',
  },
  active: {
    label: 'ACTIVE RIDE', badgeBg: 'bg-green-500', badgeText: 'text-white',
    cardBg: 'bg-green-50 border border-green-200', textColor: 'text-on-surface', subColor: 'text-secondary',
    timerLabel: 'Drop-off due',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ActiveBookingCard() {
  const { activeBooking, upcomingBooking, loading } = useActiveBooking()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)

  // Prefer active over upcoming
  const booking = activeBooking || upcomingBooking
  const config = STATUS_CONFIG[booking?.status] || STATUS_CONFIG.pending

  const targetDate = booking?.status === 'active'
    ? booking?.dropoffDate
    : booking?.pickupDate

  const targetTime = booking?.status === 'active'
    ? booking?.dropoffTime || '10:00'
    : booking?.pickupTime  || '10:00'

  const { timeLeft, isLate } = useCountdown(targetDate, targetTime)

  if (loading || !booking) return null

  const handleCTAClick = (e) => {
    e.stopPropagation()
    if (booking.status === 'active') {
      navigate(`/ride/${booking.id}`)
    } else if (booking.status === 'approved') {
      setShowStartModal(true)
    }
  }

  return (
    <div className="px-gutter max-w-screen-2xl mx-auto mb-4">
      <div
        className={`${config.cardBg} rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-xl`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full ${
                isLate ? 'bg-red-500 text-white animate-pulse' : `${config.badgeBg} ${config.badgeText}`
              }`}
            >
              {isLate ? '⚠ LATE' : config.label}
            </span>
            <span className={`font-bold text-[15px] ${config.textColor}`}>
              {booking.vehicleName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {booking.vehicleImage && (
              <img
                src={booking.vehicleImage}
                alt={booking.vehicleName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
            <span
              className={`material-symbols-outlined text-[20px] ${config.subColor} transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            >
              expand_more
            </span>
          </div>
        </div>

        {/* Info row — always visible */}
        <div className="grid grid-cols-2 gap-px bg-surface-container/50 border-t border-outline-variant">
          <div className="px-4 py-2.5">
            <p className={`text-[10px] uppercase tracking-wider ${config.subColor} mb-0.5`}>Pick-up time</p>
            <p className={`text-[13px] font-bold ${config.textColor}`}>
              {booking.pickupDate}, {booking.pickupTime || '10:00'}
            </p>
          </div>
          <div className="px-4 py-2.5">
            <p className={`text-[10px] uppercase tracking-wider ${config.subColor} mb-0.5`}>Pick-up location</p>
            <p className={`text-[13px] font-bold ${config.textColor}`}>
              {booking.city || 'Central Hub'}
            </p>
          </div>
        </div>

        {/* Countdown */}
        {timeLeft && (
          <div
            className={`flex items-center justify-between px-4 py-3 border-t border-outline-variant ${isLate ? 'bg-red-50' : ''}`}
          >
            <p className={`text-[11px] ${config.subColor}`}>
              {isLate ? '⚠ You are late by' : config.timerLabel}
            </p>
            <div className={`flex items-center gap-1 ${config.textColor}`}>
              {(timeLeft.days > 0) && (
                <>
                  <CountdownUnit value={timeLeft.days} label="days" />
                  <span className={`text-[16px] font-black mb-1 ${config.subColor}`}>:</span>
                </>
              )}
              <CountdownUnit value={timeLeft.hours}   label="hrs" />
              <span className={`text-[16px] font-black mb-1 ${config.subColor}`}>:</span>
              <CountdownUnit value={timeLeft.minutes} label="min" />
              <span className={`text-[16px] font-black mb-1 ${config.subColor}`}>:</span>
              <CountdownUnit value={timeLeft.seconds} label="sec" />
            </div>
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-outline-variant px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Booking ID',   value: booking.bookingId || booking.id?.slice(0, 8).toUpperCase() },
                { label: 'Amount Paid',  value: `₹${booking.pricing?.total?.toLocaleString('en-IN') || '—'}` },
                { label: 'Duration',     value: `${booking.totalDays || 1} day${booking.totalDays !== 1 ? 's' : ''}` },
                { label: 'Drop-off',     value: booking.dropoffDate || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className={`text-[10px] uppercase tracking-wider ${config.subColor} mb-0.5`}>{label}</p>
                  <p className={`text-[13px] font-bold ${config.textColor}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              {booking.status === 'active' ? (
                <button
                  onClick={handleCTAClick}
                  className="flex-1 py-2.5 bg-green-600 hover:opacity-90 text-white font-bold rounded-xl text-[13px] flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>
                  View Live Ride
                </button>
              ) : booking.status === 'approved' ? (
                <button
                  onClick={handleCTAClick}
                  className="flex-1 py-2.5 bg-primary-container hover:opacity-90 text-white font-bold rounded-xl text-[13px] flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">directions_car</span>
                  Start Ride
                </button>
              ) : null}
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/my-bookings') }}
                className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-xl text-[13px] flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                All Bookings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* StartRideModal */}
      {showStartModal && (
        <StartRideModal
          booking={booking}
          onClose={() => setShowStartModal(false)}
        />
      )}
    </div>
  )
}
