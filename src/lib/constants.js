export const ROUTES = {
  HOME: '/',
  SPLASH: '/splash',
  LOGIN: '/login',
  BROWSE: '/browse',
  HOST: '/host',
  ABOUT: '/about',
  SUPPORT: '/support',

  VEHICLE_DETAIL: (id = ':id') => `/vehicle/${id}`,
  BOOKING: (id = ':id') => `/booking/${id}`,
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
}

export const BOOKING_STATUS = {
  UPCOMING: 'Upcoming Ride',
  ACTIVE: 'Active Ride',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}