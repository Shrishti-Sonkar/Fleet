import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import BookingSteps from '../components/sections/BookingSteps'
import { useBooking } from '../hooks/useBooking'
import { mockVehicles } from '../data/mockVehicles'

const paymentMethods = [
  { id: 'upi', icon: 'account_balance_wallet', label: 'UPI Payment', sub: 'Google Pay, PhonePe, Paytm' },
  { id: 'card', icon: 'credit_card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', icon: 'account_balance', label: 'Net Banking', sub: 'All Indian Banks' },
]

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vehicle = mockVehicles.find(v => v.id === id) || mockVehicles[0]
  const { step, nextStep, prevStep, paymentMethod, setPaymentMethod, confirmed, confirmBooking } = useBooking()

  const [upiId, setUpiId] = useState('')
  const days = 3
  const rentalCharge = vehicle.dailyPrice * days
  const insurance = 1500
  const gst = Math.round((rentalCharge + insurance) * 0.18)
  const total = rentalCharge + insurance + gst

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="text-center relative p-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            </svg>
          </div>
          <h2 className="font-headline-md text-headline-md mb-2">Booking Confirmed!</h2>
          <p className="text-body-lg text-secondary mb-4">Your {vehicle.name} is ready for pickup.</p>
          <p className="text-label-md text-on-surface-variant mb-8">Booking ID: <span className="font-bold text-primary">FLT-{Date.now().toString().slice(-6)}</span></p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/')}
              className="h-12 px-8 bg-on-surface text-white font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all"
            >
              Go Home
            </button>
            <Link
              to="/browse"
              className="inline-flex h-12 px-8 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary-fixed/20 active:scale-95 transition-all items-center"
            >
              Browse More
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageLayout showBottomBar={false}>
      {/* Minimal checkout nav */}
      <header className="fixed top-0 w-full h-[68px] bg-surface-container-lowest border-b border-outline-variant z-50">
        <div className="flex items-center justify-between px-gutter max-w-screen-2xl mx-auto h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-headline-sm text-headline-sm font-black text-primary">Fleet</Link>
          </div>
          <div className="flex items-center gap-base">
            <span className="text-on-surface-variant font-label-md">Secure Checkout</span>
            <span className="material-symbols-outlined text-primary">lock</span>
          </div>
        </div>
      </header>

      <main className="pt-[100px] pb-section-padding-lg">
        <div className="max-w-4xl mx-auto px-gutter">
          <BookingSteps currentStep={step} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── Left: Payment Section ── */}
            <div className="lg:col-span-7 space-y-8">
              <section className="bg-surface-container-lowest p-8 rounded-xl shadow-soft">
                <h2 className="font-headline-sm text-headline-sm mb-6 text-on-background">Select Payment Method</h2>
                <div className="space-y-4">
                  {paymentMethods.map(pm => (
                    <label
                      key={pm.id}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === pm.id
                          ? 'border-2 border-primary bg-primary-fixed/20'
                          : 'border border-outline-variant hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-md flex items-center justify-center ${paymentMethod === pm.id ? 'bg-white shadow-sm' : 'bg-surface-container-high'}`}>
                          <span className={`material-symbols-outlined ${paymentMethod === pm.id ? 'text-primary' : 'text-secondary'}`}>{pm.icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{pm.label}</p>
                          <p className="text-label-md text-secondary">{pm.sub}</p>
                        </div>
                      </div>
                      <div
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${paymentMethod === pm.id ? 'border-primary' : 'border-outline-variant'}`}
                      >
                        {paymentMethod === pm.id && <div className="w-3 h-3 bg-primary rounded-full" />}
                      </div>
                    </label>
                  ))}
                </div>

                {/* UPI ID field */}
                {paymentMethod === 'upi' && (
                  <div className="mt-8 p-6 bg-surface-container-low rounded-lg border border-outline-variant">
                    <label className="block text-label-md font-bold mb-2">Enter UPI ID</label>
                    <div className="flex gap-2">
                      <input
                        id="upi-input"
                        className="flex-1 h-12 px-4 rounded-[10px] bg-white border border-outline-variant focus:border-primary focus:ring-0 outline-none transition-all"
                        placeholder="username@okaxis"
                        type="text"
                      />
                      <button className="h-12 px-6 bg-primary text-white font-bold rounded-[10px] hover:opacity-90 active:scale-95 transition-all">
                        Verify
                      </button>
                    </div>
                    <p className="mt-2 text-[12px] text-secondary">A payment request will be sent to your UPI app.</p>
                  </div>
                )}
              </section>

              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back to Documents
                </button>
                <button
                  id="pay-btn"
                  onClick={confirmBooking}
                  className="h-12 px-10 bg-primary-container text-white font-bold rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                  Pay ₹{total.toLocaleString('en-IN')}
                  <span className="material-symbols-outlined">shield</span>
                </button>
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-soft sticky top-[100px]">
                <h3 className="font-headline-sm text-[20px] mb-6 border-b border-outline-variant pb-4">Booking Summary</h3>

                {/* Vehicle image */}
                <div className="relative h-40 mb-6 bg-gradient-to-b from-white to-surface-container-high rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    alt={vehicle.name}
                    className="w-4/5 h-auto object-contain z-10"
                    src={vehicle.imageUrl}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-on-surface">{vehicle.name}</h4>
                      <p className="text-label-md text-secondary">{vehicle.fuelType} • {vehicle.seats} Seater</p>
                    </div>
                    <span className="bg-on-surface text-white text-[12px] px-2 py-1 rounded font-bold uppercase">
                      {vehicle.badge}
                    </span>
                  </div>

                  <div className="flex justify-between py-4 border-y border-outline-variant">
                    <div>
                      <p className="text-label-md text-secondary">Trip Duration</p>
                      <p className="font-bold">{days} Days</p>
                    </div>
                    <div className="text-right">
                      <p className="text-label-md text-secondary">Location</p>
                      <p className="font-bold">{vehicle.city}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-label-md">
                      <span className="text-secondary">Rental (₹{vehicle.dailyPrice.toLocaleString('en-IN')} x {days})</span>
                      <span className="text-on-surface">₹{rentalCharge.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-label-md">
                      <span className="text-secondary">Insurance & Protection</span>
                      <span className="text-on-surface">₹{insurance.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-label-md">
                      <span className="text-secondary">GST (18%)</span>
                      <span className="text-on-surface">₹{gst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-primary/20">
                      <span className="font-bold text-[24px]">Total</span>
                      <span className="font-bold text-[24px] text-primary">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Protection badge */}
                <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="text-label-md font-bold text-green-900">Fleet Protection Included</p>
                    <p className="text-[12px] text-green-700">Covered for accidental damage and 24/7 roadside assistance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </PageLayout>
  )
}
