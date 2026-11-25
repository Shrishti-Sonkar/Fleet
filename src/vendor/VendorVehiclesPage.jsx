import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import VendorLayout from './VendorLayout'
import toast from 'react-hot-toast'

export default function VendorVehiclesPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'vehicles'), where('ownerId', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  const toggleAvailability = async (vehicleId, current) => {
    try {
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        available: !current,
        updatedAt: serverTimestamp(),
      })
      toast.success('Availability updated.')
    } catch (err) {
      toast.error('Failed to update: ' + err.message)
    }
  }

  const handleDelete = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to remove this vehicle listing?')) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/vehicles/${vehicleId}`, { token, method: 'DELETE' })
      toast.success('Vehicle listing deleted.')
    } catch (err) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  return (
    <VendorLayout title="My Vehicle Fleet" subtitle="Manage availability, rates, and listings across your fleet">
      <div className="flex justify-between items-center mb-6">
        <p className="text-xs text-slate-400">Total {vehicles.length} vehicle(s) listed</p>
        <Link
          to="/vehicles/new"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> Add Vehicle
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 bg-[#0e1424] border border-slate-800 rounded-2xl">
          <span className="material-symbols-outlined text-6xl text-slate-600 mb-3 block">directions_car</span>
          <p className="text-slate-400 font-bold text-base">No vehicles listed yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Start earning by listing your luxury SUV, sedan, scooter, or bike on Fleet.
          </p>
          <Link
            to="/vehicles/new"
            className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs"
          >
            Create First Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-[#0e1424] border border-slate-800 rounded-2xl overflow-hidden flex flex-col group">
              <div className="relative h-48 bg-slate-900 overflow-hidden">
                <img
                  src={v.imageUrl || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=2070'}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span
                  className={`absolute top-3 right-3 text-[10px] font-extrabold px-3 py-1 rounded-full backdrop-blur-md ${
                    v.available
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {v.available ? 'AVAILABLE' : 'RENTED / BUSY'}
                </span>
                <span className="absolute bottom-3 left-3 bg-slate-950/80 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold">
                  {v.category || v.type}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-white">{v.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{v.city || 'Dehradun'} • {v.fuelType || 'Petrol'} • {v.seats || 5} Seats</p>

                  <div className="grid grid-cols-2 gap-2 my-4 bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Daily Rate</span>
                      <span className="font-extrabold text-blue-400">₹{v.dailyPrice}/day</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Deposit</span>
                      <span className="font-extrabold text-white">₹{v.securityDeposit || 5000}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => toggleAvailability(v.id, v.available)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                      v.available
                        ? 'border-amber-800/50 bg-amber-950/30 text-amber-400 hover:bg-amber-950/60'
                        : 'border-emerald-800/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60'
                    }`}
                  >
                    {v.available ? 'Mark Busy' : 'Mark Available'}
                  </button>

                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 border border-slate-800 hover:border-rose-900 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
                    title="Delete listing"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </VendorLayout>
  )
}
