import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser)
      if (authUser) {
        try {
          const docRef = doc(db, 'users', authUser.uid)
          const snap = await getDoc(docRef)
          if (snap.exists()) {
            setUserDoc(snap.data())
          } else {
            // New vendor user document
            const newDoc = {
              name: authUser.displayName || 'Vendor Partner',
              email: authUser.email,
              role: 'vendor',
              kycStatus: 'not_submitted',
              createdAt: serverTimestamp(),
            }
            await setDoc(docRef, newDoc)
            setUserDoc(newDoc)
          }
        } catch (e) {
          console.error('Error fetching user doc:', e)
        }
      } else {
        setUserDoc(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

  const register = async (email, password, name, phone) => {
    const res = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', res.user.uid), {
      name,
      email,
      phone,
      role: 'vendor',
      kycStatus: 'not_submitted',
      createdAt: serverTimestamp(),
    })
    return res
  }

  const logout = () => signOut(auth)

  const value = {
    user,
    userDoc,
    loading,
    login,
    register,
    logout,
    isVendor: userDoc?.role === 'vendor' || userDoc?.role === 'owner',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
