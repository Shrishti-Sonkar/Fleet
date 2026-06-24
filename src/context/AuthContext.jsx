import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { registerPush } from '../lib/push'

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
    // Safety net: never let the app hang on the loading screen, even if the
    // Firestore user-doc read below is slow or never resolves.
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 2000)

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      // Resolve the UI immediately based on auth state — do NOT block rendering
      // on the Firestore document fetch (which can hang on slow networks/rules).
      if (!firebaseUser) {
        setUser(null)
        setUserDoc(null)
        clearTimeout(timeout)
        setLoading(false)
        return
      }

      setUser(firebaseUser)
      clearTimeout(timeout)
      setLoading(false)

      // Register for push notifications (no-ops if unsupported/not configured).
      registerPush(firebaseUser.uid)

      // Fetch the user doc in the background; failures don't block the app.
      fetchAndMigrateUserDoc(firebaseUser.uid)
        .then((uDoc) => setUserDoc(uDoc))
        .catch((err) => {
          console.error('Error fetching user doc:', err)
          setUserDoc(null)
        })
    })
    return () => { clearTimeout(timeout); unsub() }
  }, [])

  // Refresh userDoc (call after KYC approval or profile update)
  const refreshUserDoc = async () => {
    if (!user) return
    const uDoc = await fetchAndMigrateUserDoc(user.uid)
    setUserDoc(uDoc)
  }

  // Switch the account between Rider and Vendor mode (one account, both modes).
  const switchRole = async (target) => {
    if (!user) return null
    const next = target === 'vendor' ? 'vendor' : 'renter'
    await setDoc(
      doc(db, 'users', user.uid),
      { role: next, roleSetAt: serverTimestamp() },
      { merge: true },
    )
    const uDoc = await fetchAndMigrateUserDoc(user.uid)
    setUserDoc(uDoc)
    return next
  }

  const signup = async (email, password, name, phone, role = 'renter') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      phone: phone || '',
      // Role chosen by the user on the sign-up screen
      role: role === 'vendor' ? 'vendor' : 'renter',
      roleSetAt: serverTimestamp(),
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
        role: 'renter',
        roleSetAt: serverTimestamp(),
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
          callback: () => { },
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
        role: 'renter',
        roleSetAt: serverTimestamp(),
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
  // userDoc===undefined means still loading → role=undefined
  // userDoc===null means logged out or doc missing → treat as undefined (not null) to avoid redirect loops
  const userRole = userDoc?.role ?? undefined
  const isVendor = userRole === 'vendor'
  const isRenter = userRole === 'renter' || (userDoc !== undefined && !userRole)

  return (
    <AuthContext.Provider value={{
      user, userDoc, loading,
      signup, signin, googleSignin, logout, resetPassword,
      sendOTP, verifyOTP,
      refreshUserDoc, switchRole, isAdmin, isOwner, isKycApproved,
      userRole, isVendor, isRenter,
    }}>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#faf9f9', gap: '16px' }}>
          <div style={{ width: 56, height: 56, border: '4px solid #e5e2e1', borderTop: '4px solid #ff6b00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px', color: '#5f5e5e', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Loading Fleet...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
