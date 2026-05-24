import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import { ROUTES } from '../lib/constants'
import { useVehicleReviews } from '../hooks/useVehicleReviews'
import ReviewCard from '../components/ReviewCard'

export default function VehicleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('Overview')
  const [activeThumb, setActiveThumb] = useState(0)
  const [pickupDate, setPickupDate] = useState('Oct 24, 2024')
  const [dropoffDate, setDropoffDate] = useState('Oct 26, 2024')
  const [helmetAddon, setHelmetAddon] = useState(true)
  const [insuranceAddon, setInsuranceAddon] = useState(false)

  const { reviews, stats, loading: reviewsLoading } = useVehicleReviews(id)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const snap = await getDoc(doc(db, 'vehicles', id))
        if (snap.exists()) {
          setVehicle({ id: snap.id, ...snap.data() })
        } else {
          navigate('/browse')
        }
      } catch (err) {
        console.error('Error fetching vehicle', err)
        navigate('/browse')
      } finally {
        setLoading(false)
      }
    }
    fetchVehicle()
  }, [id, navigate])

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    )
  }

  if (!vehicle) return null;

  const tabs = ['Overview', 'Specs', `Reviews (${stats.total})`, 'Location']

  const dailyTotal = (vehicle.dailyPrice || 0) * 2
  const helmetCost = helmetAddon ? 200 : 0
  const insuranceCost = insuranceAddon ? 500 : 0
  const total = dailyTotal + helmetCost + insuranceCost

  const thumbnails = [vehicle.imageUrl, vehicle.imageUrl, vehicle.imageUrl, vehicle.imageUrl].filter(Boolean)

  return (
    <PageLayout>
      <main className="max-w-screen-2xl mx-auto px-gutter mt-8 mb-section-padding-lg">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6" aria-label="Breadcrumb">
          <Link to={ROUTES.HOME} className="text-label-md font-label-md text-on-surface-variant hover:text-primary">Fleet</Link>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
          <Link to={ROUTES.BROWSE} className="text-label-md font-label-md text-on-surface-variant hover:text-primary">Motorcycles</Link>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
          <span className="text-label-md font-label-md text-on-surface font-semibold">{vehicle.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row gap-10">
          {/* ── Left Column ── */}
          <section className="w-full md:w-[58%]">
            {/* Title + badges */}
            <div className="flex flex-col gap-2 mb-8">
              <div className="flex items-center gap-3">
                <span className="bg-on-surface text-white px-2 py-0.5 rounded text-[12px] font-bold tracking-wider uppercase">
                  {vehicle.badge || 'LUXURY'}
                </span>
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span className="text-label-md font-label-md font-bold">Verified Owner</span>
                </div>
              </div>
              <h1 className="font-headline-lg text-headline-lg">{vehicle.name}</h1>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
                <span className="text-body-lg font-body-lg">Rajpur Road, {vehicle.city}, Uttarakhand</span>
              </div>
            </div>

            {/* Gallery */}
            <div className="relative mb-12">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant hover:border-primary transition-all group">
                  <span className="material-symbols-outlined text-primary group-hover:rotate-180 transition-transform duration-500">3d_rotation</span>
                  <span className="text-label-md font-label-md font-bold text-on-surface">3D Model</span>
                </button>
              </div>
              <div className="bg-surface p-8 rounded-xl relative overflow-hidden mb-4 min-h-[400px] flex items-center justify-center stage-gradient">
                <img
                  alt={`${vehicle.name} Main`}
                  className="w-full h-full object-contain relative z-0 transition-transform hover:scale-105 duration-700"
                  src={thumbnails[activeThumb]}
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {thumbnails.map((thumb, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveThumb(i)}
                    className={`h-24 bg-surface rounded-lg overflow-hidden cursor-pointer transition-all hover:opacity-90 ${
                      activeThumb === i ? 'border-2 border-primary' : 'border border-outline-variant hover:border-primary'
                    }`}
                  >
                    <img className="w-full h-full object-cover" src={thumb} alt={`View ${i + 1}`} />
                    {i === 3 && (
                      <div className="absolute inset-0 bg-on-surface/40 flex items-center justify-center text-white font-bold text-label-md">
                        +8 More
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-outline-variant mb-8">
              <div className="flex gap-10">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 font-medium text-body-lg transition-all ${
                      activeTab === tab
                        ? 'text-primary font-bold border-b-2 border-primary'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview Content */}
            {activeTab === 'Overview' && (
              <div className="flex flex-col gap-10">
                <div>
                  <h3 className="font-headline-sm text-headline-sm mb-4">Description</h3>
                  <p className="text-body-lg text-on-surface-variant leading-relaxed">{vehicle.description}</p>
                </div>

                {/* Spec grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
                  {[
                    { icon: 'settings_input_component', label: 'Engine', value: vehicle.cc },
                    { icon: 'speed', label: 'Mileage', value: vehicle.mileage },
                    { icon: 'ev_station', label: 'Fuel Type', value: vehicle.fuelType },
                    { icon: 'shield', label: 'ABS', value: 'Dual Channel' },
                  ].map(spec => (
                    <div key={spec.label} className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/30">
                      <span className="material-symbols-outlined text-primary mb-2 block">{spec.icon}</span>
                      <div className="text-[12px] uppercase tracking-wider font-bold text-on-surface-variant">{spec.label}</div>
                      <div className="font-bold text-on-surface">{spec.value}</div>
                    </div>
                  ))}
                </div>

                {/* Features */}
                {vehicle.features && (
                  <div>
                    <h3 className="font-headline-sm text-headline-sm mb-4">Features</h3>
                    <div className="flex flex-wrap gap-3">
                      {vehicle.features.map(f => (
                        <div key={f} className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full border border-outline-variant">
                          <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                          <span className="text-label-md font-medium">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirement */}
                <div className="bg-surface-container-low p-8 rounded-xl flex items-start gap-6 border border-outline-variant/30">
                  <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[32px]">directions_bike</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-body-lg mb-1">Rider Requirement</h4>
                    <p className="text-on-surface-variant">Requires a valid motorcycle license and a security deposit of ₹5,000 (Refundable). Minimum age 21.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Specs' && (
              <div className="space-y-6">
                <h3 className="font-headline-sm text-headline-sm mb-4">Technical Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Engine Capacity', value: vehicle.cc || '—' },
                    { label: 'Mileage', value: vehicle.mileage || '—' },
                    { label: 'Fuel Type', value: vehicle.fuelType || '—' },
                    { label: 'Year', value: vehicle.year || '—' },
                    { label: 'Transmission', value: vehicle.transmission || '—' },
                    { label: 'Cancellation Policy', value: vehicle.cancellationPolicy || 'Flexible' },
                  ].map(spec => (
                    <div key={spec.label} className="flex justify-between py-3 border-b border-outline-variant/30 text-sm">
                      <span className="text-secondary">{spec.label}</span>
                      <span className="font-bold text-on-surface">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab.startsWith('Reviews') && (
              <div id="reviews" className="space-y-6">
                <h2 className="text-lg font-bold text-on-surface mb-4">
                  Reviews {stats.total > 0 && <span className="text-secondary font-normal text-base">({stats.total})</span>}
                </h2>

                {reviewsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 rounded-2xl bg-surface-container animate-pulse" />
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-10 bg-surface-container rounded-2xl border border-outline-variant">
                    <span className="text-4xl">⭐</span>
                    <p className="font-semibold text-secondary mt-2">No reviews yet</p>
                    <p className="text-sm text-secondary/70 mt-1">Be the first to ride and review!</p>
                  </div>
                ) : (
                  <>
                    {/* Rating overview card */}
                    <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant">
                      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                        {/* Big score */}
                        <div className="flex flex-col items-center justify-center min-w-[100px]">
                          <p className="text-5xl font-black text-on-surface leading-none">
                            {stats.average}
                          </p>
                          <div className="flex gap-0.5 mt-2">
                            {[1, 2, 3, 4, 5].map(i => (
                              <span key={i} className={`text-sm ${i <= Math.round(Number(stats.average)) ? 'text-amber-400' : 'text-outline-variant'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-secondary mt-2">{stats.total} review{stats.total !== 1 ? 's' : ''}</p>
                        </div>

                        {/* Bar breakdown */}
                        <div className="flex-1 w-full space-y-2">
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = stats.breakdown[star] || 0
                            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                            return (
                              <div key={star} className="flex items-center gap-2">
                                <span className="text-xs text-secondary w-3 text-right">{star}</span>
                                <span className="text-amber-400 text-xs">★</span>
                                <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-secondary w-5 text-right">{count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Sub-ratings */}
                      {(Number(stats.cleanliness) > 0 || Number(stats.condition) > 0 || Number(stats.responsiveness) > 0) && (
                        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-outline-variant">
                          {[
                            { label: 'Cleanliness', value: stats.cleanliness, icon: '🧹' },
                            { label: 'Condition', value: stats.condition, icon: '🔧' },
                            { label: 'Owner', value: stats.responsiveness, icon: '👤' },
                          ].map(({ label, value, icon }) => (
                            <div key={label} className="text-center">
                              <p className="text-base">{icon}</p>
                              <p className="font-bold text-sm text-on-surface mt-1">
                                {Number(value).toFixed(1)} ★
                              </p>
                              <p className="text-[10px] text-secondary">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Review cards list */}
                    <div className="space-y-3 mt-4">
                      {displayedReviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>

                    {/* Show more / less */}
                    {reviews.length > 3 && (
                      <button
                        onClick={() => setShowAllReviews(!showAllReviews)}
                        className="w-full mt-4 py-3 rounded-2xl border border-outline-variant text-sm font-bold text-secondary hover:bg-surface-container transition-all"
                      >
                        {showAllReviews ? 'Show less ↑' : `Show all ${reviews.length} reviews ↓`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'Location' && (
              <div className="space-y-6">
                <h3 className="font-headline-sm text-headline-sm mb-4">Location</h3>
                <div className="flex items-center gap-2 text-secondary mb-4">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>{vehicle.location || 'Rajpur Road, Dehradun'}</span>
                </div>
                <div className="h-72 rounded-2xl overflow-hidden bg-surface-container relative border border-outline-variant">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(vehicle.location || 'Rajpur Road, Dehradun')}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    aria-hidden="false"
                    tabIndex="0"
                    title="Vehicle Location Map"
                  />
                </div>
              </div>
            )}
          </section>

          {/* ── Right Column – Booking Widget ── */}
          <aside className="w-full md:w-[42%]">
            <div className="sticky top-24">
              <div className="bg-surface-container-lowest p-8 rounded-xl soft-elevation border border-outline-variant/30">
                {/* Price */}
                <div className="flex items-end gap-2 mb-8">
                  <span className="text-headline-sm font-headline-sm text-primary font-black">₹{vehicle.dailyPrice.toLocaleString('en-IN')}</span>
                  <span className="text-on-surface-variant mb-1">/ day</span>
                  <span className="ml-auto text-label-md font-bold bg-secondary-container px-3 py-1 rounded-full text-on-secondary-container">
                    Limited Offer
                  </span>
                </div>

                {/* Date Pickers */}
                <div className="flex flex-col gap-4 mb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-label-md font-bold text-on-surface-variant uppercase">PICK UP</label>
                      <div className="h-12 bg-surface flex items-center px-4 rounded-lg border border-outline-variant/50 focus-within:border-primary">
                        <span className="material-symbols-outlined text-[20px] mr-2 text-on-surface-variant">calendar_today</span>
                        <input
                          className="text-on-surface font-medium bg-transparent border-none outline-none w-full text-sm"
                          value={pickupDate}
                          onChange={e => setPickupDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-label-md font-bold text-on-surface-variant uppercase">DROP OFF</label>
                      <div className="h-12 bg-surface flex items-center px-4 rounded-lg border border-outline-variant/50 focus-within:border-primary">
                        <span className="material-symbols-outlined text-[20px] mr-2 text-on-surface-variant">calendar_today</span>
                        <input
                          className="text-on-surface font-medium bg-transparent border-none outline-none w-full text-sm"
                          value={dropoffDate}
                          onChange={e => setDropoffDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                <div className="mb-8">
                  <h5 className="text-label-md font-bold mb-4 uppercase tracking-wider text-on-surface-variant">Optional Extras</h5>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/30 hover:bg-surface cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={helmetAddon}
                          onChange={e => setHelmetAddon(e.target.checked)}
                          className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                        />
                        <span className="font-medium">Pro-series Helmet</span>
                      </div>
                      <span className="text-on-surface-variant font-bold text-label-md">+₹200</span>
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/30 hover:bg-surface cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={insuranceAddon}
                          onChange={e => setInsuranceAddon(e.target.checked)}
                          className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                        />
                        <span className="font-medium">Full Coverage Insurance</span>
                      </div>
                      <span className="text-on-surface-variant font-bold text-label-md">+₹500</span>
                    </label>
                  </div>
                </div>

                {/* Pricing summary */}
                <div className="flex flex-col gap-3 pt-6 border-t border-outline-variant mb-8">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">₹{vehicle.dailyPrice.toLocaleString('en-IN')} x 2 days</span>
                    <span className="font-bold">₹{dailyTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {helmetAddon && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Helmet Rental</span>
                      <span className="font-bold">₹200</span>
                    </div>
                  )}
                  {insuranceAddon && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Full Insurance</span>
                      <span className="font-bold">₹500</span>
                    </div>
                  )}
                  <div className="flex justify-between text-headline-sm font-bold pt-4">
                    <span>Total Price</span>
                    <span className="text-primary">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  id="book-now-btn"
                  onClick={() => navigate(ROUTES.BOOKING(vehicle.id))}
                  className="w-full bg-primary-container text-white h-14 rounded-lg font-bold text-body-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary-container/20"
                >
                  Book Now
                </button>
              </div>

              {/* Owner mini card */}
              <div className="mt-6 bg-surface-container-low p-6 rounded-xl flex items-center gap-4 border border-outline-variant/30">
                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfM1rUKdLktSgfhyHmUPnUNZQAfVjaMqyz0SS68Wox1J22v1AaC5BB_N-ETvGUnVcdIaQLGBCFD0YeKMvdsq1KALdyHzGALk7Z060FkgOuB2E5R3VjQuyzs-rhATbcgMtvPHEHtex9pLP7IcZnwqwCvCZlfYiPVQzBGA30PsaZDeIjLVSyrAtC1DnawUiyl-5DkuNCRiqTaJUcX6GM0H8O3tv4aSQVMNv_9wQIR6BVgZtVsqxs-GJqQLrobreWC7SnPN5ronpbrzF5"
                    alt={vehicle.hostName}
                  />
                </div>
                <div className="flex-1">
                  <h6 className="font-bold">{vehicle.hostName}</h6>
                  <div className="flex items-center gap-1 text-label-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span>{vehicle.hostRating} ({vehicle.hostReviews} reviews)</span>
                  </div>
                </div>
                <button className="p-2 rounded-full border border-outline-variant hover:bg-surface transition-all">
                  <span className="material-symbols-outlined text-on-surface-variant">chat_bubble</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </PageLayout>
  )
}
