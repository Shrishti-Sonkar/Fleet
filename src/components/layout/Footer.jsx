import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="w-full py-section-padding-lg bg-surface-container-low border-t border-outline-variant">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-gutter max-w-screen-2xl mx-auto px-gutter mb-12">
        {/* Brand */}
        <div className="col-span-2 space-y-6">
          <Link to="/" className="font-headline-sm text-headline-sm font-black text-primary block">Fleet</Link>
          <p className="text-on-surface-variant max-w-xs font-body-lg text-body-lg">
            Redefining exploration in the Himalayas through autonomous, premium rentals.
          </p>
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 transition-transform">public</span>
            <span className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 transition-transform">campaign</span>
            <span className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 transition-transform">mail</span>
          </div>
        </div>

        {/* Explore */}
        <div>
          <h4 className="font-bold mb-4 font-body-lg text-body-lg text-on-surface">Explore</h4>
          <ul className="space-y-2 text-on-surface-variant font-body-lg text-body-lg">
            <li><Link to="/browse" className="hover:text-primary transition-all">Rent a Bike</Link></li>
            <li><Link to="/browse" className="hover:text-primary transition-all">Rent a Scooter</Link></li>
            <li><Link to="/browse" className="hover:text-primary transition-all">Electric Fleet</Link></li>
            <li><Link to="/browse" className="hover:text-primary transition-all">Luxury Edition</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-bold mb-4 font-body-lg text-body-lg text-on-surface">Company</h4>
          <ul className="space-y-2 text-on-surface-variant font-body-lg text-body-lg">
            <li><Link to="/about" className="hover:text-primary transition-all">About Us</Link></li>
            <li><Link to="/about" className="hover:text-primary transition-all">Careers</Link></li>
            <li><Link to="/host" className="hover:text-primary transition-all">Host with Us</Link></li>
            <li><Link to="/support" className="hover:text-primary transition-all">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-bold mb-4 font-body-lg text-body-lg text-on-surface">Support</h4>
          <ul className="space-y-2 text-on-surface-variant font-body-lg text-body-lg">
            <li><Link to="/support" className="hover:text-primary transition-all">Help Center</Link></li>
            <li><Link to="/support" className="hover:text-primary transition-all">Safety Guidelines</Link></li>
            <li><Link to="/support" className="hover:text-primary transition-all">Rental Terms</Link></li>
            <li><Link to="/support" className="hover:text-primary transition-all">Contact</Link></li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-screen-2xl mx-auto px-gutter pt-8 border-t border-outline-variant text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-on-surface-variant font-body-lg text-body-lg opacity-70">© 2024 Fleet Technologies. All rights reserved.</p>
        <div className="flex gap-8">
          <Link to="/support" className="text-on-surface-variant hover:text-primary text-label-md">Terms</Link>
          <Link to="/support" className="text-on-surface-variant hover:text-primary text-label-md">Sitemap</Link>
        </div>
      </div>
    </footer>
  )
}
