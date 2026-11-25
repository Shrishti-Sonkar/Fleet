import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

export default function AdminVendorsPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [defaultSplit, setDefaultSplit] = useState(15)
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setUsers(list)
    })
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => {
      unsubUsers()
      unsubBookings()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    user.getIdToken().then((token) =>
      apiFetch('/api/admin/payment-settings', { token })
        .then((s) => setDefaultSplit(Number(s.platformCommissionPercent ?? 15)))
        .catch(() => {})
    )
  }, [user])

  const vendors = users.filter((u) => {
    const isVendorOrPending = ['vendor', 'owner'].includes(u.role) || u.vendorRequested
    if (!isVendorOrPending) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
  })

  const getDraft = (v) => drafts[v.id] || {
    commissionPercent: v.commissionPercent ?? '',
    razorpayAccountId: v.razorpayAccountId || '',
  }

  const setDraftField = (v, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [v.id]: { ...getDraft(v), [field]: value },
    }))
  }

  const saveVendorSplit = async (v, { resetToDefault = false, roleOverride } = {}) => {
    setSavingId(v.id)
    try {
      const token = await user.getIdToken()
      const d = getDraft(v)
      await apiFetch(`/api/admin/vendors/${v.id}/split`, {
        token,
        method: 'PUT',
        body: JSON.stringify({
          commissionPercent: resetToDefault ? null : (d.commissionPercent === '' ? null : Number(d.commissionPercent)),
          razorpayAccountId: d.razorpayAccountId,
          ...(roleOverride ? { role: roleOverride } : {}),
        }),
      })
      if (resetToDefault) {
        setDraftField(v, 'commissionPercent', '')
      }
      toast.success(resetToDefault ? 'Reset to platform default split.' : 'Vendor split configuration saved.')
    } catch (err) {
      toast.error(err.message || 'Failed to update vendor split')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminLayout
      title="Vendors & Custom Rental Splits"
      subtitle={`Set a custom platform vs. vendor payout split per vendor (Global default: ${defaultSplit}% platform / ${100 - defaultSplit}% vendor)`}
    >
      <div className="mb-6 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors by name, email, or UID..."
          className="h-11 px-4 rounded-xl bg-[#0b1120] border border-slate-800 focus:border-orange-500 text-sm text-white outline-none w-full sm:max-w-md"
        />
        <span className="text-xs text-slate-400 font-semibold">{vendors.length} vendor account(s)</span>
      </div>

      {vendors.length === 0 ? (
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          No vendor accounts or partner requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map((v) => {
            const draft = getDraft(v)
            const hasCustom = draft.commissionPercent !== '' && draft.commissionPercent !== null && draft.commissionPercent !== undefined
            const effectivePlatform = hasCustom ? Math.min(100, Math.max(0, Number(draft.commissionPercent))) : defaultSplit
            const effectiveVendor = 100 - effectivePlatform
            const vendorBookings = bookings.filter((b) => b.ownerId === v.id && b.paymentStatus === 'paid')
            const vendorRevenue = vendorBookings.reduce((s, b) => s + (b.pricing?.total || 0), 0)
            const isPending = v.vendorRequested && !['vendor', 'owner'].includes(v.role)

            return (
              <div key={v.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-extrabold text-white text-base">{v.name || 'Unnamed Partner'}</h3>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                        isPending
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {isPending ? 'Pending Approval' : v.role}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        v.commissionPercent !== undefined && v.commissionPercent !== null
                          ? 'bg-orange-950 text-orange-400 border border-orange-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {v.commissionPercent !== undefined && v.commissionPercent !== null
                          ? `Custom Split: ${v.commissionPercent}% / ${100 - v.commissionPercent}%`
                          : `Default Split: ${defaultSplit}% / ${100 - defaultSplit}%`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{v.email} {v.phone ? `• ${v.phone}` : ''} • UID: <span className="font-mono text-slate-500">{v.id}</span></p>
                    <p className="text-xs text-slate-500 mt-1">
                      Paid Bookings: <strong className="text-slate-300">{vendorBookings.length}</strong> • Gross Volume: <strong className="text-emerald-400">₹{vendorRevenue.toLocaleString('en-IN')}</strong>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {isPending ? (
                      <button
                        onClick={() => saveVendorSplit(v, { roleOverride: 'vendor' })}
                        disabled={savingId === v.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                      >
                        Approve Vendor
                      </button>
                    ) : (
                      <button
                        onClick={() => saveVendorSplit(v, { roleOverride: 'renter' })}
                        disabled={savingId === v.id}
                        className="px-3 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 font-bold rounded-xl text-xs"
                      >
                        Revoke Vendor
                      </button>
                    )}
                  </div>
                </div>

                {/* Split Controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-800/80 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                      Platform Commission % (0–100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={draft.commissionPercent}
                      onChange={(e) => setDraftField(v, 'commissionPercent', e.target.value)}
                      placeholder={`Default (${defaultSplit}%)`}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-orange-500 text-sm text-white outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <div className="h-10 px-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Vendor Receives:</span>
                      <span className="font-extrabold text-emerald-400">{effectiveVendor}%</span>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                      Razorpay Route Account ID
                    </label>
                    <input
                      type="text"
                      value={draft.razorpayAccountId}
                      onChange={(e) => setDraftField(v, 'razorpayAccountId', e.target.value)}
                      placeholder="acc_XXXXXXXXXX"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-orange-500 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 flex gap-2">
                    <button
                      onClick={() => saveVendorSplit(v)}
                      disabled={savingId === v.id}
                      className="flex-1 h-10 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs disabled:opacity-50"
                    >
                      {savingId === v.id ? 'Saving...' : 'Save Split'}
                    </button>
                    {v.commissionPercent !== undefined && v.commissionPercent !== null && (
                      <button
                        onClick={() => saveVendorSplit(v, { resetToDefault: true })}
                        disabled={savingId === v.id}
                        className="h-10 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                        title="Revert to global platform default"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
