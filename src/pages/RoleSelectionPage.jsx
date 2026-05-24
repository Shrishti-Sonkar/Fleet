import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '@/lib/constants'

const ROLES = [
  {
    id: 'renter',
    emoji: '🚗',
    title: 'I want to Rent',
    desc: 'Browse and book cars & bikes near you. Explore Uttarakhand on two or four wheels.',
    highlights: ['500+ Vehicles Available', 'Hourly & Daily Rentals', 'Instant Booking'],
  },
  {
    id: 'vendor',
    emoji: '🏢',
    title: 'I want to List my Vehicle',
    desc: 'Earn money by renting out your car or bike. Join 500+ owners earning monthly.',
    highlights: ['Earn ₹15,000+/month', 'Full Booking Management', 'Secure Payments'],
  },
]

export default function RoleSelectionPage() {
  const navigate = useNavigate()
  const { user, userRole, userDoc, refreshUserDoc } = useAuth()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  // If user already has a role, redirect immediately
  useEffect(() => {
    if (userRole === 'renter') navigate('/', { replace: true })
    if (userRole === 'vendor') navigate(ROUTES.VENDOR_HOME, { replace: true })
  }, [userRole, navigate])

  const handleContinue = async () => {
    if (!selected || !user) return
    setLoading(true)
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { role: selected, roleSetAt: serverTimestamp() },
        { merge: true }
      )
      await refreshUserDoc()
      navigate(selected === 'vendor' ? ROUTES.VENDOR_HOME : '/', { replace: true })
    } catch (err) {
      console.error('Role save error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-12">
      {/* Logo */}
      <div className="mb-10 text-center">
        <span className="text-4xl font-black text-white tracking-tight">Fleet</span>
        <div className="mt-1 text-xs text-white/30 tracking-widest uppercase">Uttarakhand's #1 Rental Platform</div>
      </div>

      {/* Heading */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Fleet</h1>
        <p className="text-sm text-white/50">How will you use Fleet?</p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-sm space-y-4">
        {ROLES.map((role) => {
          const isSelected = selected === role.id
          return (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className="w-full text-left rounded-2xl p-6 transition-all duration-200 relative"
              style={{
                background: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {/* Checkmark badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div className="text-4xl mb-4">{role.emoji}</div>

              {/* Text */}
              <h3 className="text-base font-bold text-white mb-1">{role.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed mb-4">{role.desc}</p>

              {/* Highlights */}
              <div className="space-y-1.5">
                {role.highlights.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                    <span className="text-xs text-white/40">{h}</span>
                  </div>
                ))}
              </div>
            </button>
          )
        })}

        {/* Continue button — appears after selection */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: selected ? '120px' : '0px', opacity: selected ? 1 : 0 }}
        >
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl text-base tracking-wide hover:bg-gray-100 active:scale-95 transition-all duration-150 mt-2 disabled:opacity-60"
          >
            {loading
              ? 'Setting up...'
              : `Continue as ${selected === 'renter' ? 'Renter' : 'Vendor'} →`}
          </button>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-white/25 pt-2">
          You can switch anytime from Profile Settings
        </p>
      </div>
    </div>
  )
}
