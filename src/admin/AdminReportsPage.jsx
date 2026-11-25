import { useEffect, useState } from 'react'
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

export default function AdminReportsPage() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [notes, setNotes] = useState({})

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  const updateReport = async (id, status) => {
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/reports/${id}`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ status, adminNote: notes[id] || '' }),
      })
      await addDoc(collection(db, 'reportActions'), {
        reportId: id,
        action: status,
        note: notes[id] || '',
        createdAt: serverTimestamp(),
      })
      toast.success(`Report marked ${status}.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const deleteReport = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/reports/${id}`, { token, method: 'DELETE' })
      toast.success('Report deleted.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <AdminLayout title="Reports & Moderation" subtitle="Review, resolve, annotate, or remove incident reports">
      {reports.length === 0 ? (
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          No reports submitted yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{r.reason || r.type || 'Incident Report'}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      r.status === 'resolved' ? 'bg-emerald-950 text-emerald-400' : r.status === 'reviewed' ? 'bg-blue-950 text-blue-400' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {r.status || 'open'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {r.bookingId ? `Booking: ${r.bookingId} • ` : ''}{r.details || r.message || 'No details provided'}
                  </p>
                </div>
                <button onClick={() => deleteReport(r.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800/70">
                <input
                  value={notes[r.id] ?? r.adminNote ?? ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                  placeholder="Admin resolution note..."
                  className="flex-1 h-9 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
                <button onClick={() => updateReport(r.id, 'reviewed')} className="px-4 h-9 rounded-xl bg-blue-600/20 border border-blue-800 text-blue-300 text-xs font-bold">
                  Mark Reviewed
                </button>
                <button onClick={() => updateReport(r.id, 'resolved')} className="px-4 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
