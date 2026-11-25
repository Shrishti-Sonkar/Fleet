import { useEffect, useState } from 'react'

const DEFAULT_CONFIG = {
  supportEmail: 'help@fleet.in',
  supportPhone: '+91 98765 43210',
  gstRate: 0.18,
  platformFee: 99,
  announcementEnabled: false,
  announcementText: '',
  heroTitle: '',
  heroSubtitle: '',
  footerTagline: 'Redefining exploration in the Himalayas through autonomous, premium rentals.',
  cities: ['Dehradun', 'Mussoorie', 'Rishikesh'],
}

let cachedConfig = null

export function useSiteConfig() {
  const [config, setConfig] = useState(cachedConfig || DEFAULT_CONFIG)

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/site-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          const merged = { ...DEFAULT_CONFIG, ...data }
          cachedConfig = merged
          setConfig(merged)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return config
}
