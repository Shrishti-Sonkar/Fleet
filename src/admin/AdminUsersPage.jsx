import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

const EMPTY_USER = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'renter',
  kycStatus: 'not_submitted',
  commissionPercent: '',
  razorpayAccountId: '',
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const openCreate = () => setEditing({ isNew: true, ...EMPTY_USER })
  const openEdit = (u) =>
    setEditing({
      isNew: false,
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'renter',
      kycStatus: u.kycStatus || 'not_submitted',
      commissionPercent: u.commissionPercent ?? '',
      razorpayAccountId: u.razorpayAccountId || '',
    })

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editing.name || !editing.email) return toast.error('Name and email are required.')
    setSaving(true)
    try {
      const token = await user.getIdToken()
      const payload = { ...editing }
      delete payload.isNew
      delete payload.id
      if (editing.isNew) {
        await apiFetch('/api/admin/users', { token, method: 'POST', body: JSON.stringify(payload) })
        toast.success('User created!')
      } else {
        await apiFetch(`/api/admin/users/${editing.id}`, { token, method: 'PUT', body: JSON.stringify(payload) })
        toast.success('User updated!')
      }
      setEditing(null)
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (uid) => {
    if (!window.confirm('Delete this user account and profile permanently?')) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/users/${uid}`, { token, method: 'DELETE' })
      toast.success('User deleted.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && (u.role || 'renter') !== roleFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
  })

  return (
    <AdminLayout
      title="Users Management"
      subtitle="Create, edit roles/KYC/splits, or delete user accounts"
      actions={
        <button onClick={openCreate} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px]">person_add</span> Add User
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-3 justify-between items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, or UID..."
          className="h-11 px-4 rounded-xl bg-[#0b1120] border border-slate-800 focus:border-orange-500 text-sm text-white outline-none w-full sm:max-w-md"
        />
        <div className="flex gap-2">
          {['all', 'renter', 'vendor', 'owner', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${
                roleFilter === r ? 'bg-orange-600 text-white' : 'bg-[#0b1120] border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-bold text-white text-sm">{u.name || 'Unnamed'}</p>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  u.role === 'admin' ? 'bg-orange-950 text-orange-400' : ['vendor', 'owner'].includes(u.role) ? 'bg-blue-950 text-blue-400' : 'bg-slate-800 text-slate-300'
                }`}>
                  {u.role || 'renter'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                  KYC: {(u.kycStatus || 'not_submitted').replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(u)} className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-800/60 text-xs font-bold text-blue-300">
                Edit
              </button>
              <button onClick={() => handleDelete(u.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-lg text-white">{editing.isNew ? 'Add New User' : `Edit ${editing.name}`}</h3>
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
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email *</label>
                <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} required className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              {editing.isNew && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Initial Password</label>
                  <input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} placeholder="Auto-generated if empty" className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Phone</label>
                <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Role</label>
                <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                  <option value="renter">renter</option>
                  <option value="vendor">vendor</option>
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">KYC Status</label>
                <select value={editing.kycStatus} onChange={(e) => setEditing({ ...editing, kycStatus: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                  <option value="not_submitted">not_submitted</option>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Vendor Split % (blank = default)</label>
                <input type="number" min="0" max="100" value={editing.commissionPercent} onChange={(e) => setEditing({ ...editing, commissionPercent: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Razorpay Account ID</label>
                <input value={editing.razorpayAccountId} onChange={(e) => setEditing({ ...editing, razorpayAccountId: e.target.value })} placeholder="acc_XXXX" className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}
