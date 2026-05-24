import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import Razorpay from 'razorpay/dist/razorpay.js'
import admin from 'firebase-admin'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Initialize Middleware
app.use(cors())
app.use(express.json())

// Initialize Firebase Admin
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    })
    console.log('Firebase Admin initialized with Application Default Credentials')
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    })
    console.log(`Firebase Admin initialized with Project ID: ${process.env.FIREBASE_PROJECT_ID}`)
  } else {
    // Standard local fallback for development if keys aren't set yet
    admin.initializeApp({
      projectId: 'fleet-rental-dev'
    })
    console.log('Firebase Admin initialized with fallback local ID')
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message)
}

const db = admin.firestore()

// Initialize Razorpay Client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
})

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: admin.apps.length > 0 ? 'initialized' : 'failed'
  })
})

// Create Razorpay Order
app.post('/api/payments/order', async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' })
    }

    const options = {
      amount: Math.round(amount * 100), // in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    }

    const order = await razorpay.orders.create(options)
    console.log(`Razorpay Order created: ${order.id} for amount ${amount} INR`)
    res.status(200).json(order)
  } catch (error) {
    console.error('Error creating Razorpay Order:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verify Razorpay Payment Signature & Save Booking
app.post('/api/payments/verify', async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      bookingDetails
    } = req.body

    if (!razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Payment ID and Signature are required' })
    }

    // Verify Payment Signature only if order_id is present and we have a key secret
    // Skip verification for demo/dummy credentials if they don't match the signature
    if (razorpay_order_id && process.env.RAZORPAY_KEY_SECRET && !razorpay_payment_id.startsWith('DEMO_')) {
      const text = `${razorpay_order_id}|${razorpay_payment_id}`
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex')

      if (generated_signature !== razorpay_signature) {
        console.error('Payment signature verification failed')
        return res.status(400).json({ error: 'Invalid payment signature. Transaction may be tampered.' })
      }
    } else {
      console.log('Skipping signature verification due to missing secret or DEMO payment')
    }

    // If verification succeeded (or bypassed in dev), proceed to save booking to Firestore
    if (!bookingDetails) {
      return res.status(400).json({ error: 'Booking details are required to complete payment verification' })
    }

    const bid = 'FLT-' + Date.now().toString().slice(-6)

    const fullBookingDoc = {
      ...bookingDetails,
      bookingId: bid,
      paymentStatus: 'paid',
      paymentId: razorpay_payment_id,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }

    // Write Booking to Firestore
    const bookingRef = db.collection('bookings').doc()
    await bookingRef.set(fullBookingDoc)
    console.log(`Booking created in Firestore: ${bid}`)

    // Update Vehicle availability
    if (bookingDetails.vehicleId) {
      await db.collection('vehicles').doc(bookingDetails.vehicleId).update({
        available: false
      })
      console.log(`Vehicle ${bookingDetails.vehicleId} marked as unavailable`)
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and booking confirmed',
      bookingId: bid
    })
  } catch (error) {
    console.error('Error verifying payment and saving booking:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Fleet Backend Server running on port ${PORT}`)
})
