import { Link } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import SearchWidget from '../components/sections/SearchWidget'
import VehicleCard from '../components/sections/VehicleCard'
import { mockVehicles, mockCities } from '../data/mockVehicles'

const featuredVehicles = mockVehicles.slice(0, 4)

export default function HomePage() {
  return (
    <PageLayout>
      {/* ── Section 1: Hero ── */}
      <section className="relative min-h-[870px] flex items-center bg-surface-container-lowest overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-gutter grid md:grid-cols-12 items-center gap-12 w-full">
          {/* Left content */}
          <div className="md:col-span-6 space-y-8 z-10 py-12">
            <div className="inline-block px-4 py-1.5 bg-primary-fixed text-on-primary-fixed rounded-full font-label-md text-label-md font-bold tracking-wide uppercase">
              INDIA'S FASTEST-GROWING RENTAL PLATFORM
            </div>
            <h1 className="font-display text-display leading-tight">
              Rent. Ride. Repeat.{' '}
              <span className="text-primary">Explore the Himalayas</span> on your own terms.
            </h1>

            <SearchWidget />

            {/* Trust row */}
            <div className="flex flex-wrap gap-4 items-center opacity-80">
              {[
                { icon: 'verified_user', label: 'Verified Hosts' },
                { icon: 'speed', label: 'Instant Booking' },
                { icon: 'security', label: 'Fully Insured' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high rounded-full">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {item.icon}
                  </span>
                  <span className="text-label-md font-label-md">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right – hero image */}
          <div className="md:col-span-6 relative h-[600px] flex items-center justify-center">
            <div className="absolute inset-0 rounded-full blur-3xl opacity-10 bg-primary" />
            <div className="relative w-full h-full flex items-center justify-center perspective-1000">
              <div className="bg-surface-container w-4/5 h-[20px] absolute bottom-1/4 rounded-[100%] opacity-20 blur-xl" />
              <img
                alt="Luxury Motorcycle"
                className="w-full h-auto object-contain drop-shadow-2xl z-10 rotate-y-12"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlFTsemsAE3PvgrWne188Q_eHfFfvpyQU-Rypj4BFHMRYRUbga_TmOrwXFe_Xulk5PL6Ae_ELT-_y7gY6nE5RCA8b8Kxq3lVVz_8TgBLlG6e_LLrJU4wVQ-1ziHlW7IXoEv3KcZCJg5Wk8TGHGZB6xfbL1SUUo704PRMEUUSwg2cMP4VIFcLC7HPtwnepE9PHZA3wCsP0d9T9wTIwE5IX4o3DSXXA5pImSxY3dqjZvF06KAV7j25yftGQ5mrh50XjGOe0ZyqoBWhZO"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: How it works ── */}
      <section className="py-section-padding-lg bg-surface">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="text-center mb-16">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Rent in 3 steps</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
          </div>
          <div className="relative grid md:grid-cols-3 gap-12 text-center">
            <div className="hidden md:block absolute top-1/4 left-1/4 right-1/4 h-[2px] border-t-2 border-dashed border-outline-variant -z-0" />
            {[
              { icon: 'search', title: 'Search', desc: 'Pick your location and find the perfect ride from our curated fleet.' },
              { icon: 'lock_clock', title: 'Book', desc: 'Verify your ID and make a secure payment to confirm your booking.' },
              { icon: 'motorcycle', title: 'Ride', desc: 'Pick up the keys from the host and start your Himalayan adventure.' },
            ].map(step => (
              <div key={step.title} className="relative z-10 group">
                <div className="w-20 h-20 bg-surface-container-lowest shadow-premium rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-[32px]">{step.icon}</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm mb-2">{step.title}</h3>
                <p className="text-on-surface-variant font-body-lg text-body-lg">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Popular Vehicles ── */}
      <section className="py-section-padding-lg bg-surface-container-lowest">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Ride what the locals love</h2>
              <p className="text-on-surface-variant font-body-lg text-body-lg">Our top picks for the week in Uttarakhand.</p>
            </div>
            <Link to="/browse" className="flex items-center gap-2 text-primary font-bold hover:underline">
              View All <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="flex gap-gutter overflow-x-auto pb-8 snap-x no-scrollbar">
            {featuredVehicles.map(v => (
              <div key={v.id} className="min-w-[280px] snap-start">
                <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-premium group">
                  <div className="bg-surface-container-low rounded-lg h-40 mb-4 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                    <img
                      alt={v.name}
                      className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                      src={v.imageUrl}
                      loading="lazy"
                    />
                    {v.badge === 'Popular' && (
                      <div className="absolute top-2 left-2 bg-on-surface text-surface-lowest px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        Popular
                      </div>
                    )}
                  </div>
                  <h4 className="font-headline-sm text-[20px] mb-1">{v.name}</h4>
                  <div className="flex items-center gap-1 text-on-surface-variant text-label-md mb-4">
                    <span className="material-symbols-outlined text-[16px]">
                      {v.fuelType === 'Electric' ? 'ev_station' : 'bolt'}
                    </span>
                    {v.category} • {v.cc}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-outline-variant">
                    <div>
                      <span className="font-black text-on-surface text-headline-sm">₹{v.dailyPrice.toLocaleString('en-IN')}</span>
                      <span className="text-on-surface-variant text-label-md">/day</span>
                    </div>
                    <Link to={`/vehicle/${v.id}`} className="bg-primary-container p-2 rounded-lg text-white hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined">add</span>
                    </Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Cities (Dark) ── */}
      <section className="py-section-padding-lg bg-[#111111] text-white">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="font-headline-md text-headline-md mb-4">Pick up from the Peaks</h2>
            <p className="text-on-surface-variant opacity-60 font-body-lg text-body-lg max-w-2xl">
              Currently dominating the roads of Uttarakhand. Coming soon to other hill stations across India.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-gutter">
            {mockCities.map(city => (
              <div key={city.name} className="relative h-[400px] rounded-2xl overflow-hidden group">
                <img
                  alt={city.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src={city.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3 className="font-headline-sm text-headline-sm mb-1">{city.name}</h3>
                  <p className="text-white/60 text-label-md">{city.vehicleCount}+ Vehicles Available</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Why Fleet ── */}
      <section className="py-section-padding-lg bg-surface-container-lowest">
        <div className="max-w-screen-2xl mx-auto px-gutter grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-md text-headline-md mb-6">Why Fleet is the preferred choice</h2>
            <p className="text-on-surface-variant font-body-lg text-body-lg mb-8">
              We've built an ecosystem that prioritizes the rider's experience and the host's peace of mind.
            </p>
            <div className="grid grid-cols-2 gap-8">
              {[
                { icon: 'verified', title: 'Zero Deposit', desc: 'Rent without the heavy upfront security deposits.' },
                { icon: 'support_agent', title: '24/7 Roadside', desc: 'Stuck on a hill? Our support team is just a call away.' },
                { icon: 'payments', title: 'Flexible Pricing', desc: 'Hourly, daily, and weekly rates tailored for you.' },
                { icon: 'eco', title: 'Eco-Friendly', desc: 'The largest fleet of electric scooters in the North.' },
              ].map(item => (
                <div key={item.title} className="space-y-3">
                  <span className="material-symbols-outlined text-primary text-[32px]">{item.icon}</span>
                  <h4 className="font-bold text-body-lg">{item.title}</h4>
                  <p className="text-on-surface-variant text-label-md">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
              <img
                alt="Riding experience"
                className="rounded-2xl shadow-2xl relative z-10"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPso8oedBHupjKdKCv8qO7hLd8a8Re1XhgxqzSfZjF_2Hc0FLLW82lCvuQCzsjZC1cKAku1Hs4Y8swd4IYjNytaFp_0GoyEtQN75b3ZWRLhRFj7SAK2boLxEt7tY4Nf7_sD83vV94MSXpelOSLC7_yXjgzAGnDXYh_RtK1k_fq9QT5iOP53vGMx5sJ-Q_Us6lkMKWVVAnDxQyhw1mDqHOGIyeVh2hUUsq0ccQhjXQyPVKRweyCJmbsxsEZ-QXsaDWWXIruN_5VURIN"
              />
              <div className="absolute -bottom-8 -right-8 bg-surface-container-lowest p-6 rounded-2xl shadow-premium z-20 border border-outline-variant max-w-[240px]">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-primary-fixed p-2 rounded-full">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div className="font-black text-headline-sm">15k+</div>
                </div>
                <p className="text-label-md text-on-surface-variant font-medium">Happy riders exploring the hills monthly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Social Proof ── */}
      <section className="py-section-padding-lg bg-surface">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-4">
              <div className="space-y-8">
                <div>
                  <div className="text-primary font-black text-[56px] leading-none">4.8/5</div>
                  <div className="flex gap-1 text-primary my-2">
                    {['star', 'star', 'star', 'star', 'star_half'].map((s, i) => (
                      <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{s}</span>
                    ))}
                  </div>
                  <p className="text-on-surface-variant">Average rating from 12,000+ reviews across App Store & Play Store.</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="font-black text-headline-sm">500+</div>
                    <p className="text-label-md text-on-surface-variant">Active Hosts</p>
                  </div>
                  <div>
                    <div className="font-black text-headline-sm">2k+</div>
                    <p className="text-label-md text-on-surface-variant">Vehicles</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-8">
              <div className="bg-surface-container-lowest p-10 rounded-3xl shadow-premium border border-outline-variant relative">
                <span className="material-symbols-outlined text-primary/10 text-[120px] absolute top-4 right-8 select-none">format_quote</span>
                <div className="relative z-10">
                  <p className="font-headline-sm text-[24px] italic text-on-surface mb-8">
                    "Renting a Himalayan from Fleet was the best decision for my Solo trip. The bike was brand new, the pickup was seamless, and the host in Dehradun was extremely helpful with route tips!"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container rounded-full overflow-hidden">
                      <img
                        alt="User"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkdTfdudfLzUcNEIsMXAKOmoh6UEXjOkq4oWiINHtCtIMyOb-COTaXsS1xArOINN1hdhcqVO8fys4m0GF2UBUjsyVtDXTlTECzPBIKy6HqwLnmf_g5Ix3DVFd95r3KyFOGdVy7WdRQjGhdp1wh-5Mjm9pT1WIIqFNBqfRtcJn4gLXp2AjklYe-kwcTM8N1R6ImA2_fFSCYfD9l8lrIgHYmIkl5n4ILYIULK_ZjB4ttGSDZhZ5F6zL2PNjPkUM2cSvHD-XmEgemzxoQ"
                      />
                    </div>
                    <div>
                      <h5 className="font-bold text-on-surface">Arjun Mehta</h5>
                      <p className="text-label-md text-on-surface-variant">Travel Photographer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: Host Banner ── */}
      <section className="py-16">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="bg-primary-container rounded-[40px] p-12 md:p-20 relative overflow-hidden text-white flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-[100px] -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-on-primary-container rounded-full blur-[100px] -ml-48 -mb-48" />
            </div>
            <div className="relative z-10 max-w-xl">
              <h2 className="font-display text-[48px] leading-tight mb-6">Earn up to ₹30,000/mo by hosting.</h2>
              <p className="font-body-lg text-body-lg mb-8 opacity-90">
                Have an idle bike or scooter? List it on Fleet and let your vehicle pay for itself. We handle the insurance and verification.
              </p>
              <Link
                to="/host"
                className="inline-block bg-on-primary-container text-primary-container px-10 py-4 rounded-xl font-black hover:scale-105 transition-transform text-body-lg"
              >
                Get Started as Host
              </Link>
            </div>
            <div className="relative z-10 w-full max-w-sm hidden md:block">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold">Earnings Calculator</span>
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
                <div className="space-y-4">
                  <div className="h-2 bg-white/20 rounded-full">
                    <div className="w-3/4 h-full bg-white rounded-full" />
                  </div>
                  <div className="flex justify-between text-label-md">
                    <span>Royal Enfield Classic</span>
                    <span className="font-black">₹1,200/day</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </PageLayout>
  )
}
