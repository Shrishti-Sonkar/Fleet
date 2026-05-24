import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '@/lib/constants'
import TopNavBar from '../components/layout/TopNavBar'
import VendorNav from '../components/VendorNav'

function StatCard({ value, label, icon, color = 'text-black' }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-1 min-w-0">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="material-symbols-outlined text-[18px] text-gray-300" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div className={`text-2xl font-black ${color} tracking-tight`}>{value}</div>
    </div>
  )
}

export default function VendorHomePage() {
  const navigate = useNavigate()
  const { user, userDoc } = useAuth()
  const [stats, setStats] = useState({
    monthlyEarnings: 0,
    vehicleCount: 0,
    pendingBookings: 0,
    avgRating: 0,
    completedRides: 0,
  })
  const [vehicles, setVehicles] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userDoc?.name?.split(' ')[0] || 'there'

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  const fetchStats = async () => {
    try {
      const uid = user.uid

      // Fetch all bookings for this owner
      const bookingsSnap = await getDocs(query(
        collection(db, 'bookings'),
        where('ownerId', '==', uid)
      ))
      const allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // This month's earnings from completed bookings
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyEarnings = allBookings
        .filter(b => b.status === 'completed' && b.createdAt?.toDate?.() >= startOfMonth)
        .reduce((sum, b) => sum + (b.pricing?.total || 0), 0)

      // Pending bookings needing approval
      const pendingBookings = allBookings.filter(b => b.status === 'pending').length

      // Average rating from completed bookings
      const rated = allBookings.filter(b => b.renterRating)
      const avgRating = rated.length > 0
        ? (rated.reduce((sum, b) => sum + b.renterRating, 0) / rated.length).toFixed(1)
        : 0

      // Recent activity (last 5 bookings)
      const sorted = [...allBookings].sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(0)
        const bDate = b.createdAt?.toDate?.() || new Date(0)
        return bDate - aDate
      })
      setRecentActivity(sorted.slice(0, 5))

      // Fetch active vehicles
      const vehiclesSnap = await getDocs(query(
        collection(db, 'vehicles'),
        where('ownerId', '==', uid)
      ))
      const vehicleList = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setVehicles(vehicleList)

      setStats({
        monthlyEarnings,
        vehicleCount: vehicleList.filter(v => v.status === 'active').length,
        pendingBookings,
        avgRating,
        completedRides: allBookings.filter(b => b.status === 'completed').length,
      })
    } catch (err) {
      console.error('VendorHome stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    pending:   { label: 'Pending',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
    approved:  { label: 'Approved',  bg: 'bg-blue-100',   text: 'text-blue-700'   },
    active:    { label: 'Active',    bg: 'bg-green-100',  text: 'text-green-700'  },
    completed: { label: 'Completed', bg: 'bg-gray-100',   text: 'text-gray-600'   },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100',    text: 'text-red-600'    },
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <TopNavBar />

      <main className="max-w-2xl mx-auto px-4 pt-[84px] pb-8 space-y-6">

        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-gray-400 font-medium uppercase tracking-wider">Vendor Dashboard</p>
            </div>
            <h1 className="text-2xl font-black text-black mt-0.5">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Here's your fleet overview</p>
          </div>
          <Link to={ROUTES.PROFILE}>
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {userDoc?.selfieUrl
                ? <img src={userDoc.selfieUrl} alt="" className="w-full h-full object-cover" />
                : (userDoc?.name?.[0]?.toUpperCase() || 'V')}
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 h-20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              value={`₹${stats.monthlyEarnings.toLocaleString('en-IN')}`}
              label="This Month"
              icon="currency_rupee"
              color="text-green-600"
            />
            <StatCard
              value={stats.vehicleCount}
              label="Active Vehicles"
              icon="directions_car"
            />
            <StatCard
              value={stats.completedRides}
              label="Total Rides"
              icon="flag"
            />
            <StatCard
              value={stats.avgRating > 0 ? `${stats.avgRating} ★` : '—'}
              label="Avg Rating"
              icon="star"
              color="text-amber-500"
            />
          </div>
        )}

        {/* Action Needed */}
        {!loading && stats.pendingBookings > 0 && (
          <div
            onClick={() => navigate(ROUTES.VENDOR_DASHBOARD)}
            className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100 cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700">Action needed</p>
              <p className="text-xs text-red-500 mt-0.5">
                {stats.pendingBookings} booking request{stats.pendingBookings > 1 ? 's' : ''} waiting for approval
              </p>
            </div>
            <span className="material-symbols-outlined text-red-400 text-[20px]">arrow_forward_ios</span>
          </div>
        )}

        {/* Your Vehicles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-black">Your Vehicles</h2>
            <Link to={ROUTES.VENDOR_DASHBOARD} className="text-xs font-semibold text-gray-500">
              See all →
            </Link>
          </div>

          {vehicles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <span className="text-4xl block mb-3">🚗</span>
              <p className="font-semibold text-gray-700 mb-1">No vehicles yet</p>
              <p className="text-sm text-gray-400 mb-4">List your first vehicle to start earning</p>
              <Link
                to={ROUTES.VENDOR_ADD}
                className="inline-flex items-center gap-2 bg-black text-white text-sm font-bold px-5 py-2.5 rounded-full"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Vehicle
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.slice(0, 3).map(v => (
                <div key={v.id} className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center gap-3">
                  <div className="w-16 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={v.imageUrl || v.images?.[0]}
                      alt={v.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-black truncate">{v.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v.city} · ₹{v.dailyPrice}/day</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    v.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {v.available ? 'Available' : 'Booked'}
                  </div>
                </div>
              ))}

              <Link
                to={ROUTES.VENDOR_ADD}
                className="flex items-center justify-center gap-2 w-full p-3.5 bg-white rounded-2xl border border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-black hover:text-black transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add New Vehicle
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-black">Recent Activity</h2>
              <Link to={ROUTES.VENDOR_DASHBOARD} className="text-xs font-semibold text-gray-500">
                View all →
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
              {recentActivity.map((b) => {
                const sc = statusConfig[b.status] || { label: b.status, bg: 'bg-gray-100', text: 'text-gray-600' }
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-gray-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-black truncate">{b.vehicleName || 'Vehicle'}</p>
                      <p className="text-xs text-gray-400">{b.renterName || 'Customer'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">₹{b.pricing?.total?.toLocaleString('en-IN') || '—'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>

      <VendorNav />
    </div>
  )
}
