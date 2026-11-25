import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { uploadFile } from '../lib/upload'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

const EMPTY_VEHICLE = {
  name: '',
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  type: 'Bike',
  category: 'Bike',
  fuelType: 'Petrol',
  seats: '2',
  city: 'Dehradun',
  regNo: '',
  cc: '',
  mileage: '',
  useCase: 'mixed-use',
  dailyPrice: '',
  weeklyPrice: '',
  securityDeposit: '5000',
  imageUrl: '',
  description: '',
  ownerId: '',
  ownerName: '',
  status: 'active',
  available: true,
}

export default function AdminVehiclesPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null | { isNew, ...fields }
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const openCreate = () => {
    setImageFile(null)
    setEditing({ isNew: true, ...EMPTY_VEHICLE })
  }

  const openEdit = (v) => {
    setImageFile(null)
    setEditing({
      isNew: false,
      id: v.id,
      name: v.name || '',
      brand: v.brand || '',
      model: v.model || '',
      year: String(v.year || ''),
      type: v.type || 'Bike',
      category: v.category || v.type || 'Bike',
      fuelType: v.fuelType || 'Petrol',
      seats: String(v.seats || 2),
      city: v.city || 'Dehradun',
      regNo: v.regNo || '',
      cc: v.cc || '',
      mileage: v.mileage || '',
      useCase: v.useCase || 'mixed-use',
      dailyPrice: String(v.dailyPrice || ''),
      weeklyPrice: String(v.weeklyPrice || ''),
      securityDeposit: String(v.securityDeposit ?? 5000),
      imageUrl: v.imageUrl || '',
      description: v.description || '',
      ownerId: v.ownerId || '',
      ownerName: v.ownerName || v.hostName || '',
      status: v.status || 'active',
      available: v.available !== false,
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editing.name || !editing.dailyPrice) return toast.error('Vehicle name and daily price are required.')
    setSaving(true)
    try {
      const token = await user.getIdToken()
      let resolvedImageUrl = editing.imageUrl
      if (imageFile) {
        resolvedImageUrl = await uploadFile(imageFile, 'vehicles/admin')
      }
      const payload = { ...editing, imageUrl: resolvedImageUrl }
      delete payload.isNew
      delete payload.id

      if (editing.isNew) {
        await apiFetch('/api/admin/vehicles', { token, method: 'POST', body: JSON.stringify(payload) })
        toast.success('Vehicle added!')
      } else {
        await apiFetch(`/api/admin/vehicles/${editing.id}`, { token, method: 'PUT', body: JSON.stringify(payload) })
        toast.success('Vehicle updated!')
      }
      setEditing(null)
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const quickToggleStatus = async (v) => {
    try {
      const token = await user.getIdToken()
      const next = v.status === 'active' ? 'inactive' : 'active'
      await apiFetch(`/api/admin/vehicles/${v.id}`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      })
      toast.success(`Vehicle marked ${next}.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this vehicle?')) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/vehicles/${id}`, { token, method: 'DELETE' })
      toast.success('Vehicle deleted.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = vehicles.filter((v) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (v.name || '').toLowerCase().includes(q) || (v.city || '').toLowerCase().includes(q) || (v.type || '').toLowerCase().includes(q)
  })

  return (
    <AdminLayout
      title="Vehicle Catalog Management"
      subtitle="Add, edit, approve, deactivate, or delete any vehicle on the platform"
      actions={
        <button onClick={openCreate} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px]">add</span> Add Vehicle
        </button>
      }
    >
      <div className="mb-6 flex justify-between items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicles by name, city, or type..."
          className="h-11 px-4 rounded-xl bg-[#0b1120] border border-slate-800 focus:border-orange-500 text-sm text-white outline-none w-full sm:max-w-md"
        />
        <span className="text-xs text-slate-400">{filtered.length} vehicle(s)</span>
      </div>

      <div className="space-y-3">
        {filtered.map((v) => (
          <div key={v.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <img
                src={v.imageUrl || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=400'}
                alt={v.name}
                className="w-20 h-14 object-cover rounded-xl bg-slate-900 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-white text-sm truncate">{v.name}</p>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    v.status === 'active' ? 'bg-emerald-950 text-emerald-400' : v.status === 'pending' ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
                  }`}>
                    {v.status || 'active'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{v.city} • {v.type} • ₹{v.dailyPrice}/day • Owner: {v.ownerName || v.ownerId}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => quickToggleStatus(v)} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200">
                {v.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => openEdit(v)} className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-800/60 text-xs font-bold text-blue-300">
                Edit
              </button>
              <button onClick={() => handleDelete(v.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-lg text-white">{editing.isNew ? 'Add New Vehicle' : `Edit ${editing.name}`}</h3>
              <button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Name *</label>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">City</label>
                <input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Type</label>
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value, category: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                  <option>Bike</option>
                  <option>Scooter</option>
                  <option>Car</option>
                  <option>SUV</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Fuel Type</label>
                <select value={editing.fuelType} onChange={(e) => setEditing({ ...editing, fuelType: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                  <option>Petrol</option>
                  <option>Diesel</option>
                  <option>Electric</option>
                  <option>CNG</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Daily Price (₹) *</label>
                <input type="number" value={editing.dailyPrice} onChange={(e) => setEditing({ ...editing, dailyPrice: e.target.value })} required className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Security Deposit (₹)</label>
                <input type="number" value={editing.securityDeposit} onChange={(e) => setEditing({ ...editing, securityDeposit: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Owner UID</label>
                <input value={editing.ownerId} onChange={(e) => setEditing({ ...editing, ownerId: e.target.value })} placeholder="Leave blank for admin" className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Image URL</label>
                <input value={editing.imageUrl} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Or Upload Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Description</label>
              <textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Vehicle'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}
