import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import VendorLayout from './VendorLayout'

export default function VendorEarningsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'bookings'),
      where('ownerId', '==', user.uid),
      where('status', '==', 'completed')
    )
    return onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user])

  const totalEarnings = bookings.reduce(
    (sum, b) => sum + (b.splitDetails?.vendorCut || b.pricing?.total || 0),
    0
  )
  const platformFees = bookings.reduce(
    (sum, b) => sum + (b.splitDetails?.platformCut || 0),
    0
  )
  const pendingPayouts = bookings.filter((b) => b.splitDetails?.transferStatus !== 'processed')

  return (
    <VendorLayout title="Earnings & Revenue" subtitle="Financial breakdown of rental revenue and platform settlements">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Vendor Net Earnings</span>
          <p className="text-3xl font-extrabold text-emerald-400">₹{totalEarnings.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-2">After platform commission split</p>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Platform Cut (Fee)</span>
          <p className="text-3xl font-extrabold text-blue-400">₹{platformFees.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-2">Platform commission percentage</p>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Settlements</span>
          <p className="text-3xl font-extrabold text-amber-400">{pendingPayouts.length}</p>
          <p className="text-xs text-slate-500 mt-2">Payouts awaiting Razorpay settlement</p>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-6">
        <h2 className="font-extrabold text-base text-white mb-6">Completed Ride Settlements</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">account_balance_wallet</span>
            <p className="text-slate-400 font-medium text-sm">No completed rides yet. Revenue records will display here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4"
              >
                <div>
                  <h4 className="font-bold text-sm text-white">{b.vehicleName}</h4>
                  <p className="text-xs text-slate-400">
                    Booking: <span className="font-mono text-slate-300">{b.bookingId || b.id}</span> • {b.renterName}
                  </p>
                  <p className="text-xs text-slate-500">{b.pickupDate} → {b.dropoffDate}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Net Payout</span>
                  <p className="font-extrabold text-emerald-400 text-lg">
                    ₹{(b.splitDetails?.vendorCut || b.pricing?.total || 0).toLocaleString('en-IN')}
                  </p>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      b.splitDetails?.transferStatus === 'processed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                    }`}
                  >
                    {b.splitDetails?.transferStatus === 'processed' ? 'SETTLED' : 'PENDING'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  )
}
