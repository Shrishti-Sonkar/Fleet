import { useState } from 'react'

export function useBooking() {
  const [step, setStep] = useState(1)
  const [pickupDate, setPickupDate] = useState('')
  const [dropoffDate, setDropoffDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [addons, setAddons] = useState({ helmet: true, insurance: false })
  const [confirmed, setConfirmed] = useState(false)

  const nextStep = () => setStep(s => Math.min(s + 1, 4))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const toggleAddon = (key) => {
    setAddons(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const confirmBooking = () => {
    setConfirmed(true)
    setStep(4)
  }

  return {
    step, nextStep, prevStep,
    pickupDate, setPickupDate,
    dropoffDate, setDropoffDate,
    paymentMethod, setPaymentMethod,
    addons, toggleAddon,
    confirmed, confirmBooking,
  }
}
