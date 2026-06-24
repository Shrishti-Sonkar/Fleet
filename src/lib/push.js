import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import toast from 'react-hot-toast'
import app, { db } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let registered = false

/**
 * Register for Web Push (FCM). Safe to call on every login — it no-ops if
 * unsupported, if the VAPID key is missing, or if the user denies permission.
 * Saves the device token to users/{uid}.fcmTokens and shows foreground
 * messages as toasts.
 */
export async function registerPush(uid) {
  if (!uid || registered) return
  if (!VAPID_KEY) return // Push not configured yet — skip silently
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return

  try {
    if (!(await isSupported())) return

    // Pass the (public) Firebase config to the SW via the registration URL.
    const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams(firebaseConfig).toString()}`
    const registration = await navigator.serviceWorker.register(swUrl)

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return

    await setDoc(
      doc(db, 'users', uid),
      { fcmTokens: arrayUnion(token), updatedAt: serverTimestamp() },
      { merge: true },
    )
    registered = true

    // Foreground messages (app open) — FCM does not auto-display these.
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Fleet'
      const body = payload.notification?.body || payload.data?.body || ''
      toast(`${title}${body ? ` — ${body}` : ''}`, { icon: '🔔', duration: 5000 })
    })
  } catch (err) {
    console.error('Push registration failed:', err)
  }
}
