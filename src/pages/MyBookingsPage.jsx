import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import { Link, useNavigate } from 'react-router-dom'
import StartRideModal from '../components/StartRideModal'
import CancelRideModal from '../components/CancelRideModal'
import toast from 'react-hot-toast'
import { generateInvoice } from '../lib/invoiceGenerator'

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: 'pending' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: 'check_circle' },
  active: { label: 'Active', color: 'bg-blue-100 text-blue-800', icon: 'directions_car' },
  completed: { label: 'Completed', color: 'bg-surface-container text-secondary', icon: 'done_all' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: 'cancel' },
}

export default function MyBookingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [startRideBooking, setStartRideBooking] = useState(null)
  const [cancelBooking, setCancelBooking] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  const handleDownloadInvoice = async (booking) => {
    setDownloadingId(booking.id)
    try {
      const vSnap = await getDoc(doc(db, 'vehicles', booking.vehicleId))
      const vehicleData = vSnap.exists() ? { id: vSnap.id, ...vSnap.data() } : null
      generateInvoice(booking, vehicleData)
    } catch (err) {
      console.error('Invoice download error:', err)
      toast.error('Failed to generate invoice. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'bookings'),
      where('renterId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-on-surface mb-1">My Bookings</h1>
          <p className="text-secondary text-label-md">All your rental history on Fleet</p>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {['all', 'pending', 'approved', 'active', 'completed', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-4 rounded-full text-label-md font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-on-surface text-white'
                  : 'bg-surface-container text-secondary hover:text-on-surface'
              }`}
            >
              {f === 'all' ? 'All' : statusConfig[f]?.label || f}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-2xl">
            <span className="material-symbols-outlined text-6xl text-secondary mb-4 block" style={{ fontVariationSettings: "'FILL' 0" }}>
              confirmation_number
            </span>
            <h3 className="font-bold text-on-surface mb-2">
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </h3>
            <p className="text-secondary text-label-md mb-6">
              {filter === 'all' ? 'Start your journey with Fleet' : 'Switch filter to see other bookings'}
            </p>
            {filter === 'all' && (
              <Link to="/browse" className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all">
                Browse Vehicles
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const status = statusConfig[b.status] || statusConfig.pending
              return (
                <div
                  key={b.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden hover:shadow-soft transition-all"
                >
                  {/* Vehicle image strip */}
                  {b.vehicleImage && (
                    <div className="h-36 bg-surface-container overflow-hidden">
                      <img src={b.vehicleImage} alt={b.vehicleName} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-on-surface">{b.vehicleName}</h3>
                        <p className="text-label-md text-secondary">{b.city}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${status.color}`}>
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{status.icon}</span>
                        {status.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-surface-container rounded-xl p-3">
                        <p className="text-[11px] text-secondary uppercase tracking-wide mb-1">Pickup</p>
                        <p className="font-bold text-on-surface text-label-md">{b.pickupDate || '—'}</p>
                      </div>
                      <div className="bg-surface-container rounded-xl p-3">
                        <p className="text-[11px] text-secondary uppercase tracking-wide mb-1">Return</p>
                        <p className="font-bold text-on-surface text-label-md">{b.dropoffDate || '—'}</p>
                      </div>
                      <div className="bg-surface-container rounded-xl p-3">
                        <p className="text-[11px] text-secondary uppercase tracking-wide mb-1">Duration</p>
                        <p className="font-bold text-on-surface text-label-md">{b.totalDays || b.pricing?.days} day{b.totalDays !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant mb-4">
                      <div>
                        <p className="text-[11px] text-secondary uppercase tracking-wide">Booking ID</p>
                        <p className="font-bold text-on-surface text-label-md">{b.bookingId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-secondary uppercase tracking-wide">Total Paid</p>
                        <p className="font-bold text-primary-container text-lg">₹{b.pricing?.total?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Action buttons per status */}
                    <div className="flex gap-2">
                      {b.status === 'pending' && (
                        <>
                          <button className="flex-1 h-10 border border-outline-variant rounded-xl text-label-md font-medium text-secondary cursor-not-allowed opacity-60">
                            Awaiting Approval...
                          </button>
                          <button
                            onClick={() => setCancelBooking(b)}
                            className="flex-1 h-10 border border-error text-error rounded-xl text-label-md font-bold hover:bg-red-50 transition-all"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {b.status === 'approved' && (
                        <>
                          <button
                            onClick={() => setStartRideBooking(b)}
                            className="flex-[2] h-10 bg-primary-container text-white rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[16px]">directions_car</span>
                            Start Ride →
                          </button>
                          <button
                            onClick={() => setCancelBooking(b)}
                            className="flex-1 h-10 border border-error text-error rounded-xl text-label-md font-bold hover:bg-red-50 transition-all"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {b.status === 'active' && (
                        <>
                          <button
                            onClick={() => navigate(`/ride/${b.id}`)}
                            className="flex-[2] h-10 bg-green-600 text-white rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>
                            View Ride →
                          </button>
                          <button
                            onClick={() => navigate(`/ride/${b.id}`)}
                            className="flex-1 h-10 border border-outline-variant rounded-xl text-label-md font-medium hover:bg-surface-container transition-all"
                          >
                            End Ride
                          </button>
                        </>
                      )}

                      {b.status === 'completed' && (
                        <>
                          <Link
                            to={`/booking/${b.vehicleId}`}
                            className="flex-1 h-10 bg-primary/10 text-primary rounded-xl text-label-md font-bold flex items-center justify-center hover:bg-primary/20 transition-all"
                          >
                            Book Again
                          </Link>
                           <button
                            onClick={() => handleDownloadInvoice(b)}
                            disabled={downloadingId === b.id}
                            className="flex-1 h-10 border border-outline-variant rounded-xl text-label-md font-medium text-secondary hover:bg-surface-container disabled:opacity-60 transition-all flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            {downloadingId === b.id ? 'Generating...' : 'Download Invoice'}
                          </button>
                        </>
                      )}

                      {b.status === 'cancelled' && (
                        <div className="flex-1 h-10 bg-surface-container rounded-xl text-label-md font-bold text-secondary flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          Cancelled
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* StartRideModal */}
      {startRideBooking && (
        <StartRideModal
          booking={startRideBooking}
          onClose={() => setStartRideBooking(null)}
        />
      )}

      {/* CancelRideModal */}
      {cancelBooking && (
        <CancelRideModal
          booking={cancelBooking}
          onClose={() => setCancelBooking(null)}
        />
      )}
    </PageLayout>
  )
}
