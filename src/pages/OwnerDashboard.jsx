import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import RideOTPCard from '../components/RideOTPCard'

const tabs = ['Overview', 'My Listings', 'Booking Requests', 'Earnings']

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-surface-container text-secondary',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OwnerDashboard() {
  const { user, userDoc } = useAuth()
  const [activeTab, setActiveTab] = useState('Overview')
  const [myVehicles, setMyVehicles] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const vQ = query(collection(db, 'vehicles'), where('ownerId', '==', user.uid))
    const unsubV = onSnapshot(vQ, (snap) => {
      setMyVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })

    const bQ = query(
      collection(db, 'bookings'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    )
    const unsubB = onSnapshot(bQ, (snap) => {
      setMyBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })

    return () => {
      unsubV()
      unsubB()
    }
  }, [user])

  const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString()

  const approveBooking = async (bookingDocId, vehicleId) => {
    const startOTP = generateOTP()
    const dropoffPIN = generateOTP()
    await updateDoc(doc(db, 'bookings', bookingDocId), {
      status: 'approved',
      startOTP,
      dropoffPIN,
      otpExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(),
    })
    await updateDoc(doc(db, 'vehicles', vehicleId), { available: false })
    toast.success('Booking approved! OTP generated.')
  }

  const rejectBooking = async (bookingDocId, vehicleId) => {
    await updateDoc(doc(db, 'bookings', bookingDocId), {
      status: 'cancelled',
      paymentStatus: 'refunded',
    })
    await updateDoc(doc(db, 'vehicles', vehicleId), { available: true })
    toast.success('Booking rejected. Vehicle re-listed.')
  }

  const totalEarnings = myBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.pricing?.total || 0), 0)
  const pendingCount = myBookings.filter((b) => b.status === 'pending').length
  const activeListings = myVehicles.filter((v) => v.available).length

  return (
    <PageLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Owner Dashboard</h1>
            <p className="text-secondary text-label-md mt-1">Welcome back, {userDoc?.name || 'Owner'}</p>
          </div>
          <Link
            to="/add-vehicle"
            className="flex items-center gap-2 h-10 px-5 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all text-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            List Vehicle
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-surface-container p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-lg text-label-md font-medium transition-all ${
                activeTab === t
                  ? 'bg-surface-container-lowest text-on-surface shadow-soft font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Vehicles', value: myVehicles.length, icon: 'directions_car', color: 'bg-blue-50 text-blue-600' },
                { label: 'Active Listings', value: activeListings, icon: 'check_circle', color: 'bg-green-50 text-green-600' },
                { label: 'Pending Requests', value: pendingCount, icon: 'pending', color: 'bg-yellow-50 text-yellow-600' },
                { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}`, icon: 'payments', color: 'bg-orange-50 text-orange-600' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <p className="text-label-md text-secondary">{label}</p>
                  <p className="text-2xl font-bold text-on-surface mt-1">{value}</p>
                </div>
              ))}
            </div>

            {pendingCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                <p className="font-bold text-yellow-900 mb-1">🔔 {pendingCount} booking request{pendingCount > 1 ? 's' : ''} waiting</p>
                <p className="text-label-md text-yellow-700">Review and approve/reject in the Booking Requests tab.</p>
              </div>
            )}

            {myVehicles.length === 0 && (
              <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <span className="material-symbols-outlined text-6xl text-secondary mb-4 block" style={{ fontVariationSettings: "'FILL' 0" }}>directions_car</span>
                <h3 className="font-bold text-on-surface mb-2">No vehicles listed yet</h3>
                <p className="text-secondary text-label-md mb-6">Start earning by listing your first vehicle on Fleet</p>
                <Link to="/add-vehicle" className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all">
                  + List Your Vehicle
                </Link>
              </div>
            )}
          </div>
        )}

        {/* My Listings */}
        {activeTab === 'My Listings' && (
          <div>
            {myVehicles.length === 0 ? (
              <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <span className="material-symbols-outlined text-6xl text-secondary mb-4 block">directions_car</span>
                <p className="text-secondary mb-4">You haven't listed any vehicles yet.</p>
                <Link to="/add-vehicle" className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all">
                  List a Vehicle
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myVehicles.map((v) => (
                  <div key={v.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
                    <div className="h-40 bg-surface-container flex items-center justify-center">
                      {v.imageUrl ? (
                        <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-5xl text-secondary">directions_car</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-on-surface">{v.name}</h3>
                          <p className="text-label-md text-secondary">{v.city} • {v.type}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${v.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {v.available ? 'Available' : 'Booked'}
                        </span>
                      </div>
                      <p className="font-bold text-primary-container">₹{v.dailyPrice?.toLocaleString('en-IN')}/day</p>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => updateDoc(doc(db, 'vehicles', v.id), { available: !v.available })}
                          className="flex-1 h-9 border border-outline-variant rounded-lg text-label-md font-medium hover:bg-surface-container transition-all"
                        >
                          {v.available ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Booking Requests */}
        {activeTab === 'Booking Requests' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myBookings.length === 0 ? (
              <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <span className="material-symbols-outlined text-6xl text-secondary mb-4 block">calendar_month</span>
                <p className="text-secondary">No booking requests yet.</p>
              </div>
            ) : (
              myBookings.map((b) => (
                <div key={b.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-on-surface">{b.vehicleName}</h3>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColors[b.status] || 'bg-surface-container text-secondary'}`}>
                          {b.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-label-md text-secondary">Renter: {b.renterName} • {b.renterEmail}</p>
                      <p className="text-label-md text-secondary">
                        {b.pickupDate} → {b.dropoffDate} ({b.totalDays} days)
                      </p>
                      <p className="font-bold text-on-surface mt-1">₹{b.pricing?.total?.toLocaleString('en-IN')}</p>
                    </div>
                    {b.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveBooking(b.id, b.vehicleId)}
                          className="h-9 px-4 bg-green-600 text-white rounded-lg font-bold text-label-md hover:opacity-90 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectBooking(b.id, b.vehicleId)}
                          className="h-9 px-4 bg-error text-white rounded-lg font-bold text-label-md hover:opacity-90 active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* OTP Card for approved/active bookings */}
                  {(b.status === 'approved' || b.status === 'active') && (
                    <RideOTPCard booking={b} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Earnings */}
        {activeTab === 'Earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: 'Total Earned',
                  value: `₹${totalEarnings.toLocaleString('en-IN')}`,
                  sub: 'Completed bookings',
                  icon: 'payments',
                  color: 'text-green-600 bg-green-50',
                },
                {
                  label: 'Pending Payout',
                  value: `₹${myBookings.filter(b => b.status === 'approved').reduce((s, b) => s + (b.pricing?.total || 0), 0).toLocaleString('en-IN')}`,
                  sub: 'Active bookings',
                  icon: 'schedule',
                  color: 'text-yellow-600 bg-yellow-50',
                },
                {
                  label: 'Total Bookings',
                  value: myBookings.filter(b => b.status !== 'cancelled').length,
                  sub: 'All time',
                  icon: 'confirmation_number',
                  color: 'text-blue-600 bg-blue-50',
                },
              ].map(({ label, value, sub, icon, color }) => (
                <div key={label} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <p className="text-label-md text-secondary">{label}</p>
                  <p className="text-2xl font-bold text-on-surface mt-1">{value}</p>
                  <p className="text-[12px] text-secondary mt-1">{sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <h3 className="font-bold text-on-surface mb-4">Recent Earnings</h3>
              {myBookings.filter((b) => b.status === 'completed').length === 0 ? (
                <p className="text-secondary text-label-md">No completed bookings yet.</p>
              ) : (
                <div className="space-y-3">
                  {myBookings
                    .filter((b) => b.status === 'completed')
                    .slice(0, 10)
                    .map((b) => (
                      <div key={b.id} className="flex items-center justify-between py-3 border-b border-outline-variant last:border-0">
                        <div>
                          <p className="font-medium text-on-surface">{b.vehicleName}</p>
                          <p className="text-label-md text-secondary">{b.renterName} • {b.pickupDate}</p>
                        </div>
                        <span className="font-bold text-green-600">+₹{b.pricing?.total?.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
