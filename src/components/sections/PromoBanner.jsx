import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const SLIDES = [
  {
    id: 1,
    tag: 'LIMITED OFFER',
    headline: 'First Ride Free',
    sub: 'Use code FLEET100 — up to ₹100 off your first booking',
    cta: 'Book Now',
    ctaPath: '/browse',
    bg: 'from-[#ff6b00] to-[#a04100]',
    icon: 'local_offer',
  },
  {
    id: 2,
    tag: 'EARN WITH FLEET',
    headline: 'Rent out your car/bike',
    sub: 'Turn your idle ride into extra cash. Join 500+ owners earning monthly.',
    cta: 'List My Vehicle',
    ctaPath: '/host',
    bg: 'from-[#1a237e] to-[#283593]',
    icon: 'currency_rupee',
  },
  {
    id: 3,
    tag: 'WEEKEND SPECIAL',
    headline: '20% off on 3-day bookings',
    sub: 'Valid Fri–Sun on all bikes and scooters in Dehradun & Rishikesh',
    cta: 'Explore Deals',
    ctaPath: '/browse',
    bg: 'from-[#1b5e20] to-[#2e7d32]',
    icon: 'celebration',
  },
  {
    id: 4,
    tag: 'REFER & EARN',
    headline: 'Get ₹200 for every friend',
    sub: 'Share your referral code and earn tokens when they complete their first ride',
    cta: 'Share Code',
    ctaPath: '/profile',
    bg: 'from-[#4a148c] to-[#6a1b9a]',
    icon: 'group_add',
  },
]

const AUTO_INTERVAL = 4000

export default function PromoBanner() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const navigate = useNavigate()

  const goTo = useCallback((index) => {
    if (animating) return
    setAnimating(true)
    setCurrent(index)
    setTimeout(() => setAnimating(false), 300)
  }, [animating])

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo])
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, AUTO_INTERVAL)
    return () => clearInterval(timer)
  }, [paused, next])

  // Swipe support
  const [touchStart, setTouchStart] = useState(null)
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (!touchStart) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
    setTouchStart(null)
  }

  const slide = SLIDES[current]

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide */}
      <div
        className={`bg-gradient-to-r ${slide.bg} transition-all duration-300 ${
          animating ? 'opacity-70 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        <div className="px-5 py-5 flex items-center justify-between gap-4 min-h-[110px]">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            <span className="inline-block text-white/70 text-[10px] font-bold tracking-widest uppercase mb-1">
              {slide.tag}
            </span>
            <h3 className="text-white font-bold text-[18px] leading-tight mb-1">
              {slide.headline}
            </h3>
            <p className="text-white/80 text-[12px] leading-relaxed line-clamp-2">
              {slide.sub}
            </p>
            <button
              onClick={() => navigate(slide.ctaPath)}
              className="mt-3 bg-white/20 hover:bg-white/30 active:bg-white/10 text-white text-[12px] font-bold px-4 py-1.5 rounded-full border border-white/30 transition-all"
            >
              {slide.cta} →
            </button>
          </div>

          {/* Right icon */}
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-white text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {slide.icon}
            </span>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Prev / Next (desktop) */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 items-center justify-center transition-all"
        aria-label="Previous slide"
      >
        <span className="material-symbols-outlined text-white text-[18px]">chevron_left</span>
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 items-center justify-center transition-all"
        aria-label="Next slide"
      >
        <span className="material-symbols-outlined text-white text-[18px]">chevron_right</span>
      </button>
    </div>
  )
}
