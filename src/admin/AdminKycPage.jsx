import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { sendNotification } from '../lib/notificationHelper'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

const statusBadge = {
  pending: 'bg-amber-950 text-amber-400 border-amber-800',
  approved: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  rejected: 'bg-rose-950 text-rose-400 border-rose-800',
}

export default function AdminKycPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('all')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'verificationRequests'), orderBy('submittedAt', 'desc'))
    return onSnapshot(q, (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  const approveKyc = async (userId) => {
    try {
      await updateDoc(doc(db, 'verificationRequests', userId), { status: 'approved', updatedAt: serverTimestamp() })
      await updateDoc(doc(db, 'users', userId), {
        kycStatus: 'approved',
        isVerified: true,
        verifiedBadge: true,
        updatedAt: serverTimestamp(),
      })
      toast.success('KYC approved!')
      await sendNotification({
        userId,
        type: 'kyc_approved',
        title: 'ID Verified',
        body: 'Your documents are approved. You can now book any vehicle on Fleet.',
        actionUrl: '/browse',
      })
    } catch (err) {
      toast.error(err.message || 'Approval failed')
    }
  }

  const rejectKyc = async (userId) => {
    try {
      await updateDoc(doc(db, 'verificationRequests', userId), { status: 'rejected', updatedAt: serverTimestamp() })
      await updateDoc(doc(db, 'users', userId), {
        kycStatus: 'rejected',
        isVerified: false,
        verifiedBadge: false,
        updatedAt: serverTimestamp(),
      })
      toast.success('KYC rejected.')
      await sendNotification({
        userId,
        type: 'kyc_rejected',
        title: 'KYC Rejected',
        body: 'Your documents could not be verified. Please re-upload clear photos.',
        actionUrl: '/verify',
      })
    } catch (err) {
      toast.error(err.message || 'Rejection failed')
    }
  }

  const deleteKyc = async (userId) => {
    if (!window.confirm('Delete this KYC verification request record?')) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/kyc/${userId}`, { token, method: 'DELETE' })
      toast.success('KYC record removed.')
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  const visible = requests.filter((r) => (filter === 'all' ? true : r.status === filter))

  return (
    <AdminLayout title="KYC Verification Requests" subtitle="Inspect identity documents, approve, reject, or remove records">
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
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
          No KYC requests match this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <div key={r.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="font-bold text-white">{r.userName || r.id}</h3>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${statusBadge[r.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {r.status || 'pending'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{r.email} {r.phone ? `• ${r.phone}` : ''}</p>
                <div className="flex gap-3 mt-3 flex-wrap">
                  {[
                    { label: 'Aadhaar', url: r.aadhaarUrl },
                    { label: 'Driving License', url: r.dlUrl },
                    { label: 'Selfie', url: r.selfieUrl },
                  ].map((docItem) =>
                    docItem.url ? (
                      <button
                        key={docItem.label}
                        type="button"
                        onClick={() => setLightbox(docItem)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-orange-400 hover:border-orange-500"
                      >
                        View {docItem.label}
                      </button>
                    ) : null
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {r.status !== 'approved' && (
                  <button onClick={() => approveKyc(r.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs">
                    Approve
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => rejectKyc(r.id)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs">
                    Reject
                  </button>
                )}
                <button onClick={() => deleteKyc(r.id)} className="p-2 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl" title="Delete record">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <div className="max-w-3xl w-full bg-[#0b1120] border border-slate-800 rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-white text-sm">{lightbox.label}</h4>
              <button onClick={() => setLightbox(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <img src={lightbox.url} alt={lightbox.label} className="max-h-[75vh] w-full object-contain rounded-xl bg-black" />
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
