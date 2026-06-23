import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

const CANCEL_REASONS = [
  'Change of plans',
  'Found a better option',
  'Emergency',
  'Vehicle not suitable',
  'Other',
]

function getCancellationFee(booking) {
  if (booking.status === 'active') return 500

  // Try to determine hours until pickup
  if (booking.pickupDate) {
    const pickupStr = booking.pickupDate
    const timeStr = booking.pickupTime || '10:00'
    const [y, m, d] = pickupStr.split('-').map(Number)
    const [h, min] = timeStr.split(':').map(Number)
    const pickup = new Date(y, m - 1, d, h, min)
    const hoursUntil = (pickup - new Date()) / (1000 * 60 * 60)

    if (hoursUntil > 24) return 0
    if (hoursUntil > 6) return 200
    return 500
  }
  return 0
}

export default function CancelRideModal({ booking, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const fee = getCancellationFee(booking)
  const total = booking.pricing?.total || 0
  const refund = Math.max(0, total - fee)

  const hoursLabel = () => {
    if (booking.status === 'active') return 'Currently on an active ride'
    if (!booking.pickupDate) return ''
    const [y, m, d] = booking.pickupDate.split('-').map(Number)
    const [h, min] = (booking.pickupTime || '10:00').split(':').map(Number)
    const pickup = new Date(y, m - 1, d, h, min)
    const hours = Math.round((pickup - new Date()) / (1000 * 60 * 60))
    if (hours <= 0) return 'Pickup time has passed'
    return `${hours} hour${hours !== 1 ? 's' : ''} before pickup`
  }

  const handleConfirm = async () => {
    if (!reason) {
      toast.error('Please select a cancellation reason')
      return
    }
    setLoading(true)
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/bookings/${booking.id}/cancel`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          reason,
          cancellationFee: fee,
          refundAmount: refund,
        }),
      })
      toast(`Booking cancelled. ${refund > 0 ? `Refund of ₹${refund.toLocaleString('en-IN')} in 5–7 days.` : 'No refund applicable.'}`)
      navigate('/my-bookings')
    } catch (err) {
      console.error(err)
      toast.error('Failed to cancel. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-sm text-on-surface text-xl font-bold">Cancel Booking</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Policy Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            <p className="font-bold text-amber-900">Cancellation Policy</p>
          </div>
          <div className="space-y-1.5 text-label-md">
            <div className="flex justify-between">
              <span className="text-amber-800">&gt; 24 hrs before pickup</span>
              <span className="font-bold text-green-700">FREE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-800">6–24 hrs before pickup</span>
              <span className="font-bold text-amber-700">₹200 fee</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-800">&lt; 6 hrs / active ride</span>
              <span className="font-bold text-red-700">₹500 fee</span>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-surface-container rounded-xl p-4 mb-5 space-y-2">
          <p className="text-secondary text-label-md">You are cancelling: <span className="text-on-surface font-medium">{hoursLabel()}</span></p>
          <div className="flex justify-between items-center">
            <span className="text-secondary text-label-md">Cancellation fee</span>
            <span className={`font-bold ${fee === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fee === 0 ? 'FREE' : `₹${fee}`}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-outline-variant pt-2">
            <span className="font-bold text-on-surface">Refund amount</span>
            <span className="font-bold text-primary-container text-lg">₹{refund.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="block text-label-md font-bold text-on-surface mb-2">Reason for cancellation *</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all"
          >
            <option value="">Select a reason</option>
            {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Buttons */}
        <button
          onClick={handleConfirm}
          disabled={loading || !reason}
          className="w-full h-12 bg-error text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mb-3"
        >
          {loading ? 'Cancelling...' : 'CONFIRM CANCELLATION'}
        </button>
        <button
          onClick={onClose}
          className="w-full text-secondary text-label-md hover:text-on-surface transition-colors text-center py-2 font-medium"
        >
          Keep My Booking
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
