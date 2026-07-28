import fs from 'fs'
import path from 'path'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import Razorpay from 'razorpay'
import crypto from 'crypto'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
})

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const isDevMode = process.env.NODE_ENV !== 'production'

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    if (isDevMode && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true)
    }
    return callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}))

app.use(express.json({ limit: '1mb' }))

let firebaseInitError = null
let firebaseMode = 'not_configured'

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'),
      )
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
      firebaseMode = 'service_account_base64'
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credentialsPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      if (fs.existsSync(credentialsPath)) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() })
        firebaseMode = 'application_default'
      }
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
      firebaseMode = 'project_id_only'
    } else {
      admin.initializeApp({ projectId: 'fleetmobilities-3ee31' })
      firebaseMode = 'default_fallback'
    }
  } catch (error) {
    firebaseInitError = error
    console.warn(`[Firebase Admin] ${error.message}`)
  }
}

const db = admin.apps.length ? admin.firestore() : null

function requireFirebase(req, res, next) {
  if (db && admin.apps.length) return next()
  return res.status(503).json({
    error: firebaseInitError?.message || 'Firebase Admin credentials are not configured',
  })
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  return admin.auth().verifyIdToken(token)
    .then((decoded) => {
      req.user = decoded
      return next()
    })
    .catch(() => res.status(401).json({ error: 'Invalid authentication token' }))
}

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: db ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'fleet-vendor-portal-api',
  })
})

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next()
  return requireFirebase(req, res, next)
})

// Vendor Payout / Bank settings endpoint
app.put('/api/vendor/payout-settings', requireAuth, async (req, res) => {
  try {
    const { razorpayAccountId, bankName, accountNumber, ifsc } = req.body
    await db.collection('users').doc(req.user.uid).set({
      razorpayAccountId: String(razorpayAccountId || '').trim(),
      payout: {
        bankName: String(bankName || '').trim(),
        accountNumber: String(accountNumber || '').trim(),
        ifsc: String(ifsc || '').trim(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Approve Booking (Vendor Action)
app.post('/api/bookings/:id/approve', requireAuth, async (req, res) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id)
    const snap = await bookingRef.get()
    if (!snap.exists) return res.status(404).json({ error: 'Booking not found' })

    const startOTP = generateOTP()
    const dropoffPIN = generateOTP()

    await bookingRef.update({
      status: 'approved',
      startOTP,
      dropoffPIN,
      otpExpiry: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(200).json({ success: true, startOTP, dropoffPIN })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to approve booking' })
  }
})

// Renter KYC details for Vendor inspection
app.get('/api/bookings/:id/renter-kyc', requireAuth, async (req, res) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id)
    const snap = await bookingRef.get()
    if (!snap.exists) return res.status(404).json({ error: 'Booking not found' })
    const booking = snap.data()

    const userSnap = await db.collection('users').doc(booking.renterId).get()
    const u = userSnap.exists ? userSnap.data() : {}
    res.status(200).json({
      renterId: booking.renterId,
      name: u.name || booking.renterName || '',
      phone: u.phone || '',
      email: u.email || booking.renterEmail || '',
      kycStatus: u.kycStatus || 'not_submitted',
      isVerified: !!u.isVerified,
      aadhaarUrl: u.aadhaarUrl || '',
      dlUrl: u.dlUrl || '',
      selfieUrl: u.selfieUrl || '',
    })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to fetch renter KYC' })
  }
})

// Reject booking (Vendor Action)
app.post('/api/bookings/:id/reject', requireAuth, async (req, res) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id)
    const snap = await bookingRef.get()
    if (!snap.exists) return res.status(404).json({ error: 'Booking not found' })
    const booking = snap.data()

    await db.runTransaction(async (transaction) => {
      const vehicleRef = db.collection('vehicles').doc(booking.vehicleId)
      transaction.update(bookingRef, {
        status: 'cancelled',
        cancelledBy: req.user.uid,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      transaction.update(vehicleRef, { available: true })
    })

    res.status(200).json({ success: true })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to reject booking' })
  }
})

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Fleet Vendor Backend running on port ${PORT}`)
  })
}

export default app
