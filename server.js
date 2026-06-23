import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import Razorpay from 'razorpay/dist/razorpay.js'
import admin from 'firebase-admin'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

/*
 * CORS configuration — production-hardened.
 *
 * allowedOrigins: comma-separated list read from CORS_ORIGINS env var.
 *   Defaults to the Vite dev server origin. In production, set this to your
 *   deployed frontend domain(s), e.g.:
 *     CORS_ORIGINS=https://fleetmobilities.vercel.app,https://fleet.vercel.app
 */
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// In development, also allow any localhost / 127.0.0.1 port (e.g. Vite on 5173)
const isDevMode = process.env.NODE_ENV !== 'production'

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (server-to-server, curl, Postman, etc.)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
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

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '1mb' }))

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'),
    )
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
  } else {
    throw new Error('Firebase Admin credentials are not configured')
  }
}

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Razorpay credentials are not configured')
}

const db = admin.firestore()
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

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

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return expected === signature
}

async function getUserDoc(uid) {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? { id: snap.id, ...snap.data() } : null
}

async function isAdminUser(uid) {
  const userDoc = await getUserDoc(uid)
  return userDoc?.role === 'admin'
}

async function requireBookingAccess(bookingId, uid, { owner = false, renter = false, admin: allowAdmin = true } = {}) {
  const bookingRef = db.collection('bookings').doc(bookingId)
  const bookingSnap = await bookingRef.get()
  if (!bookingSnap.exists) {
    const byPublicId = await db.collection('bookings').where('bookingId', '==', bookingId).limit(1).get()
    if (byPublicId.empty) throw new Error('Booking not found')
    const doc = byPublicId.docs[0]
    return requireBookingAccess(doc.id, uid, { owner, renter, admin: allowAdmin })
  }

  const booking = { id: bookingSnap.id, ...bookingSnap.data() }
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
  return Math.floor(1000 + Math.random() * 9000).toString()
}

function bookingError(res, error, fallback) {
  return res.status(error.status || 400).json({ error: error.message || fallback })
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: admin.apps.length > 0 ? 'initialized' : 'failed',
  })
})

app.post('/api/payments/order', requireAuth, async (req, res) => {
  try {
    const details = req.body.bookingDetails || req.body
    const priced = await priceBooking(details)
    const receipt = `flt_${Date.now()}_${req.user.uid.slice(0, 8)}`

    const order = await razorpay.orders.create({
      amount: priced.pricing.total * 100,
      currency: 'INR',
      receipt,
      notes: {
        vehicleId: priced.vehicle.id,
        renterId: req.user.uid,
      },
    })

    await db.collection('paymentOrders').doc(order.id).set({
      renterId: req.user.uid,
      vehicleId: priced.vehicle.id,
      amount: order.amount,
      currency: order.currency,
      status: 'created',
      receipt,
      pricing: priced.pricing,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      pricing: priced.pricing,
    })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to create payment order' })
  }
})

app.post('/api/payments/verify', requireAuth, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      bookingDetails,
    } = req.body

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Complete Razorpay verification payload is required' })
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: 'Invalid payment signature' })
    }

    const priced = await priceBooking(bookingDetails || {})
    const paymentOrderRef = db.collection('paymentOrders').doc(razorpay_order_id)
    const paymentOrderSnap = await paymentOrderRef.get()
    if (!paymentOrderSnap.exists) {
      return res.status(400).json({ error: 'Payment order was not created by Fleet' })
    }

    const paymentOrder = paymentOrderSnap.data()
    const expectedAmount = priced.pricing.total * 100
    if (
      paymentOrder.status === 'used' ||
      paymentOrder.renterId !== req.user.uid ||
      paymentOrder.vehicleId !== priced.vehicle.id ||
      paymentOrder.amount !== expectedAmount ||
      paymentOrder.currency !== 'INR'
    ) {
      return res.status(400).json({ error: 'Payment order does not match this booking' })
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id)
    if (
      Number(razorpayOrder.amount) !== expectedAmount ||
      razorpayOrder.currency !== 'INR' ||
      razorpayOrder.notes?.renterId !== req.user.uid ||
      razorpayOrder.notes?.vehicleId !== priced.vehicle.id
    ) {
      return res.status(400).json({ error: 'Razorpay order details do not match this booking' })
    }

    const bid = `FLT-${Date.now().toString().slice(-6)}`
    const bookingRef = db.collection('bookings').doc()

    await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(paymentOrderRef)
      if (!orderSnap.exists || orderSnap.data().status === 'used') {
        throw new Error('Payment order has already been used')
      }

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
        paymentMethod: bookingDetails?.paymentMethod || 'razorpay',
        bookingId: bid,
        paymentStatus: 'paid',
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      transaction.update(vehicleRef, { available: false })
      transaction.update(paymentOrderRef, {
        status: 'used',
        paymentId: razorpay_payment_id,
        bookingDocId: bookingRef.id,
        bookingId: bid,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    })

    res.status(200).json({
      success: true,
      message: 'Payment verified and booking confirmed',
      bookingId: bid,
      id: bookingRef.id,
    })
  } catch (error) {
    res.status(400).json({ error: error.message || 'Payment verification failed' })
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
        otpExpiry: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      transaction.update(vehicleRef, { available: false })
    })

    res.status(200).json({ success: true, startOTP, dropoffPIN })
  } catch (error) {
    bookingError(res, error, 'Unable to approve booking')
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
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    const { reason, cancellationFee = 0, refundAmount = 0 } = req.body
    if (!reason) throw new Error('Cancellation reason is required')
    const { bookingRef, booking } = await requireBookingAccess(req.params.id, req.user.uid, { renter: true, owner: true })
    if (['completed', 'cancelled'].includes(booking.status)) throw new Error('This booking cannot be cancelled')

    await db.runTransaction(async (transaction) => {
      const vehicleRef = db.collection('vehicles').doc(booking.vehicleId)
      transaction.update(bookingRef, {
        status: 'cancelled',
        paymentStatus: Number(refundAmount) > 0 ? 'refund_pending' : booking.paymentStatus,
        cancelledBy: req.user.uid,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancellationReason: reason,
        cancellationFee: Math.max(0, Number(cancellationFee) || 0),
        refundAmount: Math.max(0, Number(refundAmount) || 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      rideStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      startOTP: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
        rideEndedAt: admin.firestore.FieldValue.serverTimestamp(),
        dropoffPIN: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
      transaction.update(bookingRef, updates)
      transaction.update(vehicleRef, { available: true })

      if (booking.rentalType === 'hourly' && booking.rideStartedAt) {
        const startTime = booking.rideStartedAt?.toDate ? booking.rideStartedAt.toDate() : new Date(booking.rideStartedAt)
        const hoursUsed = Math.max(1, Math.ceil((Date.now() - startTime.getTime()) / (1000 * 60 * 60)))
        transaction.update(userRef, {
          tokens: admin.firestore.FieldValue.increment(-hoursUsed),
          tokensUsed: admin.firestore.FieldValue.increment(hoursUsed),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }
    })

    res.status(200).json({ success: true })
  } catch (error) {
    bookingError(res, error, 'Unable to complete ride')
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
        otpExpiry: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      }

    if (type === 'start' && booking.status !== 'approved') throw new Error('Start OTP can only be regenerated for approved bookings')
    if (type === 'dropoff' && booking.status !== 'active') throw new Error('Drop-off PIN can only be regenerated for active bookings')

    await bookingRef.update({
      ...update,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(200).json({ success: true, code: newCode })
  } catch (error) {
    bookingError(res, error, 'Unable to regenerate code')
  }
})

app.post('/api/payments/webhook', async (req, res) => {
  const signature = req.headers['razorpay-signature']
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret) return res.status(501).json({ error: 'Webhook secret is not configured' })

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex')

  if (signature !== expected) return res.status(400).json({ error: 'Invalid webhook signature' })

  const event = JSON.parse(req.body.toString('utf8'))
  await db.collection('paymentEvents').add({
    event: event.event,
    payload: event.payload || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  res.status(200).json({ ok: true })
})

app.use((err, req, res, next) => {
  if (err.message === 'Origin not allowed by CORS') {
    console.warn(`[CORS] Rejected ${req.method} ${req.path} from origin: ${req.headers.origin || 'unknown'}`)
    return res.status(403).json({ error: err.message })
  }
  return next(err)
})

app.listen(PORT, () => {
  console.log(`Fleet Backend Server running on port ${PORT}`)
})
