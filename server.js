import fs from 'fs'
import path from 'path'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {
  initializeApp,
  applicationDefault,
  cert,
  getApps,
} from 'firebase-admin/app'

import { getAuth } from 'firebase-admin/auth'

import {
  getFirestore,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore'

import { getMessaging } from 'firebase-admin/messaging'
import Razorpay from 'razorpay'
import crypto from 'crypto'

dotenv.config()

let razorpayClient = null
function getRazorpay() {
  if (razorpayClient) return razorpayClient
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const err = new Error('Razorpay payment keys are not configured')
    err.status = 503
    throw err
  }
  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
  return razorpayClient
}

const app = express()
const PORT = process.env.PORT || 5000

app.disable('x-powered-by')
app.set('trust proxy', 1)

// A small in-process guardrail for abuse-prone routes. Production should also
// enforce distributed limits at Cloudflare/AWS WAF, but keeping a local limit
// protects a single task when the edge layer is bypassed.
const rateBuckets = new Map()
function rateLimit({ windowMs = 60_000, max = 120, key = (req) => req.ip } = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const bucketKey = `${key(req)}:${req.method}`
    const current = rateBuckets.get(bucketKey)
    if (!current || now - current.startedAt >= windowMs) {
      rateBuckets.set(bucketKey, { startedAt: now, count: 1 })
      return next()
    }
    current.count += 1
    if (current.count > max) {
      res.set('Retry-After', String(Math.ceil((windowMs - (now - current.startedAt)) / 1000)))
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }
    return next()
  }
}

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
  })
  next()
})

/*
 * CORS configuration
 *
 * CORS_ORIGINS  — comma-separated exact origins allowed in production.
 *   e.g. CORS_ORIGINS=https://fleetmobilities.in,https://www.fleetmobilities.in,https://fleetmobilities.info,https://www.fleetmobilities.info
 *
 * CORS_PATTERN  — optional JS regex string to allow dynamic origins (no delimiters, no flags).
 */
const defaultOrigins = [
  'http://localhost:5173',
  'https://fleetmobilities.in',
  'https://www.fleetmobilities.in',
  'https://admin.fleetmobilities.in',
  'https://vendor.fleetmobilities.in',
  'https://fleetmobilities.info',
  'https://www.fleetmobilities.info',
  'https://admin.fleetmobilities.info',
].join(',')

const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsPattern = process.env.CORS_PATTERN
  ? new RegExp(`^${process.env.CORS_PATTERN}$`)
  : null

const isDevMode = process.env.NODE_ENV !== 'production'

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server, curl, Postman, etc.
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    if (corsPattern && corsPattern.test(origin)) return callback(null, true)
    // In development, allow any localhost / 127.0.0.1 origin automatically
    if (isDevMode && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true)
    }
    console.warn(`[CORS] Blocked origin: ${origin}`)
    return callback(new Error('Origin not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}))

app.use(express.json({ limit: '1mb', strict: true }))
app.use('/api', rateLimit({ max: 180 }))

// ── Static file serving (Azure App Service / Node host) ─────────────────────
// Serve the built React app from dist/ so a single Node service handles both
// the API and the customer/vendor SPAs on fleetmobilities.in & .info.
const distPath = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    index: false,           // we handle / via the SPA fallback below
  }))
}

let firebaseInitError = null
let firebaseMode = 'not_configured'

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
          'base64',
        ).toString('utf8'),
      )

      initializeApp({
        credential: cert(serviceAccount),
      })

      firebaseMode = 'service_account_base64'
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credentialsPath = path.resolve(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      )

      if (!fs.existsSync(credentialsPath)) {
        throw new Error(
          `GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${credentialsPath}`,
        )
      }

      initializeApp({
        credential: applicationDefault(),
      })

      firebaseMode = 'application_default'
    } else if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      })

      firebaseMode = 'project_id_only'
    } else {
      throw new Error('Firebase Admin credentials are not configured')
    }
  } catch (error) {
    firebaseInitError = error
    console.warn(`[Firebase Admin] ${error.message}`)
    console.warn(
      '[Firebase Admin] Firebase-backed API routes will return 503 until credentials are configured.',
    )
  }
}
const db = getApps().length ? getFirestore() : null

function requireFirebase(req, res, next) {
  if (db && getApps().length) return next()

  return res.status(503).json({
    error: 'The backend is not ready to access Firebase',
  })
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  return getAuth().verifyIdToken(token)
    .then((decoded) => {
      req.user = decoded
      return next()
    })
    .catch(() => res.status(401).json({ error: 'Invalid authentication token' }))
}

function getBookingWindow(details) {
  const pickupDate = details.pickupDate
  const dropoffDate = details.dropoffDate
  const pickupTime = details.pickupTime || '10:00'
  const dropoffTime = details.dropoffTime || '10:00'
  const start = new Date(`${pickupDate}T${pickupTime}:00+05:30`)
  const end = new Date(`${dropoffDate}T${dropoffTime}:00+05:30`)

  if (!pickupDate || !dropoffDate || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Valid pickup and dropoff dates are required')
  }

  if (end <= start) {
    throw new Error('Dropoff must be after pickup')
  }

  return { start, end, pickupTime, dropoffTime }
}

async function priceBooking(details) {
  const vehicleId = details.vehicleId
  if (!vehicleId) throw new Error('Vehicle is required')

  const vehicleRef = db.collection('vehicles').doc(vehicleId)
  const vehicleSnap = await vehicleRef.get()
  if (!vehicleSnap.exists) throw new Error('Vehicle not found')

  const vehicle = { id: vehicleSnap.id, ...vehicleSnap.data() }
  if (vehicle.status !== 'active' || vehicle.available === false) {
    throw new Error('Vehicle is not available')
  }

  const { start, end, pickupTime, dropoffTime } = getBookingWindow(details)
  const rentalType = ['hourly', 'daily', 'monthly'].includes(details.rentalType)
    ? details.rentalType
    : 'daily'
  const hours = Math.max(2, Math.ceil((end - start) / (1000 * 60 * 60)))
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
  const pricePerHour = Number(vehicle.pricePerHour || Math.round(Number(vehicle.dailyPrice || 0) / 8))
  const pricePerDay = Number(vehicle.dailyPrice || 0)
  const pricePerMonth = Number(vehicle.pricePerMonth || pricePerDay * 22)

  let rentalCharge = pricePerDay * days
  if (rentalType === 'hourly') rentalCharge = pricePerHour * hours
  if (rentalType === 'monthly') rentalCharge = pricePerMonth

  const insurance = details.addons?.insurance ? 1500 : 0
  const subtotal = rentalCharge + insurance
  let couponSavings = 0
  let couponCode = null

  if (details.couponCode) {
    const code = String(details.couponCode).trim().toUpperCase()
    const couponSnap = await db.collection('coupons').doc(code).get()
    if (couponSnap.exists) {
      const coupon = couponSnap.data()
      if (coupon.active && subtotal >= Number(coupon.minAmount || 0)) {
        couponCode = code
        couponSavings = coupon.type === 'percent'
          ? Math.round(subtotal * Number(coupon.discount || 0) / 100)
          : Number(coupon.discount || 0)
      }
    }
  }

  const afterCoupon = Math.max(0, subtotal - couponSavings)
  const gst = Math.round(afterCoupon * 0.18)
  const total = afterCoupon + gst

  return {
    vehicle,
    pricing: {
      dailyRate: pricePerDay,
      hourlyRate: pricePerHour,
      monthlyRate: pricePerMonth,
      rentalCharge,
      insurance,
      couponCode,
      couponSavings,
      gst,
      total,
      subtotal,
      securityDeposit: Number(vehicle.securityDeposit || 5000),
      days,
      hours,
    },
    normalized: {
      pickupTime,
      dropoffTime,
      rentalType,
      pickupDate: details.pickupDate,
      dropoffDate: details.dropoffDate,
    },
  }
}

async function getUserDoc(uid) {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? { id: snap.id, ...snap.data() } : null
}

async function resolveBooking(bookingId) {
  let bookingRef = db.collection('bookings').doc(bookingId)
  let bookingSnap = await bookingRef.get()
  if (!bookingSnap.exists) {
    const byPublicId = await db.collection('bookings').where('bookingId', '==', bookingId).limit(1).get()
    if (byPublicId.empty) return null
    bookingSnap = byPublicId.docs[0]
    bookingRef = bookingSnap.ref
  }
  return { bookingRef, booking: { id: bookingSnap.id, ...bookingSnap.data() } }
}

// Send an FCM push to all of a user's registered devices. Prunes dead tokens.
async function sendPushToUser(uid, { title, body, actionUrl = '' }) {
  try {
    const userDoc = await getUserDoc(uid)
    const tokens = Array.isArray(userDoc?.fcmTokens) ? userDoc.fcmTokens.filter(Boolean) : []
    if (tokens.length === 0) return

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { actionUrl: String(actionUrl || '') },
      webpush: { fcmOptions: { link: actionUrl || '/' } },
    })

    // Remove tokens that are no longer valid so the list doesn't grow stale.
    const stale = []
    response.responses.forEach((r, i) => {
      const code = r.error?.code
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        stale.push(tokens[i])
      }
    })
    if (stale.length > 0) {
      await db.collection('users').doc(uid).update({
        fcmTokens: FieldValue.arrayRemove(...stale),
      })
    }
  } catch (error) {
    console.error('sendPushToUser failed:', error.message)
  }
}

async function isAdminUser(uid) {
  const userDoc = await getUserDoc(uid)
  return userDoc?.role === 'admin'
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: 'Authentication required' })
    const allowed = req.user.admin === true || (await isAdminUser(req.user.uid))
    if (!allowed) return res.status(403).json({ error: 'Admin access required' })
    return next()
  } catch (error) {
    console.error('Admin verification error:', error)
    return res.status(500).json({ error: 'Unable to verify admin privileges' })
  }
}

function hashAdminPassword(plainPassword, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(plainPassword), salt, 64).toString('hex')
  return { salt, hash }
}

function verifyAdminPassword(plainPassword, record) {
  if (!record || record.active === false) return { valid: false, needsUpgrade: false }
  const input = String(plainPassword || '')
  if (!input) return { valid: false, needsUpgrade: false }

  if (record.passwordHash && record.passwordSalt) {
    const derived = crypto.scryptSync(input, String(record.passwordSalt), 64)
    const stored = Buffer.from(String(record.passwordHash), 'hex')
    if (derived.length !== stored.length) return { valid: false, needsUpgrade: false }
    return { valid: crypto.timingSafeEqual(derived, stored), needsUpgrade: false }
  }

  if (typeof record.password === 'string' && record.password.length > 0) {
    const a = Buffer.from(input, 'utf8')
    const b = Buffer.from(record.password, 'utf8')
    if (a.length !== b.length) return { valid: false, needsUpgrade: false }
    const valid = crypto.timingSafeEqual(a, b)
    return { valid, needsUpgrade: valid }
  }

  return { valid: false, needsUpgrade: false }
}

async function requireBookingAccess(bookingId, uid, { owner = false, renter = false, admin: allowAdmin = true } = {}) {
  const resolved = await resolveBooking(bookingId)
  if (!resolved) throw new Error('Booking not found')
  const { bookingRef, booking } = resolved
  const adminAccess = allowAdmin && await isAdminUser(uid)
  const ownerAccess = owner && booking.ownerId === uid
  const renterAccess = renter && booking.renterId === uid
  if (!adminAccess && !ownerAccess && !renterAccess) {
    const error = new Error('You are not allowed to update this booking')
    error.status = 403
    throw error
  }
  return { bookingRef, booking }
}

function generateOTP() {
  return crypto.randomInt(1000, 10000).toString()
}

function bookingError(res, error, fallback) {
  return res.status(error.status || 400).json({ error: error.message || fallback })
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: db ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    firebase: db ? firebaseMode : 'failed',
  })
})

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next()
  return requireFirebase(req, res, next)
})

// Issue short-lived Cloudinary upload signatures. The API secret never leaves
// the backend and the requested folder is derived from the authenticated UID.
app.post('/api/uploads/sign', requireAuth, (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ error: 'Secure uploads are not configured' })
  }

  const purpose = String(req.body?.purpose || '').trim()
  const allowedPurposes = ['kyc', 'vehicles', 'profilePhotos']
  if (!allowedPurposes.includes(purpose)) {
    return res.status(400).json({ error: 'Invalid upload purpose' })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = `${purpose}/${req.user.uid}`
  const allowedFormats = 'jpg,jpeg,png,webp'
  const signature = crypto
    .createHash('sha1')
    .update(`allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  return res.json({ cloudName, apiKey, folder, timestamp, signature, allowedFormats })
})

app.post('/api/bookings/create', requireAuth, async (req, res) => {
  try {
    const bookingDetails = req.body.bookingDetails || req.body
    const priced = await priceBooking(bookingDetails || {})

    const bid = `FLT-${Date.now().toString().slice(-6)}`
    const bookingRef = db.collection('bookings').doc()

    await db.runTransaction(async (transaction) => {
      const vehicleRef = db.collection('vehicles').doc(priced.vehicle.id)
      const vehicleSnap = await transaction.get(vehicleRef)
      if (!vehicleSnap.exists || vehicleSnap.data().available === false || vehicleSnap.data().status !== 'active') {
        throw new Error('Vehicle is no longer available')
      }

      transaction.set(bookingRef, {
        renterId: req.user.uid,
        renterName: bookingDetails?.renterName || req.user.name || '',
        renterEmail: bookingDetails?.renterEmail || req.user.email || '',
        vehicleId: priced.vehicle.id,
        vehicleName: priced.vehicle.name,
        vehicleImage: priced.vehicle.imageUrl || priced.vehicle.images?.[0] || '',
        ownerId: priced.vehicle.ownerId || '',
        pickupDate: priced.normalized.pickupDate,
        dropoffDate: priced.normalized.dropoffDate,
        pickupTime: priced.normalized.pickupTime,
        dropoffTime: priced.normalized.dropoffTime,
        pickupLocation: bookingDetails?.pickupLocation || priced.vehicle.location || '',
        rentalType: priced.normalized.rentalType,
        totalDays: priced.pricing.days,
        totalHours: priced.pricing.hours,
        pricing: priced.pricing,
        addons: bookingDetails?.addons || {},
        city: priced.vehicle.city || '',
        paymentMethod: bookingDetails?.paymentMethod || 'pay_on_pickup',
        bookingId: bid,
        paymentStatus: 'pay_on_pickup',
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.update(vehicleRef, { available: false })
    })

    if (priced.vehicle.ownerId && priced.vehicle.ownerId !== req.user.uid) {
      try {
        await db.collection('notifications').add({
          userId: priced.vehicle.ownerId,
          type: 'new_booking_request',
          title: 'New booking request',
          body: `${bookingDetails?.renterName || req.user.name || 'A renter'} wants to book your ${priced.vehicle.name}.`,
          actionUrl: '/vendor/dashboard',
          read: false,
          createdBy: 'system',
          createdAt: FieldValue.serverTimestamp(),
        })
        sendPushToUser(priced.vehicle.ownerId, {
          title: 'New booking request',
          body: `${bookingDetails?.renterName || req.user.name || 'A renter'} wants to book your ${priced.vehicle.name}.`,
          actionUrl: '/vendor/dashboard',
        })
      } catch (notificationError) {
        console.error('Booking notification failed:', notificationError.message)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking confirmed',
      bookingId: bid,
      id: bookingRef.id,
      pricing: priced.pricing,
    })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to create booking' })
  }
})

app.post('/api/bookings/:id/approve', requireAuth, async (req, res) => {
  try {
    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { owner: true })
    if (booking.status !== 'pending') throw new Error('Only pending bookings can be approved')
    const startOTP = generateOTP()
    const dropoffPIN = generateOTP()

    await db.runTransaction(async (transaction) => {
      const vehicleRef = db.collection('vehicles').doc(booking.vehicleId)
      transaction.update(bookingRef, {
        status: 'approved',
        startOTP,
        dropoffPIN,
        otpExpiry: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.update(vehicleRef, { available: false })
    })

    res.status(200).json({ success: true, startOTP, dropoffPIN })
  } catch (error) {
    bookingError(res, error, 'Unable to approve booking')
  }
})

// Vendor fetches the renter's KYC for a booking they own — used on the handover
// screen to verify identity before handing over the vehicle. Authorization is
// enforced by requireBookingAccess({ owner: true }): only the vehicle owner
// (or an admin) can read it, so the renter's documents are never exposed broadly.
app.get('/api/bookings/:id/renter-kyc', requireAuth, async (req, res) => {
  try {
    const { booking } = await requireBookingAccess(req.params.id, req.user.uid, { owner: true })
    const snap = await db.collection('users').doc(booking.renterId).get()
    const u = snap.exists ? snap.data() : {}
    res.status(200).json({
      renterId: booking.renterId,
      name: u.name || booking.renterName || '',
      phone: u.phone || '',
      email: u.email || booking.renterEmail || '',
      kycStatus: u.kycStatus || 'not_submitted',
      isVerified: !!u.isVerified,
      verifiedBadge: !!u.verifiedBadge,
      aadhaarUrl: u.aadhaarUrl || '',
      dlUrl: u.dlUrl || '',
      selfieUrl: u.selfieUrl || '',
    })
  } catch (error) {
    bookingError(res, error, 'Unable to fetch renter KYC')
  }
})

app.post('/api/bookings/:id/reject', requireAuth, async (req, res) => {
  try {
    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { owner: true })
    if (!['pending', 'approved'].includes(booking.status)) throw new Error('This booking cannot be rejected')

    await db.runTransaction(async (transaction) => {
      const vehicleRef = db.collection('vehicles').doc(booking.vehicleId)
      transaction.update(bookingRef, {
        status: 'cancelled',
        paymentStatus: 'refund_pending',
        cancelledBy: req.user.uid,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.update(vehicleRef, { available: true })
    })

    res.status(200).json({ success: true })
  } catch (error) {
    bookingError(res, error, 'Unable to reject booking')
  }
})

app.post('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason) throw new Error('Cancellation reason is required')
    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { renter: true, owner: true })
    if (['completed', 'cancelled'].includes(booking.status)) throw new Error('This booking cannot be cancelled')

    // Refunds and fees are business rules, not client input. Until the refund
    // policy is wired to Razorpay refunds, record the paid amount for review.
    const refundAmount = Math.max(0, Number(booking.amountPaid || 0))
    const cancellationFee = 0

    await db.runTransaction(async (transaction) => {
      const vehicleRef = db.collection('vehicles').doc(booking.vehicleId)
      transaction.update(bookingRef, {
        status: 'cancelled',
        paymentStatus: Number(refundAmount) > 0 ? 'refund_pending' : booking.paymentStatus,
        cancelledBy: req.user.uid,
        cancelledAt: FieldValue.serverTimestamp(),
        cancellationReason: reason,
        cancellationFee: Math.max(0, Number(cancellationFee) || 0),
        refundAmount: Math.max(0, Number(refundAmount) || 0),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.update(vehicleRef, { available: true })
    })

    res.status(200).json({ success: true })
  } catch (error) {
    bookingError(res, error, 'Unable to cancel booking')
  }
})

app.post('/api/bookings/:id/start', requireAuth, async (req, res) => {
  try {
    const { otp } = req.body
    if (!/^\d{4}$/.test(String(otp || ''))) throw new Error('A valid 4-digit OTP is required')
    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { renter: true })
    if (booking.status !== 'approved') throw new Error('Only approved bookings can be started')
    if (!booking.startOTP) throw new Error('No OTP is set for this booking')

    const expiry = booking.otpExpiry?.toDate ? booking.otpExpiry.toDate() : null
    if (expiry && expiry < new Date()) throw new Error('OTP expired. Ask the owner to regenerate it.')
    if (booking.startOTP !== String(otp)) throw new Error('Incorrect code. Please check with the owner.')

    await bookingRef.update({
      status: 'active',
      rideStartedAt: FieldValue.serverTimestamp(),
      startOTP: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.status(200).json({ success: true })
  } catch (error) {
    bookingError(res, error, 'Unable to start ride')
  }
})

app.post('/api/bookings/:id/complete', requireAuth, async (req, res) => {
  try {
    const { pin } = req.body
    if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('A valid 4-digit PIN is required')
    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { renter: true })
    if (booking.status !== 'active') throw new Error('Only active rides can be completed')
    if (!booking.dropoffPIN) throw new Error('No drop-off PIN is set for this booking')
    if (booking.dropoffPIN !== String(pin)) throw new Error('Incorrect PIN. Please check with the owner.')

    await db.runTransaction(async (transaction) => {
      const vehicleRef = db.collection('vehicles').doc(booking.vehicleId)
      const userRef = db.collection('users').doc(req.user.uid)
      const updates = {
        status: 'completed',
        rideEndedAt: FieldValue.serverTimestamp(),
        dropoffPIN: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      }
      transaction.update(bookingRef, updates)
      transaction.update(vehicleRef, { available: true })

      if (booking.rentalType === 'hourly' && booking.rideStartedAt) {
        const startTime = booking.rideStartedAt?.toDate ? booking.rideStartedAt.toDate() : new Date(booking.rideStartedAt)
        const hoursUsed = Math.max(1, Math.ceil((Date.now() - startTime.getTime()) / (1000 * 60 * 60)))
        transaction.update(userRef, {
          tokens: FieldValue.increment(-hoursUsed),
          tokensUsed: FieldValue.increment(hoursUsed),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    })

    res.status(200).json({ success: true })
  } catch (error) {
    bookingError(res, error, 'Unable to complete ride')
  }
})

app.post('/api/bookings/:id/review', requireAuth, async (req, res) => {
  try {
    const { rating, subRatings = {}, tags = [], comment = '' } = req.body
    const r = Number(rating)
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new Error('A rating between 1 and 5 is required')

    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { renter: true })
    if (booking.status !== 'completed') throw new Error('Only completed rides can be reviewed')
    if (booking.reviewed) throw new Error('You have already reviewed this ride')

    const reviewRef = db.collection('reviews').doc()

    await db.runTransaction(async (transaction) => {
      const vehicleRef = booking.vehicleId ? db.collection('vehicles').doc(booking.vehicleId) : null
      const vehicleSnap = vehicleRef ? await transaction.get(vehicleRef) : null

      transaction.set(reviewRef, {
        vehicleId: booking.vehicleId || '',
        bookingId: bookingRef.id,
        renterId: req.user.uid,
        renterName: booking.renterName || req.user.name || 'Anonymous',
        ownerId: booking.ownerId || '',
        rating: r,
        renterRating: r,
        subRatings: {
          cleanliness: Number(subRatings.cleanliness) || 0,
          condition: Number(subRatings.condition) || 0,
          responsiveness: Number(subRatings.responsiveness) || 0,
        },
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
        comment: String(comment).slice(0, 1000),
        createdAt: FieldValue.serverTimestamp(),
      })

      // Recompute the vehicle's running average so displayed stars actually change
      if (vehicleRef && vehicleSnap?.exists) {
        const data = vehicleSnap.data()
        const newCount = (data.reviewCount || 0) + 1
        const newSum = (data.ratingSum || 0) + r
        transaction.update(vehicleRef, {
          reviewCount: newCount,
          ratingSum: newSum,
          rating: Math.round((newSum / newCount) * 10) / 10,
        })
      }

      transaction.update(bookingRef, {
        renterRating: r,
        reviewed: true,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    res.status(200).json({ success: true })
  } catch (error) {
    bookingError(res, error, 'Unable to submit review')
  }
})

// Create an in-app notification AND deliver a push to the target user.
app.post('/api/notifications/send', requireAuth, async (req, res) => {
  try {
    const { userId, type, title, body, actionUrl = '', bookingId } = req.body
    if (!userId || !title) {
      return res.status(400).json({ error: 'userId and title are required' })
    }

    const safeTitle = String(title).trim().slice(0, 120)
    const safeBody = String(body || '').trim().slice(0, 500)
    const safeActionUrl = String(actionUrl || '').slice(0, 200)
    const adminSender = await isAdminUser(req.user.uid)

    if (!adminSender) {
      if (!bookingId) return res.status(403).json({ error: 'A booking is required for user notifications' })
      const resolved = await resolveBooking(bookingId)
      if (!resolved) return res.status(404).json({ error: 'Booking not found' })
      const { booking } = resolved
      const isParticipant = booking.ownerId === req.user.uid || booking.renterId === req.user.uid
      const recipientIsParticipant = userId === booking.ownerId || userId === booking.renterId
      const isDifferentUser = userId !== req.user.uid
      if (!isParticipant || !recipientIsParticipant || !isDifferentUser) {
        return res.status(403).json({ error: 'You cannot notify this user' })
      }
    }

    await db.collection('notifications').add({
      userId,
      type: String(type || 'general').slice(0, 50),
      title: safeTitle,
      body: safeBody,
      actionUrl: safeActionUrl,
      read: false,
      createdBy: req.user.uid,
      createdAt: FieldValue.serverTimestamp(),
    })

    // Fire-and-forget push; never let a push failure fail the request.
    sendPushToUser(userId, { title: safeTitle, body: safeBody, actionUrl: safeActionUrl })

    res.status(200).json({ success: true })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to send notification' })
  }
})

app.post('/api/bookings/:id/regenerate-code', requireAuth, async (req, res) => {
  try {
    const { type } = req.body
    if (!['start', 'dropoff'].includes(type)) throw new Error('Code type must be start or dropoff')
    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { owner: true })
    const newCode = generateOTP()
    const update = type === 'dropoff'
      ? { dropoffPIN: newCode }
      : {
        startOTP: newCode,
        otpExpiry: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      }

    if (type === 'start' && booking.status !== 'approved') throw new Error('Start OTP can only be regenerated for approved bookings')
    if (type === 'dropoff' && booking.status !== 'active') throw new Error('Drop-off PIN can only be regenerated for active bookings')

    await bookingRef.update({
      ...update,
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.status(200).json({ success: true, code: newCode })
  } catch (error) {
    bookingError(res, error, 'Unable to regenerate code')
  }
})

// ── Public Site Config (for CMS-editable content on customer/vendor sites) ───
app.get('/api/public/site-config', async (req, res) => {
  try {
    const [settingsSnap, contentSnap] = await Promise.all([
      db.collection('settings').doc('platform').get(),
      db.collection('siteContent').doc('homepage').get(),
    ])
    const settings = settingsSnap.exists ? settingsSnap.data() : {}
    const content = contentSnap.exists ? contentSnap.data() : {}
    return res.json({
      supportEmail: settings.supportEmail || 'help@fleet.in',
      supportPhone: settings.supportPhone || '+91 98765 43210',
      gstRate: settings.gstRate ?? 0.18,
      platformFee: settings.platformFee ?? 99,
      announcementEnabled: Boolean(content.announcementEnabled),
      announcementText: content.announcementText || '',
      heroTitle: content.heroTitle || '',
      heroSubtitle: content.heroSubtitle || '',
      footerTagline: content.footerTagline || 'Redefining exploration in the Himalayas through autonomous, premium rentals.',
      cities: Array.isArray(content.cities) && content.cities.length > 0
        ? content.cities
        : ['Dehradun', 'Mussoorie', 'Rishikesh'],
    })
  } catch (error) {
    console.error('Read public site config error:', error)
    return res.status(500).json({ error: 'Unable to load site configuration' })
  }
})

// ── Payment Settings ────────────────────────────────────────────────────────
app.get('/api/admin/payment-settings', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('settings').doc('platform').get()
    const settings = snap.exists ? snap.data() : {}
    res.json({
      tokenAmountType: settings.tokenAmountType || 'fixed',
      tokenFixedAmount: settings.tokenFixedAmount ?? 500,
      tokenPercentage: settings.tokenPercentage ?? 20,
      platformCommissionPercent: settings.platformCommissionPercent ?? 15,
      gstRate: settings.gstRate ?? 0.18,
      platformFee: settings.platformFee ?? 99,
      supportEmail: settings.supportEmail || 'help@fleet.in',
      supportPhone: settings.supportPhone || '+91 98765 43210',
    })
  } catch (error) {
    console.error('Read payment settings error:', error)
    res.status(500).json({ error: 'Unable to read payment settings' })
  }
})

app.put('/api/admin/payment-settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      tokenAmountType,
      tokenFixedAmount,
      tokenPercentage,
      platformCommissionPercent,
      gstRate,
      platformFee,
      supportEmail,
      supportPhone,
    } = req.body
    const parsedCommission = Number(platformCommissionPercent)
    const commission = Number.isFinite(parsedCommission)
      ? Math.min(100, Math.max(0, parsedCommission))
      : 15
    const parsedGst = Number(gstRate)
    const safeGst = Number.isFinite(parsedGst) ? Math.min(1, Math.max(0, parsedGst)) : 0.18

    await db.collection('settings').doc('platform').set({
      tokenAmountType: tokenAmountType === 'percentage' ? 'percentage' : 'fixed',
      tokenFixedAmount: Number(tokenFixedAmount ?? 500),
      tokenPercentage: Number(tokenPercentage ?? 20),
      platformCommissionPercent: commission,
      gstRate: safeGst,
      platformFee: Number(platformFee ?? 99),
      supportEmail: String(supportEmail || 'help@fleet.in').trim(),
      supportPhone: String(supportPhone || '+91 98765 43210').trim(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    res.json({ success: true })
  } catch (error) {
    console.error('Write payment settings error:', error)
    res.status(500).json({ error: 'Unable to update payment settings' })
  }
})

// ── Razorpay Payment Endpoints ──────────────────────────────────────────────
app.post('/api/payments/create-order', requireAuth, async (req, res) => {
  try {
    const { bookingId, paymentType } = req.body
    if (!bookingId || !['token', 'full', 'remaining'].includes(paymentType)) {
      return res.status(400).json({ error: 'bookingId and valid paymentType are required' })
    }

    // Only the renter who owns the booking may create a payment order.
    const { bookingRef, booking } = await requireBookingAccess(
      bookingId,
      req.user.uid,
      { renter: true, admin: false },
    )
    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(400).json({ error: 'This booking cannot be paid' })
    }

    const existingOrder = booking.razorpayOrders?.[paymentType]
    if (existingOrder?.orderId && Number(existingOrder.amount) > 0) {
      return res.json({
        success: true,
        orderId: existingOrder.orderId,
        amount: Number(existingOrder.amount),
        amountInPaise: Number(existingOrder.amount) * 100,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingId: booking.id,
        bookingPublicId: booking.bookingId,
        paymentType,
      })
    }

    const settingsSnap = await db.collection('settings').doc('platform').get()
    const settings = settingsSnap.exists ? settingsSnap.data() : {}
    const totalAmount = Number(booking.pricing?.total || 0)
    const amountPaid = Number(booking.amountPaid || 0)
    let orderAmount = totalAmount - amountPaid

    if (paymentType === 'token') {
      if (booking.tokenPaymentId) return res.status(400).json({ error: 'Token payment already received' })
      orderAmount = settings.tokenAmountType === 'percentage'
        ? Math.round(totalAmount * Number(settings.tokenPercentage || 20) / 100)
        : Number(settings.tokenFixedAmount || 500)
      orderAmount = Math.min(orderAmount, totalAmount - amountPaid)
    }

    if (orderAmount <= 0) {
      return res.status(400).json({ error: 'No amount due or already fully paid' })
    }

    const order = await getRazorpay().orders.create({
      amount: Math.round(orderAmount * 100),
      currency: 'INR',
      receipt: `${booking.bookingId || booking.id}_${paymentType}`.slice(0, 40),
      notes: {
        bookingId: booking.id,
        bookingPublicId: booking.bookingId || '',
        paymentType,
        renterId: req.user.uid,
      },
    })

    await bookingRef.update({
      [`razorpayOrders.${paymentType}`]: {
        orderId: order.id,
        amount: orderAmount,
        createdAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return res.json({
      success: true,
      orderId: order.id,
      amount: orderAmount,
      amountInPaise: Math.round(orderAmount * 100),
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId: booking.id,
      bookingPublicId: booking.bookingId,
      paymentType,
    })
  } catch (error) {
    console.error('Create order error:', error)
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to create payment order' })
  }
})

app.post('/api/payments/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, paymentType } = req.body

    if (!bookingId || !['token', 'full', 'remaining'].includes(paymentType) || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' })
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8')
    const receivedSignatureBuffer = Buffer.from(String(razorpay_signature), 'utf8')
    if (expectedSignatureBuffer.length !== receivedSignatureBuffer.length
      || !crypto.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer)) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' })
    }

    // Fetch booking
    let bookingRef = db.collection('bookings').doc(bookingId)
    let bookingSnap = await bookingRef.get()
    if (!bookingSnap.exists) {
      const byPublicId = await db.collection('bookings').where('bookingId', '==', bookingId).limit(1).get()
      if (byPublicId.empty) return res.status(404).json({ error: 'Booking not found' })
      bookingRef = byPublicId.docs[0].ref
      bookingSnap = byPublicId.docs[0]
    }
    const booking = { id: bookingSnap.id, ...bookingSnap.data() }

    // The booking ID and a valid Razorpay signature are not sufficient: the
    // caller must be the renter who owns this booking and the order must have
    // been created for this exact payment type.
    const authorized = await requireBookingAccess(booking.id, req.user.uid, { renter: true, admin: false })
    const orderRecord = authorized.booking.razorpayOrders?.[paymentType]
    if (!orderRecord || orderRecord.orderId !== razorpay_order_id) {
      return res.status(403).json({ error: 'Payment order does not match this booking' })
    }

    if (booking.payments?.[razorpay_payment_id]) {
      const existingPayment = booking.payments[razorpay_payment_id]
      return res.json({
        success: true,
        paymentStatus: booking.paymentStatus || 'token_paid',
        amountPaid: booking.amountPaid || existingPayment.amount || 0,
        remainingAmount: booking.remainingAmount || 0,
        splitResult: booking.splitDetails || null,
      })
    }

    // Fetch payment details from Razorpay
    const payment = await getRazorpay().payments.fetch(razorpay_payment_id)
    if (payment.status !== 'captured' || payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ error: 'Payment is not captured for this order' })
    }
    const paidAmount = Number(payment.amount || 0) / 100
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount !== Number(orderRecord.amount)) {
      return res.status(400).json({ error: 'Payment amount does not match the order' })
    }

    // Re-read and record the payment in a transaction. This closes the race
    // where two verify requests for the same Razorpay payment arrive together.
    let paymentResult
    await db.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(bookingRef)
      if (!freshSnap.exists) {
        const notFound = new Error('Booking not found')
        notFound.status = 404
        throw notFound
      }
      const freshBooking = { id: freshSnap.id, ...freshSnap.data() }
      if (freshBooking.payments?.[razorpay_payment_id]) {
        paymentResult = {
          alreadyRecorded: true,
          booking: freshBooking,
          newTotalPaid: Number(freshBooking.amountPaid || 0),
          totalDue: Number(freshBooking.pricing?.total || 0),
        }
        return
      }

      const freshOrder = freshBooking.razorpayOrders?.[paymentType]
      if (!freshOrder || freshOrder.orderId !== razorpay_order_id) {
        const mismatch = new Error('Payment order does not match this booking')
        mismatch.status = 403
        throw mismatch
      }

      const previouslyPaid = Number(freshBooking.amountPaid || 0)
      const totalDue = Number(freshBooking.pricing?.total || 0)
      const newTotalPaid = previouslyPaid + paidAmount
      const isFullyPaid = newTotalPaid >= totalDue
      const updateData = {
        amountPaid: newTotalPaid,
        remainingAmount: Math.max(0, totalDue - newTotalPaid),
        paymentStatus: isFullyPaid ? 'paid' : 'token_paid',
        [`payments.${razorpay_payment_id}`]: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          amount: paidAmount,
          type: paymentType || (isFullyPaid ? 'full' : 'token'),
          status: 'captured',
          paidAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      }

      if (paymentType === 'token' && !freshBooking.tokenPaymentId) {
        updateData.tokenAmount = paidAmount
        updateData.tokenPaymentId = razorpay_payment_id
      }

      transaction.update(bookingRef, updateData)
      paymentResult = { alreadyRecorded: false, booking: freshBooking, newTotalPaid, totalDue }
    })

    if (paymentResult.alreadyRecorded) {
      return res.json({
        success: true,
        paymentStatus: paymentResult.booking.paymentStatus || 'token_paid',
        amountPaid: paymentResult.newTotalPaid,
        remainingAmount: paymentResult.booking.remainingAmount || 0,
        splitResult: paymentResult.booking.splitDetails || null,
      })
    }

    const { booking: freshBooking, newTotalPaid, totalDue } = paymentResult
    const isFullyPaid = newTotalPaid >= totalDue

    // If fully paid, trigger payment split
    let splitResult = null
    if (isFullyPaid) {
      splitResult = await splitPayment(freshBooking.id || bookingSnap.id, razorpay_payment_id, totalDue, freshBooking.ownerId)
    }

    // Notify vendor
    const notifTitle = isFullyPaid ? 'Full Payment Received 💰' : 'Token Payment Received 💰'
    const notifBody = isFullyPaid
      ? `₹${totalDue.toLocaleString('en-IN')} received for ${booking.vehicleName}. Payout will be settled shortly.`
      : `Token of ₹${paidAmount.toLocaleString('en-IN')} received for ${booking.vehicleName}. ₹${(totalDue - newTotalPaid).toLocaleString('en-IN')} remaining.`

    if (freshBooking.ownerId) {
      await db.collection('notifications').add({
        userId: freshBooking.ownerId,
        type: 'payment_received',
        title: notifTitle,
        body: notifBody,
        actionUrl: '/vendor/dashboard',
        read: false,
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
      })
      sendPushToUser(freshBooking.ownerId, { title: notifTitle, body: notifBody, actionUrl: '/vendor/dashboard' })
    }

    res.json({
      success: true,
      paymentStatus: isFullyPaid ? 'paid' : 'token_paid',
      amountPaid: newTotalPaid,
      remainingAmount: Math.max(0, totalDue - newTotalPaid),
      splitResult,
    })
  } catch (error) {
    console.error('Payment verify error:', error)
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Payment verification failed' })
  }
})

// Internal: Split payment between platform and vendor (supports vendor-by-vendor split override)
async function splitPayment(bookingId, paymentId, totalAmount, ownerId) {
  try {
    const bookingRef = db.collection('bookings').doc(bookingId)
    const existingBookingSnap = await bookingRef.get()
    const existingSplit = existingBookingSnap.data()?.splitDetails
    if (existingSplit?.paymentId === paymentId) return existingSplit

    const [settingsSnap, vendorSnap] = await Promise.all([
      db.collection('settings').doc('platform').get(),
      ownerId ? db.collection('users').doc(ownerId).get() : Promise.resolve({ exists: false }),
    ])
    const settings = settingsSnap.exists ? settingsSnap.data() : {}
    const vendor = vendorSnap.exists ? vendorSnap.data() : {}

    const rawOverride = vendor.commissionPercent
    const hasVendorOverride = rawOverride !== undefined && rawOverride !== null && rawOverride !== '' && Number.isFinite(Number(rawOverride))
    const commissionPercent = hasVendorOverride
      ? Math.min(100, Math.max(0, Number(rawOverride)))
      : Math.min(100, Math.max(0, Number(settings.platformCommissionPercent ?? 15)))

    const platformCut = Math.round(totalAmount * commissionPercent / 100)
    const vendorCut = totalAmount - platformCut
    const linkedAccountId = vendor.razorpayAccountId

    let transferId = null
    let transferStatus = 'pending'

    if (linkedAccountId) {
      try {
        const transfer = await getRazorpay().payments.transfer(paymentId, {
          transfers: [{
            account: linkedAccountId,
            amount: vendorCut * 100,  // paise
            currency: 'INR',
            on_hold: false,
            notes: {
              bookingId,
              type: 'vendor_payout',
            },
          }],
        })
        transferId = transfer.items?.[0]?.id || null
        transferStatus = 'processed'
      } catch (transferErr) {
        console.error('Razorpay transfer failed:', transferErr.message)
        transferStatus = 'failed'
      }
    } else {
      transferStatus = 'no_linked_account'
    }

    // Record split details on booking
    await bookingRef.update({
      splitDetails: {
        platformCut,
        vendorCut,
        platformCommissionPercent: commissionPercent,
        splitSource: hasVendorOverride ? 'vendor_override' : 'platform_default',
        transferId,
        transferStatus,
        paymentId,
        settledAt: transferStatus === 'processed' ? FieldValue.serverTimestamp() : null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { platformCut, vendorCut, commissionPercent, transferId, transferStatus }
  } catch (error) {
    console.error('Split payment error:', error)
    return { error: error.message }
  }
}

app.get('/api/payments/booking/:id/status', requireAuth, async (req, res) => {
  try {
    const { booking } = await requireBookingAccess(req.params.id, req.user.uid, { renter: true, owner: true })
    return res.json({
      paymentStatus: booking.paymentStatus || 'pending',
      amountPaid: booking.amountPaid || 0,
      remainingAmount: booking.remainingAmount || (booking.pricing?.total || 0) - (booking.amountPaid || 0),
      totalAmount: booking.pricing?.total || 0,
      tokenAmount: booking.tokenAmount || 0,
      splitDetails: booking.splitDetails || null,
      payments: booking.payments || {},
    })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to read payment status' })
  }
})

app.delete('/api/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const vehicleRef = db.collection('vehicles').doc(req.params.id)
    const snap = await vehicleRef.get()
    if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' })

    const vehicle = snap.data()
    const isAdmin = await isAdminUser(req.user.uid)
    if (vehicle.ownerId !== req.user.uid && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this vehicle' })
    }

    const activeBookings = await db.collection('bookings')
      .where('vehicleId', '==', req.params.id)
      .where('status', 'in', ['pending', 'approved', 'active'])
      .limit(1)
      .get()
    if (!activeBookings.empty) {
      return res.status(409).json({ error: 'Cannot delete a vehicle with active or pending bookings' })
    }

    await vehicleRef.delete()
    return res.json({ success: true })
  } catch (error) {
    console.error('Delete vehicle error:', error)
    return res.status(500).json({ error: 'Unable to delete vehicle' })
  }
})

// ── Admin Portal Auth & Full CRUD Endpoints ────────────────────────────────
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 15,
  key: (req) => `admin-login:${req.ip}`,
})

app.post('/api/admin/login', adminLoginLimiter, async (req, res) => {
  try {
    const adminId = String(req.body?.adminId || '').trim()
    const password = String(req.body?.password || '')
    if (!adminId || !password || adminId.includes('/')) {
      return res.status(400).json({ error: 'Admin ID and password are required' })
    }

    const credRef = db.collection('adminCredentials').doc(adminId)
    const credSnap = await credRef.get()
    if (!credSnap.exists) {
      return res.status(401).json({ error: 'Invalid Admin ID or password' })
    }

    const credData = credSnap.data() || {}
    const { valid, needsUpgrade } = verifyAdminPassword(password, credData)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid Admin ID or password' })
    }

    // Automatically upgrade any manually-entered plaintext password to a salted scrypt hash
    if (needsUpgrade) {
      const { salt, hash } = hashAdminPassword(password)
      await credRef.update({
        passwordHash: hash,
        passwordSalt: salt,
        password: FieldValue.delete(),
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      await credRef.update({ lastLoginAt: FieldValue.serverTimestamp() })
    }

    const adminUid = `admin_${adminId}`
    const adminName = credData.name || adminId
    await db.collection('users').doc(adminUid).set({
      uid: adminUid,
      adminId,
      name: adminName,
      email: credData.email || `${adminId}@admin.fleetmobilities.in`,
      role: 'admin',
      isVerified: true,
      verifiedBadge: true,
      kycStatus: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    const customToken = await getAuth().createCustomToken(adminUid, {
      admin: true,
      role: 'admin',
      adminId,
    })

    return res.json({ success: true, customToken, adminId, name: adminName })
  } catch (error) {
    console.error('Admin login error:', error)
    return res.status(500).json({ error: 'Admin authentication failed' })
  }
})

// Vendor-by-vendor rental split & partner config
app.put('/api/admin/vendors/:uid/split', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params
    const { commissionPercent, razorpayAccountId, role } = req.body
    const updates = { updatedAt: FieldValue.serverTimestamp() }

    if (commissionPercent === null || commissionPercent === '') {
      updates.commissionPercent = FieldValue.delete()
    } else if (commissionPercent !== undefined) {
      const parsed = Number(commissionPercent)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({ error: 'Commission percentage must be between 0 and 100' })
      }
      updates.commissionPercent = parsed
    }

    if (razorpayAccountId !== undefined) {
      updates.razorpayAccountId = String(razorpayAccountId || '').trim()
    }

    if (role && ['renter', 'vendor', 'owner', 'admin'].includes(role)) {
      updates.role = role
      if (role === 'vendor') {
        updates.vendorRequested = false
        updates.vendorApprovedAt = FieldValue.serverTimestamp()
      }
    }

    await db.collection('users').doc(uid).set(updates, { merge: true })
    return res.json({ success: true })
  } catch (error) {
    console.error('Update vendor split error:', error)
    return res.status(500).json({ error: 'Unable to update vendor split configuration' })
  }
})

// Admin User CRUD
app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone = '', role = 'renter', kycStatus = 'not_submitted', commissionPercent } = req.body
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' })
    const safeRole = ['renter', 'vendor', 'owner', 'admin'].includes(role) ? role : 'renter'

    let uid
    try {
      const existing = await getAuth().getUserByEmail(String(email).trim())
      uid = existing.uid
    } catch {
      const created = await getAuth().createUser({
        email: String(email).trim(),
        password: password ? String(password) : crypto.randomBytes(12).toString('hex'),
        displayName: String(name).trim(),
      })
      uid = created.uid
    }

    const userPayload = {
      uid,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone || '').trim(),
      role: safeRole,
      kycStatus,
      isVerified: kycStatus === 'approved',
      verifiedBadge: kycStatus === 'approved',
      vendorRequested: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (commissionPercent !== undefined && commissionPercent !== null && commissionPercent !== '') {
      userPayload.commissionPercent = Math.min(100, Math.max(0, Number(commissionPercent)))
    }

    await db.collection('users').doc(uid).set(userPayload, { merge: true })
    return res.status(201).json({ success: true, id: uid })
  } catch (error) {
    console.error('Admin create user error:', error)
    return res.status(400).json({ error: error.message || 'Unable to create user' })
  }
})

app.put('/api/admin/users/:uid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params
    const { name, email, phone, role, kycStatus, razorpayAccountId, commissionPercent, vendorRequested } = req.body
    const updates = { updatedAt: FieldValue.serverTimestamp() }
    if (name !== undefined) updates.name = String(name).trim()
    if (email !== undefined) updates.email = String(email).trim()
    if (phone !== undefined) updates.phone = String(phone).trim()
    if (role && ['renter', 'vendor', 'owner', 'admin'].includes(role)) updates.role = role
    if (kycStatus && ['not_submitted', 'pending', 'approved', 'rejected'].includes(kycStatus)) {
      updates.kycStatus = kycStatus
      updates.isVerified = kycStatus === 'approved'
      updates.verifiedBadge = kycStatus === 'approved'
    }
    if (razorpayAccountId !== undefined) updates.razorpayAccountId = String(razorpayAccountId || '').trim()
    if (vendorRequested !== undefined) updates.vendorRequested = Boolean(vendorRequested)
    if (commissionPercent === null || commissionPercent === '') {
      updates.commissionPercent = FieldValue.delete()
    } else if (commissionPercent !== undefined) {
      const parsed = Number(commissionPercent)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({ error: 'Commission percentage must be between 0 and 100' })
      }
      updates.commissionPercent = parsed
    }

    await db.collection('users').doc(uid).set(updates, { merge: true })
    return res.json({ success: true })
  } catch (error) {
    console.error('Admin update user error:', error)
    return res.status(500).json({ error: 'Unable to update user' })
  }
})

app.delete('/api/admin/users/:uid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params
    if (uid === req.user.uid) {
      return res.status(400).json({ error: 'You cannot delete your own active admin session' })
    }
    await db.collection('users').doc(uid).delete()
    await getAuth().deleteUser(uid).catch(() => {})
    return res.json({ success: true })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return res.status(500).json({ error: 'Unable to delete user' })
  }
})

// Admin Vehicle CRUD
app.post('/api/admin/vehicles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = req.body || {}
    if (!data.name || !data.dailyPrice) {
      return res.status(400).json({ error: 'Vehicle name and dailyPrice are required' })
    }
    const imageUrl = String(data.imageUrl || '').trim()
    const ref = await db.collection('vehicles').add({
      name: String(data.name).trim(),
      brand: String(data.brand || '').trim(),
      model: String(data.model || '').trim(),
      year: data.year ? Number(data.year) : new Date().getFullYear(),
      type: String(data.type || 'Bike').trim(),
      category: String(data.category || data.type || 'Bike').trim(),
      fuelType: String(data.fuelType || 'Petrol').trim(),
      seats: Number(data.seats || 2),
      city: String(data.city || 'Dehradun').trim(),
      regNo: String(data.regNo || '').trim().toUpperCase(),
      cc: String(data.cc || '').trim(),
      mileage: String(data.mileage || '').trim(),
      useCase: String(data.useCase || 'mixed-use').trim(),
      description: String(data.description || '').trim(),
      dailyPrice: Number(data.dailyPrice),
      weeklyPrice: Number(data.weeklyPrice || Number(data.dailyPrice) * 6),
      pricePerHour: Number(data.pricePerHour || Math.round(Number(data.dailyPrice) / 8)),
      pricePerMonth: Number(data.pricePerMonth || Number(data.dailyPrice) * 22),
      securityDeposit: Number(data.securityDeposit ?? 5000),
      imageUrl,
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (imageUrl ? [imageUrl] : []),
      ownerId: String(data.ownerId || req.user.uid).trim(),
      ownerName: String(data.ownerName || 'Fleet Partner').trim(),
      hostName: String(data.ownerName || 'Fleet Partner').trim(),
      status: ['active', 'pending', 'inactive'].includes(data.status) ? data.status : 'active',
      available: data.available !== false,
      rating: Number(data.rating || 5),
      reviewCount: Number(data.reviewCount || 0),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return res.status(201).json({ success: true, id: ref.id })
  } catch (error) {
    console.error('Admin create vehicle error:', error)
    return res.status(500).json({ error: 'Unable to create vehicle' })
  }
})

app.put('/api/admin/vehicles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = req.body || {}
    const updates = { updatedAt: FieldValue.serverTimestamp() }
    const stringFields = ['name', 'brand', 'model', 'type', 'category', 'fuelType', 'city', 'regNo', 'cc', 'mileage', 'useCase', 'description', 'imageUrl', 'ownerId', 'ownerName', 'hostName']
    for (const f of stringFields) {
      if (data[f] !== undefined) updates[f] = String(data[f]).trim()
    }
    const numberFields = ['year', 'seats', 'dailyPrice', 'weeklyPrice', 'pricePerHour', 'pricePerMonth', 'securityDeposit']
    for (const f of numberFields) {
      if (data[f] !== undefined && data[f] !== '') updates[f] = Number(data[f])
    }
    if (data.status && ['active', 'pending', 'inactive'].includes(data.status)) updates.status = data.status
    if (data.available !== undefined) updates.available = Boolean(data.available)
    if (data.imageUrl !== undefined) updates.images = data.imageUrl ? [String(data.imageUrl).trim()] : []

    await db.collection('vehicles').doc(req.params.id).update(updates)
    return res.json({ success: true })
  } catch (error) {
    console.error('Admin update vehicle error:', error)
    return res.status(500).json({ error: 'Unable to update vehicle' })
  }
})

app.delete('/api/admin/vehicles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.collection('vehicles').doc(req.params.id).delete()
    return res.json({ success: true })
  } catch (error) {
    console.error('Admin delete vehicle error:', error)
    return res.status(500).json({ error: 'Unable to delete vehicle' })
  }
})

// Admin Booking CRUD
app.post('/api/admin/bookings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = req.body || {}
    if (!data.vehicleId || !data.renterId || !data.pickupDate || !data.dropoffDate) {
      return res.status(400).json({ error: 'vehicleId, renterId, pickupDate, and dropoffDate are required' })
    }
    const [vehicleSnap, renterSnap] = await Promise.all([
      db.collection('vehicles').doc(String(data.vehicleId)).get(),
      db.collection('users').doc(String(data.renterId)).get(),
    ])
    const vehicle = vehicleSnap.exists ? vehicleSnap.data() : {}
    const renter = renterSnap.exists ? renterSnap.data() : {}
    const total = Number(data.totalAmount ?? vehicle.dailyPrice ?? 1000)
    const bookingPublicId = `FLT-${Date.now().toString(36).toUpperCase()}`

    const ref = await db.collection('bookings').add({
      bookingId: bookingPublicId,
      vehicleId: String(data.vehicleId),
      vehicleName: data.vehicleName || vehicle.name || 'Vehicle',
      vehicleImage: vehicle.imageUrl || '',
      ownerId: data.ownerId || vehicle.ownerId || req.user.uid,
      renterId: String(data.renterId),
      renterName: data.renterName || renter.name || 'Customer',
      renterEmail: data.renterEmail || renter.email || '',
      pickupDate: data.pickupDate,
      dropoffDate: data.dropoffDate,
      pickupTime: data.pickupTime || '10:00',
      dropoffTime: data.dropoffTime || '10:00',
      rentalType: data.rentalType || 'daily',
      status: ['pending', 'approved', 'active', 'completed', 'cancelled'].includes(data.status) ? data.status : 'pending',
      paymentStatus: ['pending', 'token_paid', 'paid', 'pay_on_pickup', 'refund_pending', 'refunded'].includes(data.paymentStatus) ? data.paymentStatus : 'pending',
      amountPaid: Number(data.amountPaid || 0),
      remainingAmount: Math.max(0, total - Number(data.amountPaid || 0)),
      pricing: { total, securityDeposit: Number(vehicle.securityDeposit || 5000) },
      startOTP: data.status === 'approved' ? generateOTP() : null,
      dropoffPIN: data.status === 'approved' ? generateOTP() : null,
      createdBy: req.user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return res.status(201).json({ success: true, id: ref.id, bookingId: bookingPublicId })
  } catch (error) {
    console.error('Admin create booking error:', error)
    return res.status(500).json({ error: 'Unable to create booking' })
  }
})

app.put('/api/admin/bookings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, paymentStatus, amountPaid, totalAmount, pickupDate, dropoffDate, transferStatus } = req.body || {}
    const bookingRef = db.collection('bookings').doc(req.params.id)
    const snap = await bookingRef.get()
    if (!snap.exists) return res.status(404).json({ error: 'Booking not found' })
    const existing = snap.data()

    const updates = { updatedAt: FieldValue.serverTimestamp() }
    if (status && ['pending', 'approved', 'active', 'completed', 'cancelled'].includes(status)) {
      updates.status = status
      if (status === 'approved' && !existing.startOTP) {
        updates.startOTP = generateOTP()
        updates.dropoffPIN = generateOTP()
      }
    }
    if (paymentStatus && ['pending', 'token_paid', 'paid', 'pay_on_pickup', 'refund_pending', 'refunded'].includes(paymentStatus)) {
      updates.paymentStatus = paymentStatus
    }
    if (pickupDate) updates.pickupDate = String(pickupDate)
    if (dropoffDate) updates.dropoffDate = String(dropoffDate)
    if (totalAmount !== undefined && totalAmount !== '') {
      updates['pricing.total'] = Number(totalAmount)
    }
    if (amountPaid !== undefined && amountPaid !== '') {
      const paid = Number(amountPaid)
      const total = totalAmount !== undefined && totalAmount !== '' ? Number(totalAmount) : Number(existing.pricing?.total || 0)
      updates.amountPaid = paid
      updates.remainingAmount = Math.max(0, total - paid)
    }
    if (transferStatus && existing.splitDetails) {
      updates['splitDetails.transferStatus'] = transferStatus
      if (transferStatus === 'processed') {
        updates['splitDetails.settledAt'] = FieldValue.serverTimestamp()
      }
    }

    await bookingRef.update(updates)
    return res.json({ success: true })
  } catch (error) {
    console.error('Admin update booking error:', error)
    return res.status(500).json({ error: 'Unable to update booking' })
  }
})

app.delete('/api/admin/bookings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.collection('bookings').doc(req.params.id).delete()
    return res.json({ success: true })
  } catch (error) {
    console.error('Admin delete booking error:', error)
    return res.status(500).json({ error: 'Unable to delete booking' })
  }
})

// Admin KYC, Coupons, Reports delete/update
app.delete('/api/admin/kyc/:uid', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.collection('verificationRequests').doc(req.params.uid).delete()
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete KYC request' })
  }
})

app.delete('/api/admin/coupons/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.collection('coupons').doc(req.params.id).delete()
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete coupon' })
  }
})

app.put('/api/admin/reports/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body || {}
    await db.collection('reports').doc(req.params.id).update({
      status: status || 'reviewed',
      adminNote: String(adminNote || '').trim(),
      reviewedBy: req.user.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update report' })
  }
})

app.delete('/api/admin/reports/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.collection('reports').doc(req.params.id).delete()
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete report' })
  }
})

// Admin Site Content (CMS)
app.put('/api/admin/site-content', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { announcementEnabled, announcementText, heroTitle, heroSubtitle, footerTagline, cities } = req.body || {}
    await db.collection('siteContent').doc('homepage').set({
      announcementEnabled: Boolean(announcementEnabled),
      announcementText: String(announcementText || '').trim(),
      heroTitle: String(heroTitle || '').trim(),
      heroSubtitle: String(heroSubtitle || '').trim(),
      footerTagline: String(footerTagline || '').trim(),
      cities: Array.isArray(cities)
        ? cities.map((c) => String(c).trim()).filter(Boolean)
        : ['Dehradun', 'Mussoorie', 'Rishikesh'],
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update site content' })
  }
})

// Admin Credentials Management (authenticated admins only; never exposes password hashes)
app.get('/api/admin/credentials', requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('adminCredentials').get()
    const items = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name || d.id,
        email: data.email || '',
        active: data.active !== false,
        hasHashedPassword: Boolean(data.passwordHash),
        lastLoginAt: data.lastLoginAt || null,
      }
    })
    return res.json({ credentials: items })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to list admin accounts' })
  }
})

app.post('/api/admin/credentials', requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = String(req.body?.adminId || '').trim()
    const password = String(req.body?.password || '')
    const name = String(req.body?.name || adminId).trim()
    const email = String(req.body?.email || '').trim()
    const active = req.body?.active !== false

    if (!adminId || adminId.includes('/')) {
      return res.status(400).json({ error: 'Valid Admin ID is required' })
    }

    const payload = {
      name,
      email,
      active,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
      }
      const { salt, hash } = hashAdminPassword(password)
      payload.passwordHash = hash
      payload.passwordSalt = salt
      payload.password = FieldValue.delete()
    } else {
      const existing = await db.collection('adminCredentials').doc(adminId).get()
      if (!existing.exists) {
        return res.status(400).json({ error: 'Password is required for a new Admin ID' })
      }
    }

    await db.collection('adminCredentials').doc(adminId).set(payload, { merge: true })
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to save admin credential' })
  }
})

app.delete('/api/admin/credentials/:adminId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { adminId } = req.params
    if (`admin_${adminId}` === req.user.uid) {
      return res.status(400).json({ error: 'You cannot delete the currently signed-in admin ID' })
    }
    await db.collection('adminCredentials').doc(adminId).delete()
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete admin credential' })
  }
})

// ── SPA fallback ────────────────────────────────────────────────────────────
// Any request that didn't match an /api route or a static file in dist/ should
// receive the React app's index.html so that client-side routing can take over.
const indexHtmlPath = path.join(distPath, 'index.html')

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

app.get('*', (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath)
  }
  res.status(503).send(
    'Frontend not built. Run "npm run build" to generate the dist/ folder.'
  )
})

app.use((err, req, res, next) => {
  if (err.message === 'Origin not allowed by CORS') {
    console.warn(`[CORS] Rejected ${req.method} ${req.path} from origin: ${req.headers.origin || 'unknown'}`)
    return res.status(403).json({ error: err.message })
  }
  console.error('Unhandled API error:', err)
  return res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Fleet Server running on port ${PORT}`)
})

export default app
