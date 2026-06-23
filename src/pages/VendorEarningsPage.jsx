import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'

export default function VendorEarningsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    if (!user) return
    return onSnapshot(
      query(collection(db, 'bookings'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc')),
      (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    )
  }, [user])

  const completed = bookings.filter((b) => b.status === 'completed')
  const total = completed.reduce((sum, b) => sum + Number(b.pricing?.total || 0), 0)
  const pending = bookings
    .filter((b) => ['approved', 'active'].includes(b.status))
    .reduce((sum, b) => sum + Number(b.pricing?.total || 0), 0)

  return (
    <PageLayout>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-on-surface">Vendor Earnings</h1>
        <p className="mt-2 text-secondary">Track completed revenue and pending payout value.</p>

        <section className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            ['Total earned', total],
            ['Pending payout', pending],
            ['Completed rides', completed.length],
          ].map(([label, value]) => (
            <div key={label} className="bg-white border border-outline-variant rounded-2xl p-5">
              <p className="text-secondary text-sm">{label}</p>
              <p className="mt-2 text-3xl font-black">{typeof value === 'number' && label !== 'Completed rides' ? `Rs ${value.toLocaleString('en-IN')}` : value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 bg-white border border-outline-variant rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-outline-variant">
            <h2 className="font-bold">Recent completed bookings</h2>
          </div>
          {completed.length === 0 ? (
            <p className="p-5 text-secondary">No completed earnings yet.</p>
          ) : completed.slice(0, 20).map((booking) => (
            <div key={booking.id} className="p-5 border-b border-outline-variant last:border-0 flex justify-between gap-4">
              <div>
                <p className="font-bold">{booking.vehicleName}</p>
                <p className="text-sm text-secondary">{booking.bookingId} - {booking.renterName}</p>
              </div>
              <p className="font-black text-green-700">Rs {(booking.pricing?.total || 0).toLocaleString('en-IN')}</p>
            </div>
          ))}
        </section>
      </main>
    </PageLayout>
  )
}
