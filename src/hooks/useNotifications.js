import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  orderBy, limit, updateDoc, doc, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(20)
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort client-side by createdAt descending to avoid index errors
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
        return dateB - dateA
      })
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
      setLoading(false)
    }, (err) => {
      console.error('Notifications fetch error:', err)
      setLoading(false)
    })

    return unsub
  }, [user])

  const markAsRead = async (notifId) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true })
  }

  const markAllRead = async () => {
    if (!user) return
    const batch = writeBatch(db)
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true })
    })
    await batch.commit()
  }

  return { notifications, unreadCount, loading, markAsRead, markAllRead }
}
