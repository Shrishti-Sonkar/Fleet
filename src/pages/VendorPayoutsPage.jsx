import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import toast from 'react-hot-toast'

export default function VendorPayoutsPage() {
  const { user, userDoc, refreshUserDoc } = useAuth()
  const [bankName, setBankName] = useState(userDoc?.payout?.bankName || '')
  const [accountNumber, setAccountNumber] = useState(userDoc?.payout?.accountNumber || '')
  const [ifsc, setIfsc] = useState(userDoc?.payout?.ifsc || '')
  const [saving, setSaving] = useState(false)

  const save = async (event) => {
    event.preventDefault()
    if (!user) return
    if (!bankName || !accountNumber || !ifsc) {
      toast.error('Complete all payout fields.')
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        payout: { bankName, accountNumber, ifsc: ifsc.toUpperCase(), status: 'pending_review' },
        updatedAt: serverTimestamp(),
      })
      await refreshUserDoc()
      toast.success('Payout details saved for review.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageLayout>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-on-surface">Payout Settings</h1>
        <p className="mt-2 text-secondary">Add bank details for weekly vendor payouts.</p>

        <form onSubmit={save} className="mt-8 bg-white border border-outline-variant rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-secondary mb-2">Bank name</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-outline-variant" />
          </div>
          <div>
            <label className="block text-sm font-bold text-secondary mb-2">Account number</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} className="w-full h-11 px-4 rounded-xl border border-outline-variant" />
          </div>
          <div>
            <label className="block text-sm font-bold text-secondary mb-2">IFSC</label>
            <input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} className="w-full h-11 px-4 rounded-xl border border-outline-variant uppercase" />
          </div>
          <button disabled={saving} className="h-11 px-5 rounded-xl bg-primary-container text-white font-bold disabled:opacity-60">
            {saving ? 'Saving...' : 'Save payout details'}
          </button>
        </form>
      </main>
    </PageLayout>
  )
}
