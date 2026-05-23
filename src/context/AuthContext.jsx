import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setUserDoc(snap.exists() ? snap.data() : null)
        setUser(firebaseUser)
      } else {
        setUser(null)
        setUserDoc(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // Refresh userDoc (call after KYC approval)
  const refreshUserDoc = async () => {
    if (!user) return
    const snap = await getDoc(doc(db, 'users', user.uid))
    setUserDoc(snap.exists() ? snap.data() : null)
  }

  const signup = async (email, password, name, phone) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      phone: phone || '',
      role: 'renter',
      kycStatus: 'not_submitted',
      isVerified: false,
      verifiedBadge: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return cred
  }

  const signin = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const googleSignin = async () => {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: cred.user.displayName || '',
        email: cred.user.email || '',
        phone: cred.user.phoneNumber || '',
        role: 'renter',
        kycStatus: 'not_submitted',
        isVerified: false,
        verifiedBadge: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    return cred
  }

  const logout = () => signOut(auth)

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  const isAdmin = () => userDoc?.role === 'admin'
  const isOwner = () => userDoc?.role === 'owner' || userDoc?.role === 'admin'
  const isKycApproved = () => userDoc?.kycStatus === 'approved'

  return (
    <AuthContext.Provider value={{
      user, userDoc, loading,
      signup, signin, googleSignin, logout, resetPassword,
      refreshUserDoc, isAdmin, isOwner, isKycApproved,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
