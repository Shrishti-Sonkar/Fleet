import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    // No orderBy — sort client-side to avoid composite index requirement
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    )

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const tA = a.createdAt?.toDate?.() ?? new Date(0)
          const tB = b.createdAt?.toDate?.() ?? new Date(0)
          return tB - tA
        })
      setNotifications(list)
      setUnreadCount(list.filter(n => !n.read).length)
      setLoading(false)
    }, (err) => {
      console.error('useNotifications fetch error:', err)
      setLoading(false)
    })
    return unsub
  }, [userId])

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true })
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read)
    if (!unread.length) return
    try {
      const batch = writeBatch(db)
      unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }))
      await batch.commit()
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead, loading }
}
