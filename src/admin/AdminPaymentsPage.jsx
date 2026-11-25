import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

export default function AdminPaymentsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid')
  const tokenPaidBookings = bookings.filter((b) => b.paymentStatus === 'token_paid')
  const pendingBookings = bookings.filter((b) => !b.paymentStatus || b.paymentStatus === 'pending' || b.paymentStatus === 'pay_on_pickup')

  const totalRevenue = paidBookings.reduce((s, b) => s + (b.pricing?.total || 0), 0)
  const platformEarnings = paidBookings.reduce((s, b) => s + (b.splitDetails?.platformCut || 0), 0)
  const vendorPayouts = paidBookings.reduce((s, b) => s + (b.splitDetails?.vendorCut || 0), 0)
  const tokenCollected = tokenPaidBookings.reduce((s, b) => s + (b.tokenAmount || 0), 0)

  const markSettled = async (b) => {
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/bookings/${b.id}`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ transferStatus: 'processed' }),
      })
      toast.success('Settlement marked processed.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <AdminLayout title="Payments & Split Settlements" subtitle="Platform revenue, vendor payouts, and custom split audit">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'text-emerald-400' },
          { label: 'Platform Earnings', value: `₹${platformEarnings.toLocaleString('en-IN')}`, color: 'text-orange-400' },
          { label: 'Vendor Payouts', value: `₹${vendorPayouts.toLocaleString('en-IN')}`, color: 'text-blue-400' },
          { label: 'Tokens Collected', value: `₹${tokenCollected.toLocaleString('en-IN')}`, color: 'text-amber-400' },
        ].map((c) => (
          <div key={c.label} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase text-slate-400">{c.label}</p>
            <p className={`text-2xl font-extrabold mt-2 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-400">{paidBookings.length}</p>
          <p className="text-xs text-slate-400 mt-1">Fully Paid</p>
        </div>
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-400">{tokenPaidBookings.length}</p>
          <p className="text-xs text-slate-400 mt-1">Token Paid</p>
        </div>
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-slate-200">{pendingBookings.length}</p>
          <p className="text-xs text-slate-400 mt-1">Payment Pending</p>
        </div>
      </div>

      <h2 className="font-bold text-white text-base mb-4">Recent Payment Transactions</h2>
      <div className="space-y-3">
        {bookings
          .filter((b) => b.paymentStatus === 'paid' || b.paymentStatus === 'token_paid')
          .slice(0, 30)
          .map((b) => (
            <div key={b.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono font-bold text-orange-400 text-xs">{b.bookingId || b.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    b.paymentStatus === 'paid' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {b.paymentStatus === 'paid' ? 'PAID' : 'TOKEN PAID'}
                  </span>
                  {b.splitDetails?.splitSource && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {b.splitDetails.splitSource === 'vendor_override' ? 'Vendor Custom Split' : 'Default Split'} ({b.splitDetails.platformCommissionPercent}%)
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-white">{b.vehicleName} • {b.renterName}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-extrabold text-white">₹{(b.amountPaid || b.pricing?.total || 0).toLocaleString('en-IN')}</p>
                  {b.splitDetails && (
                    <p className="text-[11px] text-slate-400">
                      Platform: ₹{b.splitDetails.platformCut?.toLocaleString('en-IN')} | Vendor: ₹{b.splitDetails.vendorCut?.toLocaleString('en-IN')} ({b.splitDetails.transferStatus})
                    </p>
                  )}
                </div>
                {b.splitDetails && b.splitDetails.transferStatus !== 'processed' && (
                  <button onClick={() => markSettled(b)} className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-800 text-emerald-300 text-xs font-bold">
                    Mark Settled
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </AdminLayout>
  )
}
