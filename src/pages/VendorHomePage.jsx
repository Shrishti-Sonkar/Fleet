import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '@/lib/constants'
import TopNavBar from '../components/layout/TopNavBar'
import VendorNav from '../components/VendorNav'

// Entrance animation presets
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

function StatCard({ value, label, icon, accent = 'slate' }) {
  const accents = {
    green: { chip: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600', glow: 'before:bg-emerald-400/20' },
    slate: { chip: 'bg-slate-100 text-slate-500', value: 'text-slate-900', glow: 'before:bg-slate-400/10' },
    blue:  { chip: 'bg-blue-50 text-blue-600', value: 'text-slate-900', glow: 'before:bg-blue-400/20' },
    amber: { chip: 'bg-amber-50 text-amber-500', value: 'text-amber-500', glow: 'before:bg-amber-400/20' },
  }
  const a = accents[accent] || accents.slate
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white p-4 border border-slate-100
        shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_-16px_rgba(15,23,42,0.22)]
        before:absolute before:-right-6 before:-top-6 before:h-20 before:w-20 before:rounded-full before:blur-2xl
        before:transition-opacity before:duration-300 before:opacity-0 group-hover:before:opacity-100 ${a.glow}`}
    >
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.chip}`}>
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </span>
      </div>
      <div className={`relative text-2xl font-black tracking-tight ${a.value}`}>{value}</div>
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
    <div className="min-h-screen bg-slate-50" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <TopNavBar />

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-2xl mx-auto px-4 pt-[84px] pb-8 space-y-6"
      >

        {/* Greeting — premium gradient header */}
        <motion.div
          variants={item}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)]"
        >
          {/* decorative glow blobs */}
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm ring-1 ring-white/10">
                <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                Vendor Dashboard
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight">
                {greeting}, {firstName} <span className="inline-block">👋</span>
              </h1>
              <p className="mt-1 text-sm text-white/55">Here's your fleet overview</p>
            </div>
            <Link to={ROUTES.PROFILE} className="shrink-0">
              <div className="h-11 w-11 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center text-white font-bold text-sm transition-transform hover:scale-105">
                {userDoc?.selfieUrl
                  ? <img src={userDoc.selfieUrl} alt="" className="h-full w-full object-cover" />
                  : (userDoc?.name?.[0]?.toUpperCase() || 'V')}
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div variants={item} className="grid grid-cols-2 gap-3">
            <StatCard
              value={`₹${stats.monthlyEarnings.toLocaleString('en-IN')}`}
              label="This Month"
              icon="payments"
              accent="green"
            />
            <StatCard
              value={stats.vehicleCount}
              label="Active Vehicles"
              icon="directions_car"
              accent="blue"
            />
            <StatCard
              value={stats.completedRides}
              label="Total Rides"
              icon="flag"
              accent="slate"
            />
            <StatCard
              value={stats.avgRating > 0 ? `${stats.avgRating} ★` : '—'}
              label="Avg Rating"
              icon="star"
              accent="amber"
            />
          </motion.div>
        )}

        {/* Action Needed */}
        {!loading && stats.pendingBookings > 0 && (
          <motion.div
            variants={item}
            onClick={() => navigate(ROUTES.VENDOR_DASHBOARD)}
            className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 p-4 text-white cursor-pointer shadow-[0_12px_30px_-12px_rgba(244,63,94,0.6)] transition-all active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
              <span className="material-symbols-outlined text-white text-[18px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
            </div>
            <div className="relative flex-1">
              <p className="text-sm font-bold">Action needed</p>
              <p className="text-xs text-white/85 mt-0.5">
                {stats.pendingBookings} booking request{stats.pendingBookings > 1 ? 's' : ''} waiting for approval
              </p>
            </div>
            <span className="relative material-symbols-outlined text-white/90 text-[20px] transition-transform group-hover:translate-x-0.5">arrow_forward_ios</span>
          </motion.div>
        )}

        {/* Your Vehicles */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Your Vehicles</h2>
            <Link to={ROUTES.VENDOR_DASHBOARD} className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
              See all →
            </Link>
          </div>

          {vehicles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <span className="mb-3 block text-4xl">🚗</span>
              <p className="mb-1 font-semibold text-slate-700">No vehicles yet</p>
              <p className="mb-4 text-sm text-slate-400">List your first vehicle to start earning</p>
              <Link
                to={ROUTES.VENDOR_ADD}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Vehicle
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.slice(0, 3).map(v => (
                <div
                  key={v.id}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5
                    shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300
                    hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_30px_-16px_rgba(15,23,42,0.25)]"
                >
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <img
                      src={v.imageUrl || v.images?.[0]}
                      alt={v.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{v.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{v.city} · ₹{v.dailyPrice}/day</p>
                  </div>
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    v.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${v.available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {v.available ? 'Available' : 'Booked'}
                  </div>
                </div>
              ))}

              <Link
                to={ROUTES.VENDOR_ADD}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-500 transition-all hover:border-slate-900 hover:text-slate-900"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add New Vehicle
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">Recent Activity</h2>
              <Link to={ROUTES.VENDOR_DASHBOARD} className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                View all →
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-20px_rgba(15,23,42,0.2)] divide-y divide-slate-50">
              {recentActivity.map((b) => {
                const sc = statusConfig[b.status] || { label: b.status, bg: 'bg-gray-100', text: 'text-gray-600' }
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{b.vehicleName || 'Vehicle'}</p>
                      <p className="text-xs text-slate-400">{b.renterName || 'Customer'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                      <p className="mt-1 text-xs text-slate-400">₹{b.pricing?.total?.toLocaleString('en-IN') || '—'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

      </motion.main>

      <VendorNav />
    </div>
  )
}
