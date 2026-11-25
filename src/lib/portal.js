/**
 * Determines whether the application is running in Customer Marketplace mode
 * (`fleetmobilities.in`) or Standalone Vendor Partner Portal mode
 * (`fleetmobilities.info` or `vendor.*` subdomains).
 *
 * In local development, you can also switch portals via:
 *   - `?portal=vendor` / `?portal=customer` query parameter (persisted per tab)
 *   - `vendor.localhost` hostname
 *   - `VITE_PORTAL_MODE=vendor` environment variable
 */
const PORTAL_STORAGE_KEY = 'fleet_portal_mode'

export function getPortalMode() {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_PORTAL_MODE === 'vendor' ? 'vendor' : 'customer'
  }

  const host = window.location.hostname.toLowerCase()

  if (
    host === 'fleetmobilities.info' ||
    host.endsWith('.fleetmobilities.info') ||
    host.startsWith('vendor.')
  ) {
    return 'vendor'
  }

  if (host === 'fleetmobilities.in' || host.endsWith('.fleetmobilities.in')) {
    return 'customer'
  }

  try {
    const params = new URLSearchParams(window.location.search)
    const override = params.get('portal')
    if (override === 'vendor' || override === 'customer') {
      window.sessionStorage.setItem(PORTAL_STORAGE_KEY, override)
      return override
    }
    const stored = window.sessionStorage.getItem(PORTAL_STORAGE_KEY)
    if (stored === 'vendor' || stored === 'customer') {
      return stored
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts
  }

  return import.meta.env.VITE_PORTAL_MODE === 'vendor' ? 'vendor' : 'customer'
}

export function isVendorPortal() {
  return getPortalMode() === 'vendor'
}
