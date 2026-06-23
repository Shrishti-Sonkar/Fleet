import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'

const vehicleTypes = [
  { id: 'suv', icon: 'directions_car', label: 'SUV', rate: 2800 },
  { id: 'sedan', icon: 'directions_car', label: 'Sedan', rate: 2000 },
  { id: 'bike', icon: 'motorcycle', label: 'Bike', rate: 1200 },
  { id: 'scooter', icon: 'motorcycle', label: 'Scooter', rate: 600 },
]

const wizardSteps = ['Details', 'Pricing', 'Features', 'Review']
const availableFeatures = ['ABS', 'GPS', 'Bluetooth', 'USB Charger', 'Keyless Entry', 'Helmet Included', 'Cruise Control']

const faqItems = [
  {
    q: 'Is my vehicle insured during the trip?',
    a: 'Yes, Fleet provides end-to-end insurance coverage for every booking. Your personal insurance remains untouched, and our premium policy covers third-party liabilities and vehicle damage.',
  },
  { q: 'Who can rent my car?', a: 'Verified Fleet users aged 21+ with a valid driving license can book your vehicle. We run background checks on all renters.' },
  { q: 'What are the eligibility criteria?', a: 'Your vehicle must be less than 10 years old, pass a Fleet inspection, and have comprehensive insurance.' },
  { q: 'How do I get paid?', a: 'Earnings are transferred directly to your bank account every Tuesday via NEFT/IMPS.' },
]

export default function HostPage() {
  const { user, userDoc, isRenter } = useAuth()
  const navigate = useNavigate()

  // ── Renter gate: redirect renters to switch role ──────────────────────────
  const [activeVehicleType, setActiveVehicleType] = useState('suv')
  const [daysPerMonth, setDaysPerMonth] = useState(15)
  const [wizardStep, setWizardStep] = useState(0)
  const [openFaq, setOpenFaq] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1 Form state
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [regNo, setRegNo] = useState('')
  const [fuelType, setFuelType] = useState('Diesel')
  const [city, setCity] = useState('')
  const [vehicleCategory, setVehicleCategory] = useState('SUV')

  // Step 2 Form state
  const [cc, setCc] = useState('')
  const [seats, setSeats] = useState('5')
  const [mileage, setMileage] = useState('')
  const [dailyPrice, setDailyPrice] = useState('')
  const [securityDeposit, setSecurityDeposit] = useState('5000')

  // Step 3 Form state
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState([])
  const [imageUrl, setImageUrl] = useState('')

  const selectedType = vehicleTypes.find(t => t.id === activeVehicleType)
  const estimatedEarnings = selectedType ? selectedType.rate * daysPerMonth : 0

  const toggleFeature = (feat) => {
    setFeatures(prev => prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat])
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in to list a vehicle.')
      return
    }
    if (!vehicleBrand || !dailyPrice || !city) {
      toast.error('Please complete all required fields.')
      return
    }

    setSaving(true)
    try {
      const typeMap = { 'SUV': 'Car', 'Sedan': 'Car', 'Hatchback': 'Car', 'Bike': 'Bike', 'Scooter': 'Scooter' }
      const finalType = typeMap[vehicleCategory] || 'Car'

      await addDoc(collection(db, 'vehicles'), {
        name: vehicleBrand,
        regNo,
        type: finalType,
        category: vehicleCategory,
        fuelType,
        city,
        cc,
        seats: Number(seats),
        mileage,
        dailyPrice: Number(dailyPrice),
        securityDeposit: Number(securityDeposit),
        description,
        features,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=2070&auto=format&fit=crop',
        status: 'pending',
        available: true,
        ownerId: user.uid,
        hostName: userDoc?.name || user.displayName || 'New Host',
        hostRating: 5.0,
        hostReviews: 0,
        createdAt: serverTimestamp()
      })
      toast.success('Vehicle submitted successfully! Awaiting approval.')
      navigate('/vendor/dashboard')
    } catch (err) {
      toast.error('Failed to submit listing: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (user && isRenter) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-xs">
          <div className="text-4xl font-black text-black mb-6">Fleet</div>
          <h2 className="text-xl font-black text-black mb-2">Want to earn with Fleet?</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Switch to Vendor mode to list your vehicle and start earning on Fleet. You can switch back anytime.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-black text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-gray-900 active:scale-95 transition-all"
          >
            Switch to Vendor in Profile
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 text-sm text-gray-400 hover:text-black transition-colors py-2"
          >
            Back to browsing
          </button>
        </div>
      </div>
    )
  }
  return (
    <PageLayout>
      {/* ── Hero ── */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden bg-white">
        <div className="max-w-screen-2xl mx-auto px-gutter grid lg:grid-cols-2 gap-12 items-center w-full py-section-padding-lg">
          <div className="z-10">
            <span className="inline-block px-4 py-1 bg-primary-fixed text-on-primary-fixed rounded-full text-label-md font-label-md mb-6 uppercase tracking-wider">
              Host with Fleet
            </span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6">Turn your vehicle into income</h1>
            <p className="font-body-lg text-body-lg text-secondary max-w-lg mb-8">
              Join the elite fleet of hosts in Dehradun and Mussoorie. Earn up to ₹85,000 per month by sharing your luxury SUV or sedan with verified premium travelers.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                id="list-car-btn"
                onClick={() => document.getElementById('list-wizard').scrollIntoView({ behavior: 'smooth' })}
                className="h-12 px-8 bg-primary-container text-white rounded-full font-semibold hover:opacity-90 active:scale-95 duration-150 shadow-lg shadow-primary-container/20"
              >
                List Your Car
              </button>
              <button
                id="calc-earnings-btn"
                onClick={() => document.getElementById('earnings-calc').scrollIntoView({ behavior: 'smooth' })}
                className="h-12 px-8 bg-white border border-outline-variant text-on-surface rounded-full font-semibold hover:bg-surface-container transition-all"
              >
                Calculate Earnings
              </button>
            </div>
          </div>
          <div className="relative h-[400px] lg:h-[500px]">
            <div className="absolute inset-0 stage-floor rounded-full scale-150 blur-3xl opacity-60" />
            <img
              alt="Luxury vehicle"
              className="relative z-10 w-full h-full object-contain transform hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDA5J5t00QV1PEaoajqytiPR-1djny7TzlzDoqow-S85-GB4NFzfbdsauu4-JYGVJ5C-l1mzjDUU6o_7NWQfZkM8u_RvG3hCeCqnIZx0jxBeGjwzl8aXIi6rRMAfw4WHQ84DxbjZjsWPVJrvUQtOeDyCL1hPTx9spy-uYSZ1ofo-n1m5QBbhyGVvdqbYW8UKuXD019O9eY9OUaKnu2Ge1_Nhcyj4HJJyklUIUsHN_js3tXrhS_FHZotGb9LoejYt77WOMms6aYDYtb0"
            />
          </div>
        </div>
      </section>

      {/* ── Earnings Calculator ── */}
      <section id="earnings-calc" className="bg-surface py-section-padding-lg">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="text-center mb-16">
            <h2 className="font-headline-md text-headline-md text-on-surface">Maximize your asset value</h2>
            <p className="font-body-lg text-body-lg text-secondary mt-4">Estimate your monthly earnings based on vehicle type and availability.</p>
          </div>
          <div className="bg-white rounded-xl shadow-premium p-8 md:p-12 max-w-4xl mx-auto border border-surface-container-high">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-10">
                {/* Vehicle type */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-4 uppercase">Vehicle Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    {vehicleTypes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveVehicleType(t.id)}
                        className={`px-4 py-3 rounded-lg border-2 font-semibold flex items-center justify-center gap-2 transition-all ${
                          activeVehicleType === t.id
                            ? 'border-primary bg-primary-fixed text-on-primary-fixed'
                            : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                        }`}
                      >
                        <span className="material-symbols-outlined">{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days slider */}
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase">Days Per Month</label>
                    <span className="font-bold text-primary">{daysPerMonth} Days</span>
                  </div>
                  <input
                    id="days-slider"
                    className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary-container"
                    max="30"
                    min="1"
                    type="range"
                    value={daysPerMonth}
                    onChange={e => setDaysPerMonth(Number(e.target.value))}
                  />
                  <div className="flex justify-between mt-2 text-xs text-secondary">
                    <span>1 Day</span>
                    <span>30 Days</span>
                  </div>
                </div>
              </div>

              {/* Earnings display */}
              <div className="bg-primary-container p-10 rounded-xl text-white text-center">
                <p className="text-label-md uppercase opacity-80 font-medium mb-2">Estimated Earnings</p>
                <h3 className="text-[56px] font-black leading-none mb-4">₹{estimatedEarnings.toLocaleString('en-IN')}</h3>
                <p className="text-body-lg opacity-90 mb-8">per month at ₹{selectedType?.rate.toLocaleString('en-IN')}/day</p>
                <button
                  id="start-listing-btn"
                  onClick={() => document.getElementById('list-wizard').scrollIntoView({ behavior: 'smooth' })}
                  className="w-full h-12 bg-white text-primary font-bold rounded-lg hover:bg-surface-container-low transition-all"
                >
                  Start Listing
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-section-padding-lg">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="text-center mb-16">
            <h2 className="font-headline-md text-headline-md text-on-surface">Seamless three-step setup</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
            <div className="hidden md:block absolute top-1/4 left-[20%] right-[20%] h-[2px] border-t-2 border-dashed border-outline-variant z-0" />
            {[
              { icon: 'edit_note', title: '1. List Vehicle', desc: 'Provide details, upload crisp photos, and set your availability schedule.' },
              { icon: 'verified_user', title: '2. Get Verified', desc: 'Our team performs a quick inspection to ensure premium quality standards.' },
              { icon: 'payments', title: '3. Earn Weekly', desc: 'Accept bookings and receive direct payouts every Tuesday to your account.' },
            ].map(s => (
              <div key={s.title} className="relative z-10 text-center">
                <div className="w-16 h-16 bg-primary-fixed text-primary rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                  <span className="material-symbols-outlined text-3xl">{s.icon}</span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-3">{s.title}</h4>
                <p className="text-secondary text-body-lg">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Listing Wizard ── */}
      <section id="list-wizard" className="bg-surface-container-low py-section-padding-lg">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="bg-white rounded-xl overflow-hidden shadow-premium max-w-5xl mx-auto border border-outline-variant">
            {/* Wizard progress */}
            <div className="flex border-b border-outline-variant">
              {wizardSteps.map((label, i) => (
                <div
                  key={label}
                  onClick={() => setWizardStep(i)}
                  className={`flex-1 py-6 px-4 text-center relative cursor-pointer transition-all ${
                    wizardStep === i ? 'bg-primary-container text-white' : 'text-on-surface-variant opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="text-xs font-bold uppercase mb-1">Step {i + 1}</div>
                  <div className="font-semibold text-sm">{label}</div>
                  {wizardStep === i && <div className="absolute bottom-0 left-0 w-full h-1 bg-white" />}
                </div>
              ))}
            </div>

            <div className="p-8 md:p-12">
              {wizardStep === 0 && (
                <div className="grid md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Tell us about your ride</h3>
                    <p className="text-secondary mb-8">The more detail you provide, the faster travelers will book your vehicle.</p>
                    <form className="space-y-6">
                      <div>
                        <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Vehicle Brand & Model <span className="text-error">*</span></label>
                        <input
                          className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                          placeholder="e.g. Toyota Fortuner 2023"
                          type="text"
                          value={vehicleBrand}
                          onChange={e => setVehicleBrand(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Category</label>
                          <select
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            value={vehicleCategory}
                            onChange={e => setVehicleCategory(e.target.value)}
                          >
                            <option>SUV</option>
                            <option>Sedan</option>
                            <option>Hatchback</option>
                            <option>Bike</option>
                            <option>Scooter</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Fuel Type</label>
                          <select
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            value={fuelType}
                            onChange={e => setFuelType(e.target.value)}
                          >
                            <option>Diesel</option>
                            <option>Petrol</option>
                            <option>Electric</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">City <span className="text-error">*</span></label>
                          <input
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="Dehradun"
                            type="text"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Registration No.</label>
                          <input
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="UK 07 XX 0000"
                            type="text"
                            value={regNo}
                            onChange={e => setRegNo(e.target.value)}
                          />
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="bg-surface p-8 rounded-xl border border-outline-variant flex flex-col justify-center text-center">
                    <span className="material-symbols-outlined text-[64px] text-primary/20 mb-4">directions_car</span>
                    <h4 className="font-bold mb-2">Step 1: Basics</h4>
                    <p className="text-secondary text-sm">Add the fundamental details of your vehicle so renters know exactly what they are booking.</p>
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="grid md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Pricing & Specifications</h3>
                    <form className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Daily Price (₹) <span className="text-error">*</span></label>
                          <input
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="2500"
                            type="number"
                            value={dailyPrice}
                            onChange={e => setDailyPrice(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Security Deposit (₹)</label>
                          <input
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="5000"
                            type="number"
                            value={securityDeposit}
                            onChange={e => setSecurityDeposit(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Engine/CC</label>
                          <input
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="e.g. 1998cc"
                            type="text"
                            value={cc}
                            onChange={e => setCc(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Seats</label>
                          <input
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="5"
                            type="number"
                            value={seats}
                            onChange={e => setSeats(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Mileage</label>
                          <input
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="15 kmpl"
                            type="text"
                            value={mileage}
                            onChange={e => setMileage(e.target.value)}
                          />
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="bg-surface p-8 rounded-xl border border-outline-variant flex flex-col justify-center text-center">
                    <span className="material-symbols-outlined text-[64px] text-primary/20 mb-4">payments</span>
                    <h4 className="font-bold mb-2">Competitive Pricing</h4>
                    <p className="text-secondary text-sm">Vehicles priced within 10% of the market average are booked 3x more often.</p>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="grid md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Features & Photos</h3>
                    <form className="space-y-6">
                      <div>
                        <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Description</label>
                        <textarea
                          className="w-full h-24 bg-surface border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-all resize-none"
                          placeholder="Describe your vehicle's condition and any special instructions..."
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-label-md font-label-md text-on-surface-variant mb-3 uppercase">Key Features</label>
                        <div className="flex flex-wrap gap-3">
                          {availableFeatures.map(feat => (
                            <div
                              key={feat}
                              onClick={() => toggleFeature(feat)}
                              className={`px-4 py-2 rounded-full border cursor-pointer text-sm font-medium transition-all ${
                                features.includes(feat)
                                  ? 'bg-primary-fixed border-primary text-on-primary-fixed'
                                  : 'border-outline-variant hover:border-primary/50'
                              }`}
                            >
                              {feat}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Image URL</label>
                        <input
                          className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                          placeholder="https://example.com/car-image.jpg"
                          type="text"
                          value={imageUrl}
                          onChange={e => setImageUrl(e.target.value)}
                        />
                        <p className="text-xs text-secondary mt-2">Leave blank to use a placeholder image.</p>
                      </div>
                    </form>
                  </div>
                  <div className="bg-surface p-8 rounded-xl border border-outline-variant flex flex-col justify-center text-center">
                    <div className="w-full h-32 bg-surface-container rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-secondary">image</span>
                      )}
                    </div>
                    <h4 className="font-bold mb-2">Image Preview</h4>
                    <p className="text-secondary text-sm">High-quality images significantly increase your booking rate.</p>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Review & Submit</h3>
                  <div className="bg-surface border border-outline-variant rounded-xl p-8 max-w-3xl mx-auto">
                    <div className="flex items-center gap-6 mb-8 border-b border-outline-variant pb-6">
                      <div className="w-24 h-24 bg-surface-container rounded-lg overflow-hidden shrink-0">
                        <img
                          src={imageUrl || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=2070&auto=format&fit=crop'}
                          alt="Vehicle"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-headline-sm">{vehicleBrand || 'Unnamed Vehicle'}</h4>
                        <p className="text-secondary">{vehicleCategory} • {fuelType}</p>
                        <p className="text-primary font-bold mt-1">₹{dailyPrice || '0'}/day</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                      <div>
                        <p className="text-xs text-secondary uppercase">City</p>
                        <p className="font-bold">{city || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary uppercase">Reg No</p>
                        <p className="font-bold">{regNo || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary uppercase">Engine</p>
                        <p className="font-bold">{cc || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary uppercase">Security Deposit</p>
                        <p className="font-bold">₹{securityDeposit || '0'}</p>
                      </div>
                    </div>

                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg flex gap-3 text-sm">
                      <span className="material-symbols-outlined shrink-0 text-yellow-600">info</span>
                      <p>By submitting this listing, you agree to our Host Terms of Service. Your vehicle will be reviewed by our team before becoming active.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-12 flex justify-between">
                {wizardStep > 0 && (
                  <button
                    onClick={() => setWizardStep(s => s - 1)}
                    className="h-12 px-8 border border-outline-variant text-on-surface font-bold rounded-full flex items-center gap-2 hover:bg-surface-container transition-all"
                  >
                    <span className="material-symbols-outlined">arrow_back</span> Back
                  </button>
                )}
                {wizardStep < wizardSteps.length - 1 ? (
                  <button
                    onClick={() => setWizardStep(s => Math.min(s + 1, wizardSteps.length - 1))}
                    className="ml-auto h-12 px-10 bg-primary-container text-white font-bold rounded-full flex items-center gap-2 hover:opacity-90 active:scale-95 duration-150"
                  >
                    Next Step <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="ml-auto h-12 px-10 bg-primary text-white font-bold rounded-full flex items-center gap-2 hover:opacity-90 active:scale-95 duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Submitting...' : <>Submit Listing <span className="material-symbols-outlined">check</span></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-section-padding-lg">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="text-center mb-16">
            <h2 className="font-headline-md text-headline-md text-on-surface">Frequently Asked Questions</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((faq, i) => (
              <div
                key={i}
                className="border border-outline-variant rounded-xl p-6 hover:border-primary transition-colors cursor-pointer group"
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-on-surface">{faq.q}</h4>
                  <span className={`material-symbols-outlined text-secondary group-hover:text-primary transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
                {openFaq === i && faq.a && (
                  <p className="mt-4 text-secondary leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </PageLayout>
  )
}
