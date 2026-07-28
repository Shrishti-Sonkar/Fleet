import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD8tk7L9fR__bDOXstAGiih_Ht57j10GXk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fleetmobilities-3ee31.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fleetmobilities-3ee31',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'fleetmobilities-3ee31.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '172961747786',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:172961747786:web:9754769b0ca6e4dfcce7b3',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)
