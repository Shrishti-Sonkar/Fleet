import { useState, useRef, useEffect } from 'react'
import { doc, getDoc, updateDoc, serverTimestamp, deleteField, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function DropoffPinModal({ booking, onClose, onSuccess }) {
  const { user } = useAuth()
  const [pin, setPin] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...pin]
    next[index] = value
    setPin(next)
    setError('')
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleConfirm = async () => {
    const code = pin.join('')
    if (code.length < 4) return
    setLoading(true)
    setError('')
    try {
      const bookingRef = doc(db, 'bookings', booking.id)
      const snap = await getDoc(bookingRef)
      const data = snap.data()

      if (!data.dropoffPIN) {
        setError('No drop-off PIN set. Ask the owner.')
        return
      }

      if (data.dropoffPIN === code) {
        // Mark booking complete
        await updateDoc(bookingRef, {
          status: 'completed',
          rideEndedAt: serverTimestamp(),
          dropoffPIN: deleteField(),
        })

        // Deduct tokens for hourly bookings
        if (booking.rentalType === 'hourly' && booking.rideStartedAt && user) {
          const startTime = booking.rideStartedAt?.toDate
            ? booking.rideStartedAt.toDate()
            : new Date(booking.rideStartedAt)
          const hoursUsed = Math.ceil((new Date() - startTime) / (1000 * 60 * 60))
          const userRef = doc(db, 'users', user.uid)
          await updateDoc(userRef, { tokens: increment(-hoursUsed) })
        }

        toast.success('Ride completed! Thanks for using Fleet ✨')
        onSuccess()
      } else {
        setError('Incorrect PIN. Please check with the owner.')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        setPin(['', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-green-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
          </div>
          <h2 className="font-headline-sm text-on-surface text-xl font-bold">End Your Ride</h2>
          <p className="text-secondary text-label-md mt-1">Enter the 4-digit drop-off code from your vehicle owner</p>
        </div>

        {/* Vehicle info */}
        <div className="flex items-center gap-3 bg-surface-container p-3 rounded-xl mb-8">
          {booking.vehicleImage && (
            <img src={booking.vehicleImage} alt={booking.vehicleName} className="w-14 h-10 object-cover rounded-lg" />
          )}
          <div>
            <p className="font-bold text-on-surface text-sm">{booking.vehicleName}</p>
            <p className="text-secondary text-xs">{booking.pickupDate} → {booking.dropoffDate}</p>
          </div>
        </div>

        {/* PIN Boxes */}
        <div className={`flex gap-3 justify-center mb-6 ${shake ? 'animate-[shake_0.6s_ease-in-out]' : ''}`}>
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-14 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all bg-surface-container
                ${digit ? 'border-green-500 text-green-700' : 'border-outline-variant text-on-surface'}
                focus:border-green-500 focus:bg-green-50`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
            <p className="text-red-700 text-label-md">{error}</p>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={pin.join('').length < 4 || loading}
          className="w-full h-12 bg-green-600 text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {loading ? 'Confirming...' : 'CONFIRM DROP-OFF'}
        </button>

        <button
          onClick={onClose}
          className="w-full text-secondary text-label-md hover:text-on-surface transition-colors text-center py-2"
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  )
}
