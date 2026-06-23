import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-surface-container-lowest flex items-center justify-center px-4">
      <section className="max-w-md text-center">
        <p className="text-primary-container font-black text-7xl">404</p>
        <h1 className="mt-4 text-3xl font-black text-on-surface">Page not found</h1>
        <p className="mt-3 text-secondary">
          The page you opened does not exist or has moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="h-11 px-5 rounded-xl bg-primary-container text-white font-bold flex items-center">
            Home
          </Link>
          <Link to="/support" className="h-11 px-5 rounded-xl border border-outline-variant font-bold flex items-center">
            Support
          </Link>
        </div>
      </section>
    </main>
  )
}
