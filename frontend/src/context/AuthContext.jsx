import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  // Helper to fetch user doc and apply self-healing migrations (like adding tokens)
  const fetchAndMigrateUserDoc = async (uid) => {
    const userRef = doc(db, 'users', uid)
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      const data = snap.data()
      const updates = {}
      if (data.tokens === undefined) {
        updates.tokens = 10
        updates.tokensUsed = 0
      }
      if (Object.keys(updates).length > 0) {
        await setDoc(userRef, updates, { merge: true })
        return { ...data, ...updates }
      }
      return data
    }
    return null
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const uDoc = await fetchAndMigrateUserDoc(firebaseUser.uid)
          setUserDoc(uDoc)
          setUser(firebaseUser)
        } else {
          setUser(null)
          setUserDoc(null)
        }
      } catch (err) {
        console.error('Error in onAuthStateChanged auth listener:', err)
        // Fallback: still authenticate user even if userDoc retrieval fails
        if (firebaseUser) {
          setUser(firebaseUser)
        }
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  // Refresh userDoc (call after KYC approval or profile update)
  const refreshUserDoc = async () => {
    if (!user) return
    const uDoc = await fetchAndMigrateUserDoc(user.uid)
    setUserDoc(uDoc)
  }

  const signup = async (email, password, name, phone, phoneVerified = false) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    // Send email verification link
    await sendEmailVerification(cred.user)
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      phone: phone || '',
      phoneVerified,
      emailVerified: false,
      // role is NOT set here — set on RoleSelectionPage
      kycStatus: 'not_submitted',
      isVerified: false,
      verifiedBadge: false,
      tokens: 10,
      tokensUsed: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return cred
  }

  // Feature 2: Remember Me — use localStorage or sessionStorage persistence
  const signin = async (email, password, rememberMe = true) => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    )
    return signInWithEmailAndPassword(auth, email, password)
  }

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
        // role is NOT set here — set on RoleSelectionPage
        kycStatus: 'not_submitted',
        isVerified: false,
        verifiedBadge: false,
        tokens: 10,
        tokensUsed: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    return cred
  }

  const logout = () => signOut(auth)

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  // Feature 1: Phone OTP — Step 1: send OTP
  const sendOTP = async (phoneNumber) => {
    try {
      // Clean up any stale verifier
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            window.recaptchaVerifier = null
          },
        }
      )
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        window.recaptchaVerifier
      )
      window.confirmationResult = confirmationResult
      return { success: true }
    } catch (err) {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
      throw err
    }
  }

  // Feature 1: Phone OTP — Step 2: verify OTP
  const verifyOTP = async (otp) => {
    if (!window.confirmationResult) {
      throw new Error('No OTP sent. Please request OTP first.')
    }
    const cred = await window.confirmationResult.confirm(otp)

    // Create Firestore user doc if this is a new phone-auth user
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: '',
        email: '',
        phone: cred.user.phoneNumber,
        // role is NOT set here — set on RoleSelectionPage
        kycStatus: 'not_submitted',
        isVerified: false,
        verifiedBadge: false,
        tokens: 10,
        tokensUsed: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    return cred
  }

  const isAdmin = () => userDoc?.role === 'admin'
  const isOwner = () => userDoc?.role === 'owner' || userDoc?.role === 'admin'
  const isKycApproved = () => userDoc?.kycStatus === 'approved'

  // Role helpers — derived from userDoc (no extra state)
  const userRole = userDoc === null ? null : (userDoc?.role ?? undefined)
  const isVendor = userRole === 'vendor'
  const isRenter = userRole === 'renter'

  return (
    <AuthContext.Provider value={{
      user, userDoc, loading,
      signup, signin, googleSignin, logout, resetPassword,
      sendOTP, verifyOTP,
      refreshUserDoc, isAdmin, isOwner, isKycApproved,
      userRole, isVendor, isRenter,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
