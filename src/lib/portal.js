/**
 * Determines which portal the application should render based on domain/subdomain:
 *   - `admin.*` (e.g. `admin.fleetmobilities.in`, `admin.fleetmobilities.info`) -> `'admin'`
 *   - `fleetmobilities.info` or `vendor.*`                                     -> `'vendor'`
 *   - `fleetmobilities.in` (default)                                           -> `'customer'`
 *
 * Also supports `/admin` path access on the primary domain and local dev overrides:
 *   - `?portal=admin` / `?portal=vendor` / `?portal=customer`
 *   - `VITE_PORTAL_MODE=admin|vendor|customer`
 */
const PORTAL_STORAGE_KEY = 'fleet_portal_mode'

export function isAdminPath() {
  if (typeof window === 'undefined') return false
  const p = window.location.pathname
  return p === '/admin' || p.startsWith('/admin/')
}

export function getPortalMode() {
  if (typeof window === 'undefined') {
    const envMode = import.meta.env.VITE_PORTAL_MODE
    return ['admin', 'vendor', 'customer'].includes(envMode) ? envMode : 'customer'
  }

  const host = window.location.hostname.toLowerCase()

  if (host.startsWith('admin.')) {
    return 'admin'
  }

  if (
    host === 'fleetmobilities.info' ||
    host.endsWith('.fleetmobilities.info') ||
    host.startsWith('vendor.')
  ) {
    return 'vendor'
  }

  if (host === 'fleetmobilities.in' || host.endsWith('.fleetmobilities.in')) {
    return isAdminPath() ? 'admin' : 'customer'
  }

  try {
    const params = new URLSearchParams(window.location.search)
    const override = params.get('portal')
    if (['admin', 'vendor', 'customer'].includes(override)) {
      window.sessionStorage.setItem(PORTAL_STORAGE_KEY, override)
      return override
    }
    if (isAdminPath()) return 'admin'
    const stored = window.sessionStorage.getItem(PORTAL_STORAGE_KEY)
    if (['admin', 'vendor', 'customer'].includes(stored)) {
      return stored
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts
  }

  const envMode = import.meta.env.VITE_PORTAL_MODE
  return ['admin', 'vendor', 'customer'].includes(envMode) ? envMode : 'customer'
}

export function isVendorPortal() {
  return getPortalMode() === 'vendor'
}

export function isAdminPortal() {
  return getPortalMode() === 'admin'
}
