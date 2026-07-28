import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import VendorLayout from '../components/VendorLayout'

export default function VendorDashboardPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const qVehicles = query(collection(db, 'vehicles'), where('ownerId', '==', user.uid))
    const qBookings = query(collection(db, 'bookings'), where('ownerId', '==', user.uid))

    const unsubV = onSnapshot(qVehicles, (snap) => setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const unsubB = onSnapshot(qBookings, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })

    return () => {
      unsubV()
      unsubB()
    }
  }, [user])

  const pendingBookings = bookings.filter((b) => b.status === 'pending')
  const activeBookings = bookings.filter((b) => b.status === 'active')
  const completedBookings = bookings.filter((b) => b.status === 'completed')

  const totalEarnings = completedBookings.reduce(
    (sum, b) => sum + (b.splitDetails?.vendorCut || b.pricing?.total || 0),
    0
  )

  return (
    <VendorLayout title="Partner Dashboard" subtitle="Overview of your listings, active bookings & revenue">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Earnings</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">₹{totalEarnings.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-2">From {completedBookings.length} completed rentals</p>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Listed Vehicles</span>
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-800/50 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">directions_car</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{vehicles.length}</p>
          <p className="text-xs text-slate-500 mt-2">{vehicles.filter((v) => v.available).length} available for rent</p>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Handovers</span>
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-800/50 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{pendingBookings.length}</p>
          <p className="text-xs text-slate-500 mt-2">Awaiting your approval</p>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Rides</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/50 text-indigo-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-400">{activeBookings.length}</p>
          <p className="text-xs text-slate-500 mt-2">Vehicles currently on trip</p>
        </div>
      </div>

      {/* Action Notification Banner */}
      {pendingBookings.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-6 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">notifications_active</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {pendingBookings.length} New Booking Request{pendingBookings.length > 1 ? 's' : ''}!
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">Inspect renter KYC and approve handovers to generate OTPs.</p>
            </div>
          </div>
          <Link
            to="/bookings"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
          >
            Manage Handovers →
          </Link>
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/vehicles/new"
          className="bg-[#0e1424] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-2xl">add_circle</span>
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">List New Vehicle</h3>
          <p className="text-xs text-slate-400 mt-1">Add SUV, Sedan, Bike, or Scooter to your fleet catalog.</p>
        </Link>

        <Link
          to="/payouts"
          className="bg-[#0e1424] border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-2xl">account_balance</span>
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">Razorpay Payouts</h3>
          <p className="text-xs text-slate-400 mt-1">Setup your Linked Account ID for immediate split transfers.</p>
        </Link>

        <Link
          to="/earnings"
          className="bg-[#0e1424] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 text-purple-400 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-2xl">insights</span>
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-purple-400 transition-colors">Financial Reports</h3>
          <p className="text-xs text-slate-400 mt-1">Track rental income, commission cuts, and transaction logs.</p>
        </Link>
      </div>

      {/* Fleet Summary Table */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-extrabold text-base text-white">Your Vehicle Listings</h2>
          <Link to="/vehicles" className="text-xs font-bold text-blue-400 hover:underline">
            View All ({vehicles.length})
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">directions_car</span>
            <p className="text-sm text-slate-400 font-medium">No vehicles listed yet.</p>
            <Link
              to="/vehicles/new"
              className="inline-block mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
            >
              List your first vehicle
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.slice(0, 6).map((v) => (
              <div key={v.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex gap-4 items-center">
                <img
                  src={v.imageUrl || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=2070'}
                  alt={v.name}
                  className="w-20 h-16 object-cover rounded-lg shrink-0 bg-slate-800"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-white truncate">{v.name}</h4>
                  <p className="text-xs text-slate-400">{v.city || 'Dehradun'} • ₹{v.dailyPrice}/day</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        v.available ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {v.available ? 'AVAILABLE' : 'BOOKED'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  )
}
