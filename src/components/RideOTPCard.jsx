import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

export default function RideOTPCard({ booking }) {
  const { user } = useAuth()
  const [regenerating, setRegenerating] = useState(false)
  const isActive = booking.status === 'active'
  const code = isActive ? booking.dropoffPIN : booking.startOTP

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/bookings/${booking.id}/regenerate-code`, {
        token,
        method: 'POST',
        body: JSON.stringify({ type: isActive ? 'dropoff' : 'start' }),
      })
      toast.success('New code generated!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to regenerate code.')
    } finally {
      setRegenerating(false)
    }
  }

  if (!code) return null

  return (
    <div className={`mt-4 rounded-2xl p-5 border-2 ${
      isActive
        ? 'bg-green-50 border-green-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`material-symbols-outlined text-xl ${isActive ? 'text-green-600' : 'text-amber-600'}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isActive ? 'flag' : 'key'}
        </span>
        <p className={`font-bold text-sm ${isActive ? 'text-green-900' : 'text-amber-900'}`}>
          {isActive ? '🏁 Drop-off PIN — Share when renter returns' : '🔑 Share this code with renter to start ride'}
        </p>
      </div>

      {/* Code display */}
      <div className="flex justify-center gap-3 mb-4">
        {code.split('').map((digit, i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-black font-mono border-2 ${
              isActive
                ? 'bg-green-100 border-green-300 text-green-800'
                : 'bg-amber-100 border-amber-300 text-amber-800'
            }`}
          >
            {digit}
          </div>
        ))}
      </div>

      {/* Expiry + Regenerate */}
      <div className="flex items-center justify-between">
        {!isActive && booking.otpExpiry && (
          <p className="text-xs text-amber-700">
            Valid until: {(() => {
              const d = booking.otpExpiry?.toDate ? booking.otpExpiry.toDate() : new Date(booking.otpExpiry)
              return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            })()}
          </p>
        )}
        {isActive && <div />}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
            isActive
              ? 'bg-green-200 text-green-800 hover:bg-green-300'
              : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
          }`}
        >
          {regenerating ? 'Regenerating...' : '↻ Regenerate'}
        </button>
      </div>
    </div>
  )
}
