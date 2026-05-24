import PageLayout from '@/components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import { Link } from 'react-router-dom'

import HowItWorks from '../components/sections/HowItWorks'
import PopularVehicles from '../components/sections/PopularVehicles'
import PromoBanner from '../components/sections/PromoBanner'
import ActiveBookingCard from '../components/sections/ActiveBookingCard'
import { mockCities } from '../data/mockVehicles'
import { useVehicles } from '../hooks/useVehicles'
import { ROUTES } from '@/lib/constants'
import HeroSection from '@/components/sections/HeroSection'

export default function HomePage() {
  const { vehicles } = useVehicles()
  const featuredVehicles = vehicles.slice(0, 4)

  return (
    <PageLayout>
      <HeroSection />

      {/* Active Booking Card (shows only when user has an active/pending booking) */}
      <ActiveBookingCard />

      {/* Promo Banner */}
      <section className="py-6 bg-surface">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <PromoBanner />
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Popular Vehicles */}
      <PopularVehicles vehicles={featuredVehicles} />

      {/* Cities (Dark) */}
      <section className="py-section-padding-lg bg-[#111111] text-white">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <div className="flex flex-col items-center text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-white/10 text-white rounded-full font-label-md text-label-md font-bold tracking-wide uppercase mb-4">
              Explore Uttarakhand
            </span>
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

      {/* Why Fleet */}
      <section className="py-section-padding-lg bg-surface-container-lowest">
        <div className="max-w-screen-2xl mx-auto px-gutter grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-md text-headline-md mb-6">Why Fleet is the preferred choice</h2>
            <p className="text-on-surface-variant font-body-lg text-body-lg mb-8">
              We've built an ecosystem that prioritizes the rider's experience and the host's peace of mind.
            </p>
            <div className="grid grid-cols-2 gap-8">
              {[
                { icon: 'verified',       title: 'Zero Deposit',   desc: 'Rent without the heavy upfront security deposits.'           },
                { icon: 'support_agent',  title: '24/7 Roadside',  desc: 'Stuck on a hill? Our support team is just a call away.'     },
                { icon: 'payments',       title: 'Flexible Pricing',desc: 'Hourly, daily, and weekly rates tailored for you.'         },
                { icon: 'eco',            title: 'Eco-Friendly',   desc: 'The largest fleet of electric scooters in the North.'       },
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

      {/* Social Proof */}
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
                  <p className="text-on-surface-variant">Average rating from 12,000+ reviews across App Store &amp; Play Store.</p>
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

      {/* Host Banner */}
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
                to={ROUTES.HOST}
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
