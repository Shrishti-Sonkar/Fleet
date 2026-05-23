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
    paymentId = 'DEMO_' + Date.now(),
  ) => {
    if (!user || !vehicle) return null
    setSaving(true)
    try {
      const bid = 'FLT-' + Date.now().toString().slice(-6)
      await addDoc(collection(db, 'bookings'), {
        bookingId: bid,
        renterId: user.uid,
        renterName: userDoc?.name || user.displayName || 'Guest',
        renterEmail: user.email,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleImage: vehicle.imageUrl || vehicle.images?.[0] || '',
        ownerId: vehicle.ownerId || 'OWNER_UID',
        pickupDate,
        dropoffDate,
        totalDays: pricing.days,
        pricing: {
          dailyRate: vehicle.dailyPrice,
          rentalCharge: pricing.rentalCharge,
          insurance: pricing.insurance,
          gst: pricing.gst,
          total: pricing.total,
          securityDeposit: vehicle.securityDeposit || 5000,
        },
        addons,
        status: 'pending',
        paymentStatus: 'paid',
        paymentId,
        paymentMethod,
        city: vehicle.city,
        createdAt: serverTimestamp(),
      })

      // Mark vehicle temporarily unavailable until owner approves
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
      toast.error('Booking failed. Please try again.')
      return null
    } finally {
      setSaving(false)
    }
  }

  // Razorpay payment trigger
  const initiateRazorpayPayment = (vehicle, pricing, onSuccess) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: pricing.total * 100,
      currency: 'INR',
      name: 'Fleet',
      description: `Booking: ${vehicle.name}`,
      image: '/favicon.svg',
      handler: async function (response) {
        await onSuccess(response.razorpay_payment_id)
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
