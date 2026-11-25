import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import VendorLayout from './VendorLayout'
import toast from 'react-hot-toast'

export default function VendorPayoutsPage() {
  const { user } = useAuth()
  const [razorpayAccountId, setRazorpayAccountId] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [saving, setSaving] = useState(false)
  const [payouts, setPayouts] = useState([])

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setRazorpayAccountId(data.razorpayAccountId || '')
        setBankName(data.payout?.bankName || '')
        setAccountNumber(data.payout?.accountNumber || '')
        setIfsc(data.payout?.ifsc || '')
      }
    })

    const q = query(
      collection(db, 'bookings'),
      where('ownerId', '==', user.uid),
      where('paymentStatus', '==', 'paid')
    )
    return onSnapshot(q, (snap) => {
      setPayouts(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.splitDetails))
    })
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        razorpayAccountId: razorpayAccountId.trim(),
        payout: { bankName, accountNumber, ifsc, status: 'active' },
        updatedAt: serverTimestamp(),
      })
      toast.success('Razorpay Payout details saved!')
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const totalSettled = payouts
    .filter((p) => p.splitDetails?.transferStatus === 'processed')
    .reduce((s, p) => s + (p.splitDetails?.vendorCut || 0), 0)

  return (
    <VendorLayout title="Razorpay Payout Setup" subtitle="Configure Linked Account for automatic Razorpay Route settlements">
      <div className="max-w-4xl space-y-8">
        {/* Setup Form */}
        <form onSubmit={handleSave} className="bg-[#0e1424] border border-slate-800 rounded-3xl p-8 space-y-6">
          <div>
            <h3 className="font-extrabold text-white text-lg">Razorpay Route Linked Account</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter your Razorpay Linked Account ID (`acc_XXXX`) to receive automated split payouts directly to your bank account upon booking completion.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Razorpay Account ID (Route) *</label>
            <input
              type="text"
              value={razorpayAccountId}
              onChange={(e) => setRazorpayAccountId(e.target.value)}
              placeholder="acc_H4sIAAAAAAAAA12345"
              className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 font-mono text-sm text-white outline-none transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Find this in your Razorpay Dashboard under Route → Accounts.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h4 className="font-bold text-sm text-white mb-4">Bank Account Records (Reference)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="HDFC Bank"
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="50100XXXXXXXX"
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  placeholder="HDFC0001234"
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all uppercase"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Payout Details'}
          </button>
        </form>

        {/* Settlement Summary & Log */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-white text-lg">Settlement History</h3>
              <p className="text-xs text-slate-400">Total Settled: ₹{totalSettled.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {payouts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No settlements recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-white">{p.vehicleName}</p>
                    <p className="text-slate-400 font-mono">{p.splitDetails?.transferId || 'Transfer pending'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-emerald-400">₹{(p.splitDetails?.vendorCut || 0).toLocaleString('en-IN')}</p>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">{p.splitDetails?.transferStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  )
}
