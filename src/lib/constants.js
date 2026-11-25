export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  BROWSE: '/browse',
  HOST: '/host',
  ABOUT: '/about',
  SUPPORT: '/support',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  REFUND_POLICY: '/refund-policy',
  CANCELLATION_POLICY: '/cancellation-policy',
  INSURANCE_POLICY: '/insurance-policy',
  SAFETY: '/safety',
  CONTACT: '/contact',
  VERIFY: '/verify',
  PROFILE: '/profile',
  MY_BOOKINGS: '/my-bookings',
  WISHLIST: '/wishlist',
  DASHBOARD: '/dashboard',
  ADD_VEHICLE: '/add-vehicle',
  ADMIN: '/admin',

  // Vendor routes
  VENDOR_HOME: '/vendor',
  VENDOR_DASHBOARD: '/vendor/dashboard',
  VENDOR_ADD: '/vendor/add-vehicle',
  VENDOR_HANDOVER: '/vendor/handover',
  VENDOR_MAP: '/vendor/map',
  VENDOR_EARNINGS: '/vendor/earnings',
  VENDOR_PAYOUTS: '/vendor/payouts',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_COUPONS: '/admin/coupons',
  ADMIN_SETTINGS: '/admin/settings',

  VEHICLE_DETAIL: (id = ':id') => `/vehicle/${id}`,
  BOOKING: (id = ':id') => `/booking/${id}`,
  BOOKING_DETAIL: (id = ':id') => `/booking-details/${id}`,
  ACTIVE_RIDE: (id = ':bookingId') => `/ride/${id}`,
}

export const APP_CONFIG = {
  APP_NAME: 'Fleet',
  CURRENCY: '₹',
  DEFAULT_CITY: 'Dehradun',
  GST_RATE: 0.18,
  PLATFORM_FEE: 99,
}

export const VEHICLE_CATEGORIES = [
  'All',
  'Bike',
  'Scooty',
  'Car',
  'EV',
  'Luxury',
]

// Use cases describe what a renter wants the vehicle for. Hosts pick one when
// listing, and renters can filter the catalogue by it.
export const USE_CASES = [
  { id: 'adventure', label: 'Adventure', icon: 'landscape', desc: 'Off-road trips & mountain expeditions' },
  { id: 'daily-commute', label: 'Daily Commute', icon: 'commute', desc: 'City rides, work & errands' },
  { id: 'mixed-use', label: 'Mixed Use', icon: 'tune', desc: 'A versatile bit of everything' },
  { id: 'long-term', label: 'Long Term Rental', icon: 'event_repeat', desc: 'Extended stays & monthly rentals' },
]

export const RENTAL_TYPES = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  MONTHLY: 'monthly',
}

export const BOOKING_STATUS = {
  UPCOMING: 'Upcoming Ride',
  ACTIVE: 'Active Ride',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}
