import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import VendorLayout from '../components/VendorLayout'
import toast from 'react-hot-toast'

export default function VendorSettingsPage() {
  const { user, userDoc } = useAuth()
  const [name, setName] = useState(userDoc?.name || '')
  const [phone, setPhone] = useState(userDoc?.phone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        phone,
      })
      toast.success('Account profile updated!')
    } catch (err) {
      toast.error('Update failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <VendorLayout title="Account Settings" subtitle="Manage vendor profile and contact information">
      <div className="max-w-2xl bg-[#0e1424] border border-slate-800 rounded-3xl p-8 shadow-xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Business / Partner Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Email Address (Read-only)</label>
            <input
              type="email"
              value={userDoc?.email || user?.email || ''}
              disabled
              className="w-full h-11 px-4 rounded-xl bg-slate-900/50 border border-slate-800 text-sm text-slate-500 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Account Role</label>
            <input
              type="text"
              value={(userDoc?.role || 'vendor').toUpperCase()}
              disabled
              className="w-full h-11 px-4 rounded-xl bg-slate-900/50 border border-slate-800 text-sm text-blue-400 font-bold cursor-not-allowed outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </VendorLayout>
  )
}
