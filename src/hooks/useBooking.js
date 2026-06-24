import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { apiFetch } from '../lib/api'

export function useBooking() {
  const { user, userDoc } = useAuth()
  const [step, setStep] = useState(1)
  const [pickupDate, setPickupDate] = useState('')
  const [dropoffDate, setDropoffDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pay_on_pickup')
  const [addons, setAddons] = useState({ helmet: true, insurance: false })
  const [confirmed, setConfirmed] = useState(false)
  const [bookingId, setBookingId] = useState('')
  const [saving, setSaving] = useState(false)

  const nextStep = () => setStep((s) => Math.min(s + 1, 4))
  const prevStep = () => setStep((s) => Math.max(s - 1, 1))
  const toggleAddon = (key) => setAddons((prev) => ({ ...prev, [key]: !prev[key] }))

  const buildBookingDetails = (vehicle, pricing) => {
    if (!user || !vehicle) return null

    return {
      renterId: user.uid,
      renterName: userDoc?.name || user.displayName || 'Guest',
      renterEmail: user.email || '',
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleImage: vehicle.imageUrl || vehicle.images?.[0] || '',
      ownerId: vehicle.ownerId || '',
      pickupDate: pricing.pickupDate || pickupDate,
      dropoffDate: pricing.dropoffDate || dropoffDate,
      pickupTime: pricing.pickupTime || '10:00',
      dropoffTime: pricing.dropoffTime || '10:00',
      pickupLocation: pricing.pickupLocation || vehicle.location || '',
      rentalType: pricing.rentalType || 'daily',
      couponCode: pricing.couponCode || null,
      addons,
      city: vehicle.city || '',
      paymentMethod,
    }
  }

  const saveBookingToFirestore = async (
    vehicle,
    pricing,
  ) => {
    if (!user || !vehicle) return null

    setSaving(true)
    try {
      const token = await user.getIdToken()
      const data = await apiFetch('/api/bookings/create', {
        token,
        method: 'POST',
        body: JSON.stringify({
          bookingDetails: buildBookingDetails(vehicle, pricing),
        }),
      })

      setBookingId(data.bookingId)
      setConfirmed(true)
      setStep(4)
      toast.success('Booking confirmed!')
      return data.bookingId
    } catch (err) {
      console.error('Booking save error:', err)
      toast.error(err.message || 'Booking failed. Please try again.')
      return null
    } finally {
      setSaving(false)
    }
  }

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
    buildBookingDetails,
  }
}
