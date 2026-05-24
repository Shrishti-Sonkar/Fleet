import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export const sendNotification = async ({ userId, type, title, body, actionUrl = '' }) => {
  if (!userId) return
  try {
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
