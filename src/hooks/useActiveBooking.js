import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export function useActiveBooking() {
  const { user } = useAuth()
  const [activeBooking, setActiveBooking] = useState(null)
  const [upcomingBooking, setUpcomingBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setActiveBooking(null)
      setUpcomingBooking(null)
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'bookings'),
      where('renterId', '==', user.uid),
      where('status', 'in', ['approved', 'active'])
    )

    const unsub = onSnapshot(q, (snap) => {
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Sort client-side by createdAt desc to avoid composite index requirement
      bookings.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
        return dateB - dateA
      })

      const active = bookings.find(b => b.status === 'active') || null
      const upcoming = bookings.find(b => b.status === 'approved') || null

      setActiveBooking(active)
      setUpcomingBooking(upcoming)
      setLoading(false)
    }, (err) => {
      console.error('Error fetching active bookings:', err)
      setLoading(false)
    })

    return unsub
  }, [user])

  return { activeBooking, upcomingBooking, loading }
}
