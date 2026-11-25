import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

const EMPTY_BOOKING = {
  vehicleId: '',
  renterId: '',
  pickupDate: '',
  dropoffDate: '',
  totalAmount: '',
  amountPaid: '0',
  status: 'pending',
  paymentStatus: 'pending',
}

export default function AdminBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (s) =>
      setBookings(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    const u2 = onSnapshot(collection(db, 'vehicles'), (s) => setVehicles(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const u3 = onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2(); u3() }
  }, [])

  const openCreate = () => setEditing({ isNew: true, ...EMPTY_BOOKING })

  const openEdit = (b) =>
    setEditing({
      isNew: false,
      id: b.id,
      bookingId: b.bookingId || b.id,
      vehicleName: b.vehicleName || '',
      renterName: b.renterName || '',
      pickupDate: b.pickupDate || '',
      dropoffDate: b.dropoffDate || '',
      totalAmount: String(b.pricing?.total ?? ''),
      amountPaid: String(b.amountPaid ?? 0),
      status: b.status || 'pending',
      paymentStatus: b.paymentStatus || 'pending',
      transferStatus: b.splitDetails?.transferStatus || '',
    })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = await user.getIdToken()
      if (editing.isNew) {
        await apiFetch('/api/admin/bookings', { token, method: 'POST', body: JSON.stringify(editing) })
        toast.success('Booking created!')
      } else {
        await apiFetch(`/api/admin/bookings/${editing.id}`, { token, method: 'PUT', body: JSON.stringify(editing) })
        toast.success('Booking updated!')
      }
      setEditing(null)
    } catch (err) {
      toast.error(err.message || 'Failed to save booking')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking record permanently?')) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/bookings/${id}`, { token, method: 'DELETE' })
      toast.success('Booking deleted.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const visible = bookings.filter((b) => (filter === 'all' ? true : b.status === filter))

  return (
    <AdminLayout
      title="Bookings Management"
      subtitle="Create, edit status/payment, or remove any booking"
      actions={
        <button onClick={openCreate} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px]">add</span> Create Booking
        </button>
      }
    >
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'approved', 'active', 'completed', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${
              filter === tab ? 'bg-orange-600 text-white' : 'bg-[#0b1120] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          No bookings found.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => (
            <div key={b.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono font-bold text-orange-400 text-xs">{b.bookingId || b.id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 uppercase">{b.status}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 uppercase">{b.paymentStatus || 'pending'}</span>
                </div>
                <p className="font-bold text-white text-sm">{b.vehicleName} • {b.renterName}</p>
                <p className="text-xs text-slate-400">{b.pickupDate} → {b.dropoffDate} • Total: ₹{(b.pricing?.total || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(b)} className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-800/60 text-xs font-bold text-blue-300">
                  Edit
                </button>
                <button onClick={() => handleDelete(b.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-lg text-white">
                {editing.isNew ? 'Create Manual Booking' : `Edit ${editing.bookingId}`}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {editing.isNew && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Vehicle *</label>
                  <select value={editing.vehicleId} onChange={(e) => setEditing({ ...editing, vehicleId: e.target.value })} required className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} (₹{v.dailyPrice}/d)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Renter *</label>
                  <select value={editing.renterId} onChange={(e) => setEditing({ ...editing, renterId: e.target.value })} required className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                    <option value="">Select user</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Pickup Date</label>
                <input type="date" value={editing.pickupDate} onChange={(e) => setEditing({ ...editing, pickupDate: e.target.value })} required={editing.isNew} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Dropoff Date</label>
                <input type="date" value={editing.dropoffDate} onChange={(e) => setEditing({ ...editing, dropoffDate: e.target.value })} required={editing.isNew} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Booking Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Payment Status</label>
                <select value={editing.paymentStatus} onChange={(e) => setEditing({ ...editing, paymentStatus: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                  <option value="pending">pending</option>
                  <option value="token_paid">token_paid</option>
                  <option value="paid">paid</option>
                  <option value="pay_on_pickup">pay_on_pickup</option>
                  <option value="refund_pending">refund_pending</option>
                  <option value="refunded">refunded</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Total Amount (₹)</label>
                <input type="number" value={editing.totalAmount} onChange={(e) => setEditing({ ...editing, totalAmount: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Amount Paid (₹)</label>
                <input type="number" value={editing.amountPaid} onChange={(e) => setEditing({ ...editing, amountPaid: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Booking'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}
