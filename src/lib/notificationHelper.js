import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { apiFetch } from './api'

/**
 * Create a notification for a user. Routes through the backend so it also
 * delivers an FCM push. Falls back to a direct Firestore write if the caller
 * is somehow not authenticated (push won't fire in that case).
 */
export const sendNotification = async ({ userId, type, title, body, actionUrl = '' }) => {
  if (!userId) return
  try {
    const token = await auth.currentUser?.getIdToken()
    if (token) {
      await apiFetch('/api/notifications/send', {
        token,
        method: 'POST',
        body: JSON.stringify({ userId, type, title, body, actionUrl }),
      })
      return
    }

    // Fallback: in-app only (no push)
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      body,
      actionUrl,
      read: false,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('sendNotification failed:', err)
  }
}
