import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { useLocation } from 'react-router-dom'
import { db } from '../lib/firebase'
import PageLayout from '../components/layout/PageLayout'
import toast from 'react-hot-toast'

export default function AdminOpsPage() {
  const { pathname } = useLocation()
  const mode = pathname.includes('coupons') ? 'coupons' : pathname.includes('settings') ? 'settings' : 'reports'
  const [items, setItems] = useState([])
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('')
  const [minAmount, setMinAmount] = useState('')

  useEffect(() => {
    if (mode === 'settings') return
    const col = mode === 'coupons' ? 'coupons' : 'reports'
    const q = mode === 'reports'
      ? query(collection(db, col), orderBy('createdAt', 'desc'))
      : collection(db, col)
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [mode])

  const createCoupon = async (event) => {
    event.preventDefault()
    const id = code.trim().toUpperCase()
    if (!id || !discount) return toast.error('Coupon code and discount are required.')
    await setDoc(doc(db, 'coupons', id), {
      active: true,
      type: 'percent',
      discount: Number(discount),
      minAmount: Number(minAmount || 0),
      description: `${discount}% off`,
      createdAt: serverTimestamp(),
    })
    setCode('')
    setDiscount('')
    setMinAmount('')
    toast.success('Coupon saved.')
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await setDoc(doc(db, 'settings', 'platform'), {
      gstRate: Number(form.get('gstRate') || 18) / 100,
      platformFee: Number(form.get('platformFee') || 99),
      supportEmail: form.get('supportEmail') || 'help@fleet.in',
      updatedAt: serverTimestamp(),
    }, { merge: true })
    toast.success('Platform settings saved.')
  }

  if (mode === 'settings') {
    return (
      <PageLayout>
        <main className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-black">Platform Settings</h1>
          <form onSubmit={saveSettings} className="mt-8 bg-white border border-outline-variant rounded-2xl p-6 space-y-5">
            <input name="gstRate" type="number" placeholder="GST percent, e.g. 18" className="w-full h-11 px-4 rounded-xl border border-outline-variant" />
            <input name="platformFee" type="number" placeholder="Platform fee, e.g. 99" className="w-full h-11 px-4 rounded-xl border border-outline-variant" />
            <input name="supportEmail" type="email" placeholder="Support email" className="w-full h-11 px-4 rounded-xl border border-outline-variant" />
            <button className="h-11 px-5 rounded-xl bg-primary-container text-white font-bold">Save settings</button>
          </form>
        </main>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black">{mode === 'coupons' ? 'Coupon Management' : 'Reports Management'}</h1>

        {mode === 'coupons' && (
          <form onSubmit={createCoupon} className="mt-8 bg-white border border-outline-variant rounded-2xl p-5 grid md:grid-cols-4 gap-3">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="h-11 px-4 rounded-xl border border-outline-variant uppercase" />
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" placeholder="Discount %" className="h-11 px-4 rounded-xl border border-outline-variant" />
            <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} type="number" placeholder="Min amount" className="h-11 px-4 rounded-xl border border-outline-variant" />
            <button className="h-11 rounded-xl bg-primary-container text-white font-bold">Save coupon</button>
          </form>
        )}

        <section className="mt-8 bg-white border border-outline-variant rounded-2xl overflow-hidden">
          {items.length === 0 ? (
            <p className="p-6 text-secondary">No records found.</p>
          ) : items.map((item) => (
            <div key={item.id} className="p-5 border-b border-outline-variant last:border-0 flex justify-between gap-4">
              <div>
                <p className="font-bold">{mode === 'coupons' ? item.id : item.reason || item.type || 'Report'}</p>
                <p className="text-sm text-secondary">
                  {mode === 'coupons'
                    ? `${item.discount}% off - Min Rs ${item.minAmount || 0}`
                    : `${item.bookingId || ''} ${item.details || item.message || ''}`}
                </p>
              </div>
              {mode === 'coupons' ? (
                <button
                  onClick={() => updateDoc(doc(db, 'coupons', item.id), { active: !item.active })}
                  className="h-9 px-4 rounded-lg border border-outline-variant font-bold"
                >
                  {item.active ? 'Deactivate' : 'Activate'}
                </button>
              ) : (
                <button
                  onClick={() => addDoc(collection(db, 'reportActions'), { reportId: item.id, action: 'reviewed', createdAt: serverTimestamp() })}
                  className="h-9 px-4 rounded-lg border border-outline-variant font-bold"
                >
                  Mark reviewed
                </button>
              )}
            </div>
          ))}
        </section>
      </main>
    </PageLayout>
  )
}
