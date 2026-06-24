// Lightweight, free geo helpers (no API). Vehicles currently store a `city`;
// we map that to a center coordinate and add a tiny deterministic jitter so
// multiple vehicles in the same city don't render on the exact same pixel.

export const CITY_COORDS = {
  Dehradun: { lat: 30.3165, lng: 78.0322 },
  Mussoorie: { lat: 30.4599, lng: 78.0664 },
  Rishikesh: { lat: 30.0869, lng: 78.2676 },
}

// Center of Uttarakhand-ish — fallback when a city isn't recognized.
export const DEFAULT_CENTER = { lat: 30.3165, lng: 78.0322 }

// Deterministic pseudo-random offset (±~0.01°, ~1km) seeded by a string id,
// so the same vehicle always lands in the same spot.
function jitterFromId(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const dx = ((h % 1000) / 1000 - 0.5) * 0.02
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 0.02
  return { dx, dy }
}

/**
 * Resolve a vehicle's map coordinates.
 * Prefers explicit lat/lng; otherwise uses the city center + jitter.
 * Returns null if no location can be determined.
 */
export function vehicleCoords(vehicle) {
  if (!vehicle) return null
  const lat = Number(vehicle.lat)
  const lng = Number(vehicle.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { lat, lng }
  }
  const base = CITY_COORDS[vehicle.city]
  if (!base) return null
  const { dx, dy } = jitterFromId(vehicle.id || vehicle.name || '')
  return { lat: base.lat + dy, lng: base.lng + dx }
}
