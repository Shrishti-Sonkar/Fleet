import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

export default function AdminCouponsPage() {
  const { user } = useAuth()
  const [coupons, setCoupons] = useState([])
  const [code, setCode] = useState('')
  const [type, setType] = useState('percent')
  const [discount, setDiscount] = useState('')
  const [minAmount, setMinAmount] = useState('')

  useEffect(() => {
    return onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const saveCoupon = async (e) => {
    e.preventDefault()
    const id = code.trim().toUpperCase()
    if (!id || !discount) return toast.error('Coupon code and discount are required.')
    try {
      await setDoc(doc(db, 'coupons', id), {
        active: true,
        type,
        discount: Number(discount),
        minAmount: Number(minAmount || 0),
        description: type === 'percent' ? `${discount}% off` : `₹${discount} off`,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setCode('')
      setDiscount('')
      setMinAmount('')
      toast.success(`Coupon ${id} saved.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const toggleActive = async (c) => {
    await updateDoc(doc(db, 'coupons', c.id), { active: !c.active })
    toast.success(`Coupon ${c.id} ${c.active ? 'deactivated' : 'activated'}.`)
  }

  const deleteCoupon = async (id) => {
    if (!window.confirm(`Delete coupon ${id}?`)) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/coupons/${id}`, { token, method: 'DELETE' })
      toast.success('Coupon deleted.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <AdminLayout title="Coupon Management" subtitle="Create, edit, toggle, or delete promotional discount codes">
      <form onSubmit={saveCoupon} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. FLEET20)" className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white uppercase" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
          <option value="percent">Percent (%)</option>
          <option value="fixed">Flat (₹)</option>
        </select>
        <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" placeholder="Discount value" className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
        <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} type="number" placeholder="Min order (₹)" className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
        <button className="h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm">Save Coupon</button>
      </form>

      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">No coupons created yet.</div>
        ) : coupons.map((c) => (
          <div key={c.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-white text-base">{c.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${c.active ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {c.type === 'percent' ? `${c.discount}% off` : `₹${c.discount} off`} • Min order ₹{c.minAmount || 0}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setCode(c.id); setType(c.type || 'percent'); setDiscount(String(c.discount)); setMinAmount(String(c.minAmount || 0)) }} className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-800/60 text-blue-300 text-xs font-bold">
                Edit
              </button>
              <button onClick={() => toggleActive(c)} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">
                {c.active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => deleteCoupon(c.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
