import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { usePriceMode } from '../../context/PriceContext'
import { useWishlist } from '../../hooks/useWishlist'
import { ROUTES } from '../../lib/constants'

export default function VehicleCard({ vehicle }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { priceMode } = usePriceMode()
  const { isWishlisted, toggleWishlist } = useWishlist(user?.uid)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [showInfo, setShowInfo]               = useState(false)
  const [wishlistAnim, setWishlistAnim]       = useState(false)

  const ratingRef = useRef(null)
  const infoRef   = useRef(null)

  // Close popups on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ratingRef.current && !ratingRef.current.contains(e.target)) setShowRatingPopup(false)
      if (infoRef.current  && !infoRef.current.contains(e.target))   setShowInfo(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────
  const {
    id, name, badge, imageUrl, fuelType, cc, dailyPrice,
    rating, reviewCount, mileage, location,
    ownerType, ownerName, transmission, year, seats,
    cancellationPolicy, ratingBreakdown, subRatings,
  } = vehicle

  // Price mode (hourly / daily) — existing logic preserved
  const displayPrice = priceMode === 'hourly'
    ? (vehicle.hourlyPrice || Math.round(dailyPrice / 8))
    : dailyPrice
  const priceLabel = priceMode === 'hourly' ? '/ hr' : '/ day'

  // Category badge (existing system badge, top-left inline within image padding)
  const badgeClass =
    badge?.toLowerCase() === 'popular'  ? 'bg-on-surface text-surface-lowest' :
    badge?.toLowerCase() === 'electric' ? 'bg-secondary-container text-on-secondary-container' :
    'bg-inverse-surface text-on-tertiary'

  // Rating breakdown — real Firestore data or generated mock
  const total = reviewCount || 10
  const breakdown = ratingBreakdown || {
    5: Math.floor(total * 0.65),
    4: Math.floor(total * 0.20),
    3: Math.floor(total * 0.10),
    2: Math.floor(total * 0.03),
    1: Math.floor(total * 0.02),
  }
  const breakdownTotal = Object.values(breakdown).reduce((s, v) => s + v, 0) || 1

  const wishlisted = isWishlisted(id)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast('🔒 Login to save vehicles', { icon: '❤️' })
      navigate(ROUTES.LOGIN)
      return
    }
    setWishlistAnim(true)
    setTimeout(() => setWishlistAnim(false), 400)
    await toggleWishlist(id)
  }

  const handleBookNow = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(ROUTES.BOOKING(id))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <article
      className="group relative bg-surface-container-lowest rounded-2xl overflow-visible
      border border-surface-variant cursor-pointer
      transition-all duration-300 ease-out
      hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)]
      hover:border-primary-container will-change-transform"
      onClick={() => navigate(ROUTES.VEHICLE_DETAIL(id))}
    >
      {/* ═══════════════════════════════════════════════════════
          IMAGE SECTION
      ═══════════════════════════════════════════════════════ */}
      <div className="relative h-48 overflow-hidden rounded-t-2xl bg-surface">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-[1]" />

        {/* Vehicle image with zoom on hover */}
        <img
          src={imageUrl || '/placeholder-vehicle.jpg'}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* ── FEATURE 1: Private / Vendor Badge (top-left) ── */}
        {ownerType && (
          <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full
            text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm
            ${ownerType === 'vendor' ? 'bg-purple-600/90' : 'bg-blue-500/90'}`}
          >
            {ownerType === 'vendor' ? '🏢 Vendor' : '👤 Private'}
          </div>
        )}

        {/* Fallback: existing category badge if no ownerType */}
        {!ownerType && badge && (
          <span className={`absolute top-3 left-3 z-10 px-3 py-1 rounded text-[10px]
            font-bold tracking-widest uppercase ${badgeClass}`}>
            {badge}
          </span>
        )}

        {/* ── FEATURE 3: Wishlist Heart (top-right) ── */}
        <button
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={handleWishlist}
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full
            bg-white/80 backdrop-blur-sm flex items-center justify-center
            shadow-md transition-transform duration-150
            hover:scale-110 active:scale-95
            ${wishlistAnim ? 'scale-125' : ''}`}
        >
          <span className={`text-base transition-all duration-200 ${wishlisted ? 'scale-110' : ''}`}>
            {wishlisted ? '❤️' : '🤍'}
          </span>
        </button>

        {/* ── FEATURE 6: Info "i" button (bottom-left) ── */}
        <div ref={infoRef} className="absolute bottom-2 left-2 z-10">
          <button
            aria-label="Vehicle quick info"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(!showInfo) }}
            className="w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm
              text-gray-600 text-[11px] font-black flex items-center justify-center
              shadow hover:bg-white transition-colors"
          >
            i
          </button>

          {/* Info Tooltip */}
          {showInfo && (
            <div
              className="absolute bottom-8 left-0 z-50 w-48 bg-white rounded-xl
                shadow-2xl border border-gray-100 p-3
                animate-[fadeInUp_0.15s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Arrow */}
              <div className="absolute -bottom-1.5 left-3 w-3 h-3 bg-white
                border-r border-b border-gray-100 rotate-45" />

              <p className="text-[11px] font-black text-gray-800 mb-2 uppercase tracking-wider">
                Quick Specs
              </p>
              {[
                { icon: '⚙️', label: 'Transmission', value: transmission || 'Manual' },
                { icon: '📅', label: 'Year',         value: year || '2022' },
                { icon: '👤', label: 'Seats',        value: seats || 2 },
                { icon: fuelType === 'Electric' ? '⚡' : '⛽', label: 'Fuel', value: fuelType || 'Petrol' },
                { icon: '❌', label: 'Cancellation', value: cancellationPolicy || 'Check policy' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-1
                  border-b border-gray-50 last:border-0">
                  <span className="text-[11px] text-gray-500">{icon} {label}</span>
                  <span className="text-[11px] font-semibold text-gray-800 text-right max-w-[80px] truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FEATURE 5: "Tap to Book →" overlay on hover ── */}
        <div className="absolute bottom-0 left-0 right-0 z-[2]
          flex items-end pb-2.5 px-3
          translate-y-full group-hover:translate-y-0
          transition-transform duration-300 ease-out">
          <div className="flex items-center gap-1">
            <span className="text-white text-[11px] font-bold drop-shadow">Tap to Book</span>
            <span className="text-white text-[11px]">→</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CARD BODY
      ═══════════════════════════════════════════════════════ */}
      <div className="p-4">

        {/* Name + Rating row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-bold text-on-surface text-[15px] leading-tight flex-1">
            {name}
          </h2>

          {/* ── FEATURE 2: Rating Chip + Popup ── */}
          <div ref={ratingRef} className="relative shrink-0">
            <button
              aria-label="View rating breakdown"
              onClick={(e) => { e.stopPropagation(); setShowRatingPopup(!showRatingPopup) }}
              className="flex items-center gap-1 bg-green-50 border border-green-200
                px-2 py-0.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs font-bold text-gray-700">
                {rating || '4.8'}
              </span>
            </button>

            {/* Rating Popup */}
            {showRatingPopup && (
              <div
                className="absolute right-0 bottom-8 z-50 w-56 bg-white rounded-xl
                  shadow-2xl border border-gray-100 p-4
                  animate-[fadeInUp_0.15s_ease-out]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Arrow */}
                <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-white
                  border-r border-b border-gray-100 rotate-45" />

                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-black text-gray-900">⭐ {rating || '4.8'}</span>
                  <span className="text-[11px] text-gray-400">{reviewCount || 0} reviews</span>
                </div>

                {/* Bar breakdown */}
                <div className="space-y-1.5 mb-3">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = breakdown[star] || 0
                    const pct   = Math.round((count / breakdownTotal) * 100)
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 w-4 shrink-0">{star}★</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-6 text-right shrink-0">
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Sub-ratings */}
                {subRatings && (
                  <>
                    <div className="h-px bg-gray-100 mb-2" />
                    {[
                      { label: 'Cleanliness',    val: subRatings.cleanliness },
                      { label: 'Condition',       val: subRatings.condition },
                      { label: 'Responsiveness',  val: subRatings.responsiveness },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between items-center py-0.5">
                        <span className="text-[11px] text-gray-500">{label}</span>
                        <span className="text-[11px] font-bold text-gray-700">{val?.toFixed(1)}</span>
                      </div>
                    ))}
                    <div className="h-px bg-gray-100 mt-2 mb-2" />
                  </>
                )}

                <Link
                  to={`${ROUTES.VEHICLE_DETAIL(id)}#reviews`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  View all reviews →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── FEATURE 4: Mileage + Location chips ── */}
        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant mb-3">
          {mileage && (
            <span>{fuelType === 'Electric' ? '⚡' : '⛽'} {mileage}</span>
          )}
          {location && (
            <span className="truncate">📍 {location}</span>
          )}
        </div>

        {/* Owner tag */}
        <div className="flex items-center gap-1 mb-3">
          <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
          <span className="text-[11px] font-medium text-on-surface-variant">
            {ownerName || vehicle.hostName || 'Verified Partner'}
          </span>
        </div>

        {/* Price + CTA row */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-variant">
          <div>
            <span className="text-headline-sm text-primary font-black">
              ₹{displayPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-on-surface-variant text-label-md font-medium"> {priceLabel}</span>
          </div>
          <button
            onClick={handleBookNow}
            className="bg-primary-container text-white px-5 py-2 rounded-full
              font-bold text-label-md transition-all active:scale-95
              hover:opacity-90 hover:shadow-md"
          >
            Book Now
          </button>
        </div>
      </div>
    </article>
  )
}
