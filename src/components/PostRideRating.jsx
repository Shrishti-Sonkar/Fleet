import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../lib/api'

const TAGS = ['Clean vehicle', 'On time', 'Great owner', 'Smooth drive', 'As described', 'Well maintained', 'Fair pricing']

function StarRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-label-md text-secondary">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} onClick={() => onChange(s)} className="focus:outline-none">
            <span
              className={`material-symbols-outlined text-xl transition-colors ${s <= value ? 'text-amber-400' : 'text-outline-variant'}`}
              style={{ fontVariationSettings: `'FILL' ${s <= value ? 1 : 0}` }}
            >star</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PostRideRating({ booking, onDone }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [overall, setOverall] = useState(0)
  const [cleanliness, setCleanliness] = useState(0)
  const [condition, setCondition] = useState(0)
  const [responsiveness, setResponsiveness] = useState(0)
  const [selectedTags, setSelectedTags] = useState([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleSubmit = async () => {
    if (overall === 0) {
      toast.error('Please select an overall rating')
      return
    }
    setLoading(true)
    try {
      // Submit via the backend (admin SDK) so it can securely write the review,
      // record renterRating on the booking, and recompute the vehicle's average
      // rating — writes that Firestore security rules (correctly) block clients from.
      const token = await user.getIdToken()
      await apiFetch(`/api/bookings/${booking.id}/review`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          rating: overall,
          subRatings: { cleanliness, condition, responsiveness },
          tags: selectedTags,
          comment: comment.trim(),
        }),
      })

      toast.success('Review submitted! Thanks for the feedback ⭐')
      navigate('/my-bookings')
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit review. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-2xl my-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚗</div>
          <h2 className="font-headline-sm text-on-surface text-2xl font-bold">How was your ride?</h2>
          <p className="text-secondary text-label-md mt-1">Your feedback helps the Fleet community</p>
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-3 bg-surface-container p-3 rounded-xl mb-6">
          {booking.vehicleImage && (
            <img src={booking.vehicleImage} alt={booking.vehicleName} className="w-14 h-10 object-cover rounded-lg" />
          )}
          <p className="font-bold text-on-surface">{booking.vehicleName}</p>
        </div>

        {/* Overall Stars */}
        <div className="text-center mb-6">
          <p className="text-label-md text-secondary mb-3">Overall rating</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setOverall(s)} className="focus:outline-none transition-transform hover:scale-110">
                <span
                  className={`material-symbols-outlined text-4xl transition-colors ${s <= overall ? 'text-amber-400' : 'text-outline-variant'}`}
                  style={{ fontVariationSettings: `'FILL' ${s <= overall ? 1 : 0}` }}
                >star</span>
              </button>
            ))}
          </div>
          {overall > 0 && (
            <p className="text-sm text-secondary mt-1">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][overall]}
            </p>
          )}
        </div>

        {/* Sub-ratings (shown after overall selected) */}
        {overall > 0 && (
          <div className="bg-surface-container rounded-xl p-4 mb-6 space-y-3">
            <StarRow label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
            <StarRow label="Vehicle Condition" value={condition} onChange={setCondition} />
            <StarRow label="Owner Helpfulness" value={responsiveness} onChange={setResponsiveness} />
          </div>
        )}

        {/* Tags */}
        <div className="mb-6">
          <p className="text-label-md font-bold text-on-surface mb-3">What stood out?</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-label-md font-medium border transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-primary-container text-white border-primary-container'
                    : 'border-outline-variant text-secondary hover:border-primary-container hover:text-primary'
                }`}
              >
                {selectedTags.includes(tag) ? `✓ ${tag}` : tag}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell others about your experience (optional)"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary-container transition-all resize-none text-label-md"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || overall === 0}
          className="w-full h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mb-3"
        >
          {loading ? 'Submitting...' : 'SUBMIT REVIEW'}
        </button>
        <button
          onClick={() => { onDone?.(); navigate('/my-bookings') }}
          className="w-full text-secondary text-label-md hover:text-on-surface transition-colors text-center py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
