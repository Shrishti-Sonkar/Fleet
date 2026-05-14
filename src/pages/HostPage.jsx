import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'

const vehicleTypes = [
  { id: 'suv', icon: 'directions_car', label: 'SUV', rate: 2800 },
  { id: 'sedan', icon: 'directions_car', label: 'Sedan', rate: 2000 },
  { id: 'bike', icon: 'motorcycle', label: 'Bike', rate: 1200 },
  { id: 'scooter', icon: 'motorcycle', label: 'Scooter', rate: 600 },
]

const wizardSteps = ['Details', 'Pricing', 'Features', 'Review']

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
  const [activeVehicleType, setActiveVehicleType] = useState('suv')
  const [daysPerMonth, setDaysPerMonth] = useState(15)
  const [wizardStep, setWizardStep] = useState(0)
  const [openFaq, setOpenFaq] = useState(0)

  // Form state
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [regNo, setRegNo] = useState('')
  const [fuelType, setFuelType] = useState('Diesel')
  const [city, setCity] = useState('')

  const selectedType = vehicleTypes.find(t => t.id === activeVehicleType)
  const estimatedEarnings = selectedType ? selectedType.rate * daysPerMonth : 0

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
                        <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Vehicle Brand & Model</label>
                        <input
                          id="vehicle-brand"
                          className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                          placeholder="e.g. Toyota Fortuner 2023"
                          type="text"
                          value={vehicleBrand}
                          onChange={e => setVehicleBrand(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Registration No.</label>
                          <input
                            id="reg-no"
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                            placeholder="UK 07 XX 0000"
                            type="text"
                            value={regNo}
                            onChange={e => setRegNo(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Fuel Type</label>
                          <select
                            id="fuel-select"
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
                      <div>
                        <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">City of Operation</label>
                        <input
                          id="city-input"
                          className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 focus:outline-none focus:border-primary transition-all"
                          placeholder="Dehradun"
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                        />
                      </div>
                    </form>
                  </div>
                  {/* Photo upload */}
                  <div className="bg-surface p-8 rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant">add_a_photo</span>
                    </div>
                    <h4 className="font-bold text-on-surface mb-2">Upload Vehicle Photos</h4>
                    <p className="text-sm text-secondary mb-6">High-resolution exterior and interior shots (Min. 5 photos)</p>
                    <button className="h-10 px-6 bg-white border border-outline text-on-surface font-semibold rounded-lg hover:bg-surface-container transition-all">
                      Browse Files
                    </button>
                  </div>
                </div>
              )}
              {wizardStep !== 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] block mb-4">construction</span>
                  <p className="font-headline-sm text-headline-sm">Step {wizardStep + 1}: {wizardSteps[wizardStep]}</p>
                  <p className="text-body-lg mt-2">Coming soon in next iteration.</p>
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
                <button
                  id="next-step-btn"
                  onClick={() => setWizardStep(s => Math.min(s + 1, wizardSteps.length - 1))}
                  className="ml-auto h-12 px-10 bg-primary-container text-white font-bold rounded-full flex items-center gap-2 hover:opacity-90 active:scale-95 duration-150"
                >
                  {wizardStep < wizardSteps.length - 1 ? (
                    <>Next Step <span className="material-symbols-outlined">arrow_forward</span></>
                  ) : (
                    <>Submit Listing <span className="material-symbols-outlined">check</span></>
                  )}
                </button>
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
