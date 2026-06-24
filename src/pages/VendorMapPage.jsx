import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '@/lib/constants'
import { vehicleCoords, DEFAULT_CENTER } from '../lib/geo'
import TopNavBar from '../components/layout/TopNavBar'
import VendorNav from '../components/VendorNav'

// Custom pin (avoids Leaflet's broken default marker-image paths under bundlers).
function pinIcon(available) {
  const color = available ? '#10b981' : '#94a3b8'
  return L.divIcon({
    className: 'fleet-pin',
    html: `<div style="position:relative;width:30px;height:38px">
      <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.7 23.3 0 15 0z" fill="${color}"/>
        <circle cx="15" cy="15" r="6" fill="white"/>
      </svg>
    </div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  })
}

export default function VendorMapPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'vehicles'), where('ownerId', '==', user.uid))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('Vendor map vehicles error:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [user])

  // Attach resolved coordinates; drop vehicles with no determinable location.
  const located = useMemo(
    () =>
      vehicles
        .map((v) => ({ ...v, coords: vehicleCoords(v) }))
        .filter((v) => v.coords),
    [vehicles],
  )

  const center = located[0]?.coords || DEFAULT_CENTER
  const availableCount = located.filter((v) => v.available).length

  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <TopNavBar />

      <main className="max-w-2xl mx-auto px-4 pt-[84px] pb-8 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Fleet Map</p>
            <h1 className="text-2xl font-black text-slate-900 mt-0.5">Where your vehicles are</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {located.length} on map · <span className="text-emerald-600 font-semibold">{availableCount} available</span>
            </p>
          </div>
          <Link
            to={ROUTES.VENDOR_DASHBOARD}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Fleet
          </Link>
        </div>

        {loading ? (
          <div className="h-[60vh] rounded-2xl bg-white border border-slate-100 animate-pulse" />
        ) : located.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <span className="mb-3 block text-4xl">🗺️</span>
            <p className="mb-1 font-semibold text-slate-700">No vehicles to show yet</p>
            <p className="mb-4 text-sm text-slate-400">Add a vehicle with a city to see it on the map.</p>
            <Link
              to={ROUTES.VENDOR_ADD}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Vehicle
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={11}
              scrollWheelZoom
              style={{ height: '62vh', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {located.map((v) => (
                <Marker key={v.id} position={[v.coords.lat, v.coords.lng]} icon={pinIcon(v.available)}>
                  <Popup>
                    <div className="min-w-[160px]">
                      {v.imageUrl && (
                        <img src={v.imageUrl} alt={v.name} className="w-full h-20 object-cover rounded-md mb-2" />
                      )}
                      <p className="font-bold text-slate-900 text-sm">{v.name}</p>
                      <p className="text-xs text-slate-500">{v.city} · ₹{v.dailyPrice}/day</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {v.available ? 'Available' : 'Booked'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </main>

      <VendorNav />
    </div>
  )
}
