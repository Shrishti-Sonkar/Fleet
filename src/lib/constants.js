export const ROUTES = {
  HOME: '/',
  SPLASH: '/splash',
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
  WALLET: '/wallet',
  MY_BOOKINGS: '/my-bookings',
  WISHLIST: '/wishlist',
  DASHBOARD: '/dashboard',
  ADD_VEHICLE: '/add-vehicle',
  ADMIN: '/admin',

  // Vendor routes
  VENDOR_HOME: '/vendor',
  VENDOR_DASHBOARD: '/vendor/dashboard',
  VENDOR_ADD: '/vendor/add-vehicle',
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
