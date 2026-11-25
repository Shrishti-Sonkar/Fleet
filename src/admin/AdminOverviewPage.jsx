import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import AdminLayout from './AdminLayout'

export default function AdminOverviewPage() {
  const [users, setUsers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [kycRequests, setKycRequests] = useState([])
  const [reports, setReports] = useState([])

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'vehicles'), (s) => setVehicles(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (s) =>
        setBookings(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(collection(db, 'verificationRequests'), (s) =>
        setKycRequests(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(collection(db, 'reports'), (s) => setReports(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const pendingKyc = kycRequests.filter((r) => r.status === 'pending').length
  const pendingVendors = users.filter((u) => u.vendorRequested && !['vendor', 'owner'].includes(u.role)).length
  const pendingVehicles = vehicles.filter((v) => v.status === 'pending').length
  const openReports = reports.filter((r) => r.status !== 'resolved' && r.status !== 'reviewed').length

  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid')
  const totalRevenue = paidBookings.reduce((s, b) => s + (b.pricing?.total || 0), 0)
  const platformEarnings = paidBookings.reduce((s, b) => s + (b.splitDetails?.platformCut || 0), 0)
  const vendorsCount = users.filter((u) => ['vendor', 'owner'].includes(u.role)).length

  const kpis = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, sub: `₹${platformEarnings.toLocaleString('en-IN')} platform cut`, icon: 'account_balance', color: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/50' },
    { label: 'Total Users', value: users.length, sub: `${vendorsCount} active vendors`, icon: 'people', color: 'text-blue-400 bg-blue-950/70 border-blue-800/50' },
    { label: 'Fleet Vehicles', value: vehicles.length, sub: `${vehicles.filter((v) => v.status === 'active').length} active listings`, icon: 'directions_car', color: 'text-orange-400 bg-orange-950/70 border-orange-800/50' },
    { label: 'Total Bookings', value: bookings.length, sub: `${paidBookings.length} fully paid`, icon: 'confirmation_number', color: 'text-purple-400 bg-purple-950/70 border-purple-800/50' },
  ]

  const alerts = [
    { count: pendingKyc, label: 'Pending KYC Reviews', to: '/kyc', icon: 'verified_user' },
    { count: pendingVendors, label: 'Vendor Applications', to: '/vendors', icon: 'storefront' },
    { count: pendingVehicles, label: 'Vehicles Awaiting Approval', to: '/vehicles', icon: 'directions_car' },
    { count: openReports, label: 'Open Incident Reports', to: '/reports', icon: 'flag' },
  ]

  return (
    <AdminLayout title="Platform Overview" subtitle="Live operational metrics across customer and vendor portals">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
              <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${k.color}`}>
                <span className="material-symbols-outlined text-[19px]">{k.icon}</span>
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white">{k.value}</p>
            <p className="text-xs text-slate-500 mt-1.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Action Queues */}
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Action Queues</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {alerts.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="bg-[#0b1120] border border-slate-800 hover:border-orange-500/50 rounded-2xl p-4 flex items-center justify-between transition-all"
          >
            <div>
              <p className="text-xs text-slate-400 font-semibold">{a.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${a.count > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{a.count}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-2xl">{a.icon}</span>
          </Link>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-base">Recent Bookings</h2>
          <Link to="/bookings" className="text-xs font-bold text-orange-400 hover:underline">Manage All →</Link>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No bookings recorded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {bookings.slice(0, 8).map((b) => (
              <div key={b.id} className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-bold text-sm text-white">
                    <span className="font-mono text-orange-400 mr-2">{b.bookingId || b.id}</span>
                    {b.vehicleName}
                  </p>
                  <p className="text-xs text-slate-400">{b.renterName} • {b.pickupDate} → {b.dropoffDate}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-white">₹{(b.pricing?.total || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] font-bold uppercase text-slate-400">{b.status} • {b.paymentStatus || 'pending'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
