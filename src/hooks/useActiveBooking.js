import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export function useActiveBooking() {
  const { user } = useAuth()
  const [activeBooking, setActiveBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setActiveBooking(null)
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'bookings'),
      where('renterId', '==', user.uid),
      where('status', 'in', ['pending', 'approved', 'active'])
    )

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Map and sort client-side by createdAt descending to avoid index errors
        const bookingsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        bookingsList.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
          return dateB - dateA
        })
        setActiveBooking(bookingsList[0])
      } else {
        setActiveBooking(null)
      }
      setLoading(false)
    }, (err) => {
      console.error('Error fetching active bookings:', err)
      setLoading(false)
    })

    return unsub
  }, [user])

  return { activeBooking, loading }
}
