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
  'https://fleetmobilities.info',
  'https://www.fleetmobilities.info',
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

// ── Payment Settings ────────────────────────────────────────────────────────
app.get('/api/admin/payment-settings', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('settings').doc('platform').get()
    const settings = snap.exists ? snap.data() : {}
    res.json({
      tokenAmountType: settings.tokenAmountType || 'fixed',
      tokenFixedAmount: settings.tokenFixedAmount || 500,
      tokenPercentage: settings.tokenPercentage || 20,
      platformCommissionPercent: settings.platformCommissionPercent || 15,
      gstRate: settings.gstRate || 0.18,
    })
  } catch (error) {
    console.error('Read payment settings error:', error)
    res.status(500).json({ error: 'Unable to read payment settings' })
  }
})

app.put('/api/admin/payment-settings', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid
    if (!(await isAdminUser(uid))) return res.status(403).json({ error: 'Admin access required' })
    const { tokenAmountType, tokenFixedAmount, tokenPercentage, platformCommissionPercent, gstRate, supportEmail } = req.body
    await db.collection('settings').doc('platform').set({
      tokenAmountType: tokenAmountType || 'fixed',
      tokenFixedAmount: Number(tokenFixedAmount) || 500,
      tokenPercentage: Number(tokenPercentage) || 20,
      platformCommissionPercent: Number(platformCommissionPercent) || 15,
      gstRate: Number(gstRate) || 0.18,
      supportEmail: supportEmail || 'help@fleet.in',
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

// Internal: Split payment between platform and vendor
async function splitPayment(bookingId, paymentId, totalAmount, ownerId) {
  try {
    const bookingRef = db.collection('bookings').doc(bookingId)
    const existingBookingSnap = await bookingRef.get()
    const existingSplit = existingBookingSnap.data()?.splitDetails
    if (existingSplit?.paymentId === paymentId) return existingSplit

    // Fetch platform commission setting
    const settingsSnap = await db.collection('settings').doc('platform').get()
    const settings = settingsSnap.exists ? settingsSnap.data() : {}
    const commissionPercent = settings.platformCommissionPercent || 15

    const platformCut = Math.round(totalAmount * commissionPercent / 100)
    const vendorCut = totalAmount - platformCut

    // Get vendor's linked account
    const vendorSnap = await db.collection('users').doc(ownerId).get()
    const vendor = vendorSnap.exists ? vendorSnap.data() : {}
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
        transferId,
        transferStatus,
        paymentId,
        settledAt: transferStatus === 'processed' ? FieldValue.serverTimestamp() : null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { platformCut, vendorCut, transferId, transferStatus }
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
