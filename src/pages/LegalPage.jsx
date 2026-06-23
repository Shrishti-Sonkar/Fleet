import { Link, useLocation } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'

const pages = {
  '/terms': {
    title: 'Terms and Conditions',
    intro: 'These terms define how renters, vendors, and Fleet operate safely on the platform.',
    sections: [
      ['Eligibility', 'Users must be at least 18 years old. Renters must hold a valid driving license suitable for the booked vehicle.'],
      ['Bookings', 'A booking is confirmed only after successful payment and vendor approval. Fleet may cancel bookings that violate safety, fraud, or document rules.'],
      ['Host responsibilities', 'Hosts must list accurate vehicle details, maintain valid insurance and registration, and hand over vehicles in roadworthy condition.'],
      ['Renter responsibilities', 'Renters must follow traffic laws, avoid misuse, return vehicles on time, and report damage or incidents immediately.'],
      ['Platform role', 'Fleet provides marketplace, payment, KYC, and support workflows. Fleet may moderate listings, users, and transactions to protect the marketplace.'],
    ],
  },
  '/privacy': {
    title: 'Privacy Policy',
    intro: 'Fleet collects only the data needed to verify users, process bookings, and keep rentals safe.',
    sections: [
      ['Data we collect', 'Account details, contact information, KYC documents, booking history, payment references, vehicle details, and support messages.'],
      ['How we use data', 'We use data for authentication, fraud prevention, KYC review, booking operations, notifications, support, and legal compliance.'],
      ['Document storage', 'KYC and vehicle documents should be stored in protected Firebase Storage paths with access limited to the user and authorized admins.'],
      ['Sharing', 'Relevant booking details are shared between renter and vendor. Payment processing is handled by Razorpay.'],
      ['Retention', 'Operational records are retained as needed for tax, dispute, safety, and regulatory purposes.'],
    ],
  },
  '/refund-policy': {
    title: 'Refund Policy',
    intro: 'Refunds depend on booking status, cancellation time, and payment settlement state.',
    sections: [
      ['Before vendor approval', 'Eligible cancellations should receive a full rental refund after payment gateway settlement.'],
      ['Within 24 hours of pickup', 'A cancellation fee may apply based on Fleet cancellation rules and vendor preparation cost.'],
      ['Active rides', 'Active rides are generally not refundable except verified breakdown, safety, or platform fault cases.'],
      ['Processing time', 'Approved refunds typically take 5 to 7 business days after payment provider processing.'],
    ],
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy',
    intro: 'Cancellation rules protect both renters and vendors from last-minute disruption.',
    sections: [
      ['Renter cancellation', 'Renters can cancel from My Bookings. The refund estimate should be shown before final confirmation.'],
      ['Vendor rejection', 'If a vendor rejects a pending request, the vehicle is released and refund workflow begins.'],
      ['No-show', 'No-show cases may be treated as non-refundable after the pickup window closes.'],
      ['Platform cancellation', 'Fleet may cancel unsafe, fraudulent, duplicate, or policy-breaking bookings.'],
    ],
  },
  '/insurance-policy': {
    title: 'Insurance and Damage Policy',
    intro: 'Fleet rentals need clear responsibility rules for accident, damage, theft, and misuse cases.',
    sections: [
      ['Coverage', 'Vehicle insurance details must be verified before listings are activated. Optional protection add-ons can reduce renter liability.'],
      ['Damage reporting', 'Renters and vendors must report damage with photos, time, location, and incident details.'],
      ['Exclusions', 'Rash driving, intoxication, off-route misuse, illegal use, and unreported incidents may void protection.'],
      ['Claims', 'Fleet support should coordinate documentation, inspection, claim status, and payable deductions.'],
    ],
  },
  '/safety': {
    title: 'Safety Guidelines',
    intro: 'Safety is the operating standard for every Fleet trip.',
    sections: [
      ['Before pickup', 'Verify renter identity, inspect the vehicle, record photos, and confirm the start OTP.'],
      ['During ride', 'Use helmets and seatbelts, follow speed limits, and keep emergency contacts available.'],
      ['Dropoff', 'Confirm the dropoff PIN only after vehicle inspection and fuel/condition check.'],
      ['Emergency', 'Use the ride report flow and contact Fleet support immediately after accidents, breakdowns, or safety concerns.'],
    ],
  },
  '/contact': {
    title: 'Contact Fleet',
    intro: 'Reach Fleet support for booking, payout, KYC, refund, and safety issues.',
    sections: [
      ['Support email', 'help@fleet.in'],
      ['Phone', '+91 1800-222-FLEET'],
      ['Escalations', 'For payment, accident, or KYC escalation, include your booking ID, user email, and relevant screenshots.'],
    ],
  },
}

export default function LegalPage() {
  const { pathname } = useLocation()
  const page = pages[pathname] || pages['/terms']

  return (
    <PageLayout showBottomBar={false}>
      <main className="bg-surface-container-lowest">
        <section className="max-w-4xl mx-auto px-4 py-14">
          <Link to="/support" className="text-primary-container font-bold text-sm">Back to Support</Link>
          <h1 className="mt-5 text-3xl md:text-5xl font-black text-on-surface">{page.title}</h1>
          <p className="mt-4 text-lg text-secondary leading-relaxed">{page.intro}</p>
          <div className="mt-10 space-y-4">
            {page.sections.map(([title, body]) => (
              <section key={title} className="border border-outline-variant rounded-xl p-6 bg-white">
                <h2 className="text-lg font-bold text-on-surface">{title}</h2>
                <p className="mt-2 text-secondary leading-relaxed">{body}</p>
              </section>
            ))}
          </div>
          <p className="mt-8 text-sm text-secondary">
            Last updated: June 3, 2026. Replace this template with final legal counsel-approved copy before public launch.
          </p>
        </section>
      </main>
      <Footer />
    </PageLayout>
  )
}
