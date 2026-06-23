import { useState } from 'react'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'

const categories = [
  { icon: 'help', label: 'General Questions' },
  { icon: 'directions_car', label: 'Vehicle & Rentals' },
  { icon: 'payments', label: 'Payments & Refunds' },
  { icon: 'security', label: 'Insurance & Safety' },
]

const faqs = [
  { q: 'How do I cancel a booking?', a: 'You can cancel up to 24 hours before pickup for a full refund. Within 24 hours, 50% of the rental fee is charged.' },
  { q: 'What documents do I need?', a: 'A valid Driving License and a Government ID (Aadhaar, Passport). For bikes above 350cc, a valid gear endorsement is required.' },
  { q: 'Is there a security deposit?', a: 'Fleet uses a zero-deposit model for most vehicles. Some premium vehicles may require a refundable security deposit of up to ₹10,000.' },
  { q: 'What happens in case of an accident?', a: 'Fleet vehicles are covered by our comprehensive insurance. Call our 24/7 support line immediately and we will guide you through the process.' },
]

export default function SupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <PageLayout>
      {/* Hero */}
      <section className="py-section-padding-lg bg-surface text-center">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <h1 className="font-headline-md text-headline-md mb-4">How can we help you?</h1>
          <p className="text-secondary font-body-lg text-body-lg max-w-xl mx-auto mb-10">
            Our support team is available 24/7 to make sure your ride is smooth from start to finish.
          </p>
          <div className="relative max-w-lg mx-auto">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[24px]">search</span>
            <input
              id="support-search"
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-body-lg font-body-lg shadow-premium"
              placeholder="Search help articles..."
              type="text"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-screen-2xl mx-auto px-gutter grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(cat => (
            <button
              key={cat.label}
              className="flex flex-col items-center gap-3 py-8 rounded-xl border border-outline-variant bg-white hover:border-primary hover:shadow-premium transition-all group"
            >
              <span className="material-symbols-outlined text-[36px] text-secondary group-hover:text-primary transition-colors">{cat.icon}</span>
              <span className="font-medium text-on-surface text-label-md">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* FAQ + Contact */}
      <section className="py-section-padding-lg">
        <div className="max-w-screen-2xl mx-auto px-gutter grid lg:grid-cols-2 gap-16">
          {/* FAQ */}
          <div>
            <h2 className="font-headline-sm text-headline-sm mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="border border-outline-variant rounded-xl p-6 cursor-pointer hover:border-primary transition-all"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-on-surface pr-4">{faq.q}</h4>
                    <span className={`material-symbols-outlined text-secondary shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </div>
                  {openFaq === i && (
                    <p className="mt-4 text-secondary leading-relaxed">{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-surface-container-lowest p-10 rounded-xl shadow-premium border border-outline-variant">
            {sent ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-green-600 text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm mb-2">Message Sent!</h3>
                <p className="text-secondary">Our team will get back to you within 1 business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="font-headline-sm text-headline-sm mb-6">Get in Touch</h3>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Full Name</label>
                  <input
                    id="contact-name"
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                    placeholder="Rahul Sharma"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Email</label>
                  <input
                    id="contact-email"
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all"
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant mb-2 uppercase">Message</label>
                  <textarea
                    id="contact-message"
                    className="w-full h-32 p-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Describe your issue in detail..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  id="contact-submit"
                  className="w-full h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
                >
                  Send Message
                </button>
                <div className="flex items-center justify-center gap-6 pt-4">
                  <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[18px]">call</span>
                    +91 1800-222-FLEET
                  </div>
                  <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                    help@fleet.in
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </PageLayout>
  )
}
