import { Link, useLocation } from 'react-router-dom'

export default function TopNavBar() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/browse', label: 'Browse' },
    { to: '/host', label: 'List Vehicle' },
    { to: '/about', label: 'About' },
    { to: '/support', label: 'Support' },
  ]

  return (
    <header className="fixed top-0 w-full h-[68px] border-b border-outline-variant bg-surface-container-lowest z-50">
      <nav className="flex items-center justify-between px-gutter max-w-screen-2xl mx-auto h-full">
        {/* Logo */}
        <div className="flex items-center gap-12">
          <Link to="/" className="font-headline-sm text-headline-sm font-black text-primary">
            Fleet
          </Link>
          {/* Desktop nav links */}
          <div className="hidden md:flex gap-8 items-center">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-body-lg text-body-lg font-medium transition-colors duration-200 py-5 ${
                  isActive(link.to)
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-on-surface hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hidden md:block">language</span>
          <Link
            to="/login"
            className="font-medium text-on-surface hover:text-primary transition-colors font-body-lg text-body-lg"
          >
            Sign In
          </Link>
          <Link
            to="/browse"
            className="bg-primary-container text-white px-6 py-2 rounded-full font-bold scale-95 duration-150 active:opacity-80 transition-all font-body-lg text-body-lg hover:opacity-90"
          >
            Rent Now
          </Link>
        </div>
      </nav>
    </header>
  )
}
