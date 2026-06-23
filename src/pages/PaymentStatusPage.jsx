import { Link, useLocation } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'

export default function PaymentStatusPage() {
  const { pathname } = useLocation()
  const success = pathname.includes('success')

  return (
    <PageLayout showBottomBar={false}>
      <main className="min-h-[70vh] bg-surface-container-lowest flex items-center justify-center px-4 py-16">
        <section className="w-full max-w-md bg-white border border-outline-variant rounded-2xl p-8 text-center shadow-soft">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {success ? 'check_circle' : 'error'}
            </span>
          </div>
          <h1 className="mt-6 text-2xl font-black text-on-surface">
            {success ? 'Payment received' : 'Payment failed'}
          </h1>
          <p className="mt-3 text-secondary leading-relaxed">
            {success
              ? 'Your payment has been captured. Check My Bookings for vendor approval and ride status.'
              : 'Your booking was not completed. Please retry or contact support if money was deducted.'}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link to="/my-bookings" className="h-11 rounded-xl bg-primary-container text-white font-bold flex items-center justify-center">
              My Bookings
            </Link>
            <Link to="/support" className="h-11 rounded-xl border border-outline-variant font-bold flex items-center justify-center">
              Support
            </Link>
          </div>
        </section>
      </main>
    </PageLayout>
  )
}
