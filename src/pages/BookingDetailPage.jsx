import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import PageLayout from '../components/layout/PageLayout'
import { generateInvoice } from '../lib/invoiceGenerator'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function BookingDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        let bookingData = null
        const direct = await getDoc(doc(db, 'bookings', id))
        if (direct.exists()) {
          bookingData = { id: direct.id, ...direct.data() }
        } else {
          const snap = await getDocs(query(collection(db, 'bookings'), where('bookingId', '==', id)))
          if (!snap.empty) bookingData = { id: snap.docs[0].id, ...snap.docs[0].data() }
        }

        setBooking(bookingData)
        if (bookingData?.vehicleId) {
          const vehicleSnap = await getDoc(doc(db, 'vehicles', bookingData.vehicleId))
          if (vehicleSnap.exists()) setVehicle({ id: vehicleSnap.id, ...vehicleSnap.data() })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return <PageLayout><div className="py-20 text-center text-secondary">Loading booking...</div></PageLayout>
  }

  if (!booking) {
    return (
      <PageLayout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-black">Booking not found</h1>
          <Link to="/my-bookings" className="mt-6 inline-flex h-11 px-5 rounded-xl bg-primary-container text-white font-bold items-center">
            My Bookings
          </Link>
        </div>
      </PageLayout>
    )
  }

  const rows = [
    ['Booking ID', booking.bookingId || booking.id],
    ['Status', booking.status],
    ['Payment', booking.paymentStatus],
    ['Vehicle', booking.vehicleName],
    ['Pickup', `${booking.pickupDate || ''} ${booking.pickupTime || ''}`],
    ['Dropoff', `${booking.dropoffDate || ''} ${booking.dropoffTime || ''}`],
    ['Location', booking.pickupLocation || '-'],
    ['Total', `Rs ${(booking.pricing?.total || 0).toLocaleString('en-IN')}`],
  ]

  return (
    <PageLayout>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/my-bookings" className="text-primary-container font-bold text-sm">Back to My Bookings</Link>
        <h1 className="mt-4 text-3xl font-black text-on-surface">Booking Details</h1>
        <section className="mt-8 bg-white border border-outline-variant rounded-2xl overflow-hidden">
          {booking.vehicleImage && <img src={booking.vehicleImage} alt={booking.vehicleName} className="w-full h-56 object-cover" />}
          <div className="p-6 space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3 border-b border-outline-variant last:border-0">
                <span className="text-secondary">{label}</span>
                <span className="font-bold text-right">{value || '-'}</span>
              </div>
            ))}
          </div>
        </section>
        <button
          onClick={() => {
            generateInvoice(booking, vehicle, user)
            toast.success('Invoice generated.')
          }}
          className="mt-6 h-11 px-5 rounded-xl bg-primary-container text-white font-bold"
        >
          Download Invoice
        </button>
      </main>
    </PageLayout>
  )
}
