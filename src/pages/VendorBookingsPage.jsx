import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import VendorLayout from '../components/VendorLayout'
import toast from 'react-hot-toast'

export default function VendorBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'bookings'), where('ownerId', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  const filteredBookings = bookings.filter((b) => (statusFilter === 'all' ? true : b.status === statusFilter))

  const handleApprove = async (bId) => {
    try {
      const startOTP = Math.floor(1000 + Math.random() * 9000).toString()
      const dropoffPIN = Math.floor(1000 + Math.random() * 9000).toString()

      await updateDoc(doc(db, 'bookings', bId), {
        status: 'approved',
        startOTP,
        dropoffPIN,
      })
      toast.success(`Booking approved! Start OTP generated: ${startOTP}`)
    } catch (err) {
      toast.error('Approval failed: ' + err.message)
    }
  }

  const handleReject = async (bId) => {
    if (!window.confirm('Reject this booking request?')) return
    try {
      await updateDoc(doc(db, 'bookings', bId), { status: 'cancelled' })
      toast.success('Booking rejected.')
    } catch (err) {
      toast.error('Rejection failed: ' + err.message)
    }
  }

  return (
    <VendorLayout title="Bookings & Handovers" subtitle="Approve incoming requests, check KYC & manage active rides">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 bg-[#0e1424] border border-slate-800 p-1.5 rounded-2xl flex-wrap">
        {['all', 'pending', 'approved', 'active', 'completed', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              statusFilter === tab
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 bg-[#0e1424] border border-slate-800 rounded-2xl">
          <span className="material-symbols-outlined text-6xl text-slate-600 mb-3 block">calendar_month</span>
          <p className="text-slate-400 font-bold">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const isPaid = b.paymentStatus === 'paid'
            const isTokenPaid = b.paymentStatus === 'token_paid'
            const remaining = (b.pricing?.total || 0) - (b.amountPaid || 0)

            return (
              <div key={b.id} className="bg-[#0e1424] border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-extrabold text-white text-base font-mono">{b.bookingId || b.id}</span>
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                        b.status === 'pending'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : b.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : b.status === 'active'
                          ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                          : b.status === 'completed'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {b.status.toUpperCase()}
                    </span>

                    {/* Payment status badge */}
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                        isPaid
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : isTokenPaid
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isPaid ? 'PAID FULL ✓' : isTokenPaid ? `TOKEN PAID (₹${remaining} DUE)` : 'PAYMENT PENDING'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-lg">{b.vehicleName}</h3>
                    <p className="text-xs text-slate-400">
                      Renter: <span className="text-slate-200 font-semibold">{b.renterName}</span> ({b.renterEmail})
                    </p>
                    <p className="text-xs text-slate-400">
                      Dates: <span className="text-slate-200 font-semibold">{b.pickupDate}</span> →{' '}
                      <span className="text-slate-200 font-semibold">{b.dropoffDate}</span>
                    </p>
                  </div>

                  {b.startOTP && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl inline-block">
                      <span className="text-[10px] uppercase text-emerald-400 font-bold block">Start Ride OTP</span>
                      <span className="text-xl font-mono font-extrabold text-white tracking-widest">{b.startOTP}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between items-end gap-4 min-w-[200px]">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Amount</span>
                    <span className="text-2xl font-extrabold text-white">₹{(b.pricing?.total || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex gap-2 w-full lg:w-auto">
                    <Link
                      to={`/handover/${b.id}`}
                      className="flex-1 lg:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs text-center"
                    >
                      Handover Screen
                    </Link>
                    {b.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(b.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(b.id)}
                          className="px-3 py-2 bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-200 font-bold rounded-xl text-xs"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </VendorLayout>
  )
}
