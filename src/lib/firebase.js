import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBDc3IsQrYz5mJHUWYDgJGQaznAoaHb5AM",
  authDomain: "fleet-official.firebaseapp.com",
  projectId: "fleet-official",
  storageBucket: "fleet-official.firebasestorage.app",
  messagingSenderId: "197680969356",
  appId: "1:197680969356:web:e85cbec4e78f6ff50a6da9",
  measurementId: "G-4C6XMS9DS4"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app, 'default')
export default app
