import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import VendorLayout from '../components/VendorLayout'
import toast from 'react-hot-toast'

export default function VendorHandoverPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [kyc, setKyc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    const fetchDetails = async () => {
      try {
        const bSnap = await getDoc(doc(db, 'bookings', id))
        if (bSnap.exists()) {
          setBooking({ id: bSnap.id, ...bSnap.data() })
        }
        const token = await user.getIdToken()
        const kycData = await apiFetch(`/api/bookings/${id}/renter-kyc`, { token })
        setKyc(kycData)
      } catch (err) {
        toast.error('Error fetching details: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [id, user])

  const handleApprove = async () => {
    setProcessing(true)
    try {
      const token = await user.getIdToken()
      const res = await apiFetch(`/api/bookings/${id}/approve`, { token, method: 'POST' })
      toast.success(`Booking Approved! OTP: ${res.startOTP}`)
      setBooking((prev) => ({ ...prev, status: 'approved', startOTP: res.startOTP, dropoffPIN: res.dropoffPIN }))
    } catch (err) {
      toast.error('Approve failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <VendorLayout title="Handover Verification">
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </VendorLayout>
    )
  }

  if (!booking) {
    return (
      <VendorLayout title="Handover Verification">
        <p className="text-slate-400">Booking not found.</p>
      </VendorLayout>
    )
  }

  const remaining = (booking.pricing?.total || 0) - (booking.amountPaid || 0)
  const isPaid = booking.paymentStatus === 'paid'
  const isTokenPaid = booking.paymentStatus === 'token_paid'

  return (
    <VendorLayout title={`Handover #${booking.bookingId || booking.id}`} subtitle="Inspect renter identity and verify payment status">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Renter Identity Verification */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0e1424] border border-slate-800 rounded-3xl p-6">
            <h3 className="font-extrabold text-white text-base mb-4 pb-3 border-b border-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">badge</span> Renter Identity Inspection
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Renter Name</span>
                <span className="font-bold text-white">{kyc?.name || booking.renterName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Email</span>
                <span className="font-bold text-white">{kyc?.email || booking.renterEmail}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Phone</span>
                <span className="font-bold text-white">{kyc?.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">KYC Status</span>
                <span className={`font-bold uppercase text-xs ${kyc?.kycStatus === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {kyc?.kycStatus || 'UNKNOWN'}
                </span>
              </div>
            </div>

            {/* Document Gallery */}
            <h4 className="font-bold text-xs uppercase text-slate-400 mb-3">Submitted ID Documents</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 font-bold mb-2">Driving License</p>
                {kyc?.dlUrl ? (
                  <a href={kyc.dlUrl} target="_blank" rel="noreferrer" className="block text-xs font-bold text-blue-400 underline">
                    View Document →
                  </a>
                ) : (
                  <span className="text-xs text-slate-600">Not uploaded</span>
                )}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 font-bold mb-2">Aadhaar Card</p>
                {kyc?.aadhaarUrl ? (
                  <a href={kyc.aadhaarUrl} target="_blank" rel="noreferrer" className="block text-xs font-bold text-blue-400 underline">
                    View Document →
                  </a>
                ) : (
                  <span className="text-xs text-slate-600">Not uploaded</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payment & Handover Gate */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0e1424] border border-slate-800 rounded-3xl p-6">
            <h3 className="font-extrabold text-white text-base mb-4 pb-3 border-b border-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">payments</span> Payment Verification
            </h3>

            {/* Payment Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Booking Amount</span>
                <span className="font-bold text-white">₹{(booking.pricing?.total || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount Paid</span>
                <span className="font-bold text-emerald-400">₹{(booking.amountPaid || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Remaining Balance</span>
                <span className="font-bold text-amber-400">₹{remaining.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment Gate Banner */}
            {isPaid ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span> Full payment verified. Vehicle ready for OTP handover.
              </div>
            ) : isTokenPaid ? (
              <div className="p-4 bg-amber-950/60 border border-amber-800/60 rounded-xl text-amber-400 text-xs font-bold mb-6">
                ⚠️ Partial payment — Token ₹{booking.tokenAmount || 0} received. Remaining ₹{remaining} due before trip start.
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs font-bold mb-6">
                Payment Pending — Collect payment at pickup or via customer app.
              </div>
            )}

            {/* Handover OTP Controls */}
            {booking.status === 'pending' && (
              <button
                onClick={handleApprove}
                disabled={processing}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
              >
                {processing ? 'Processing...' : 'Approve Booking & Generate OTP'}
              </button>
            )}

            {booking.startOTP && (
              <div className="mt-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl text-center">
                <span className="text-xs uppercase text-slate-400 font-bold block mb-1">Handover Start OTP</span>
                <span className="text-3xl font-mono font-extrabold text-blue-400 tracking-widest block mb-2">{booking.startOTP}</span>
                <p className="text-[11px] text-slate-500">Provide this 4-digit code to the renter to start their ride.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </VendorLayout>
  )
}
