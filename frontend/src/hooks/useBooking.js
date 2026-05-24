import { useState } from 'react'
import {
  collection, addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useBooking() {
  const { user, userDoc } = useAuth()
  const [step, setStep] = useState(1)
  const [pickupDate, setPickupDate] = useState('')
  const [dropoffDate, setDropoffDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [addons, setAddons] = useState({ helmet: true, insurance: false })
  const [confirmed, setConfirmed] = useState(false)
  const [bookingId, setBookingId] = useState('')
  const [saving, setSaving] = useState(false)

  const nextStep = () => setStep((s) => Math.min(s + 1, 4))
  const prevStep = () => setStep((s) => Math.max(s - 1, 1))
  const toggleAddon = (key) => setAddons((prev) => ({ ...prev, [key]: !prev[key] }))

  const saveBookingToFirestore = async (
    vehicle,
    pricing,
    paymentInfo = null,
  ) => {
    if (!user || !vehicle) return null
    setSaving(true)
    try {
      const pDate = pricing.pickupDate || pickupDate
      const dDate = pricing.dropoffDate || dropoffDate
      const pTime = pricing.pickupTime || '10:00'
      const dTime = pricing.dropoffTime || '10:00'

      const bookingDetails = {
        renterId: user.uid,
        renterName: userDoc?.name || user.displayName || 'Guest',
        renterEmail: user.email,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleImage: vehicle.imageUrl || vehicle.images?.[0] || '',
        ownerId: vehicle.ownerId || '',
        pickupDate: pDate,
        dropoffDate: dDate,
        pickupTime: pTime,
        dropoffTime: dTime,
        pickupLocation: pricing.pickupLocation || vehicle.location || '',
        rentalType: pricing.rentalType || 'daily',
        totalDays: pricing.days || 1,
        totalHours: pricing.hours || 0,
        pricing: {
          dailyRate: vehicle.dailyPrice,
          rentalCharge: pricing.rentalCharge,
          insurance: pricing.insurance || 0,
          couponCode: pricing.couponCode || null,
          couponSavings: pricing.couponSavings || 0,
          gst: pricing.gst,
          total: pricing.total,
          subtotal: pricing.subtotal || pricing.rentalCharge,
          securityDeposit: vehicle.securityDeposit || 5000,
        },
        addons,
        city: vehicle.city,
        paymentMethod,
      }

      // If backend verification payload is supplied, route to backend verify endpoint
      if (paymentInfo && typeof paymentInfo === 'object' && paymentInfo.razorpay_signature) {
        const verifyRes = await fetch('http://localhost:5000/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: paymentInfo.razorpay_payment_id,
            razorpay_order_id: paymentInfo.razorpay_order_id,
            razorpay_signature: paymentInfo.razorpay_signature,
            bookingDetails,
          }),
        })

        if (!verifyRes.ok) {
          const errData = await verifyRes.json()
          throw new Error(errData.error || 'Payment verification failed')
        }

        const data = await verifyRes.json()
        setBookingId(data.bookingId)
        setConfirmed(true)
        setStep(4)
        toast.success('Payment verified & booking confirmed! 🎉')
        return data.bookingId
      }

      // Fallback: Client-side write (used when bypassing gateway in dev/test keys)
      const bid = 'FLT-' + Date.now().toString().slice(-6)
      await addDoc(collection(db, 'bookings'), {
        ...bookingDetails,
        bookingId: bid,
        status: 'pending',
        paymentStatus: 'paid',
        paymentId: typeof paymentInfo === 'string' ? paymentInfo : 'DEMO_' + Date.now(),
        createdAt: serverTimestamp(),
      })

      if (vehicle.id) {
        await updateDoc(doc(db, 'vehicles', vehicle.id), { available: false })
      }

      setBookingId(bid)
      setConfirmed(true)
      setStep(4)
      toast.success('Booking confirmed! 🎉')
      return bid
    } catch (err) {
      console.error('Booking save error:', err)
      toast.error(err.message || 'Booking failed. Please try again.')
      return null
    } finally {
      setSaving(false)
    }
  }

  // Razorpay payment trigger with backend order integration
  const initiateRazorpayPayment = async (vehicle, pricing, onSuccess) => {
    try {
      // 1. Create secure order on Express backend
      const res = await fetch('http://localhost:5000/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pricing.total }),
      })

      if (!res.ok) {
        throw new Error('Failed to create payment order on backend')
      }

      const order = await res.json()

      // 2. Configure checkout option with order_id
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Fleet',
        description: `Booking: ${vehicle.name}`,
        image: '/favicon.svg',
        order_id: order.id,
        handler: async function (response) {
          // Pass the signature validation payload to success callback
          await onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          })
        },
        prefill: {
          name: userDoc?.name || '',
          email: user?.email || '',
          contact: userDoc?.phone || '',
        },
        theme: { color: '#ff6b00' },
        modal: {
          ondismiss: () => toast('Payment cancelled', { icon: '⚠️' }),
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Razorpay initialization error:', err)
      toast.error('Payment initialization failed. Is the backend server running?')
    }
  }

  // Kept for backward compatibility
  const confirmBooking = () => {
    setConfirmed(true)
    setStep(4)
  }

  return {
    step,
    nextStep,
    prevStep,
    pickupDate,
    setPickupDate,
    dropoffDate,
    setDropoffDate,
    paymentMethod,
    setPaymentMethod,
    addons,
    toggleAddon,
    confirmed,
    bookingId,
    saving,
    confirmBooking,
    saveBookingToFirestore,
    initiateRazorpayPayment,
  }
}

