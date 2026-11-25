import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'
import toast from 'react-hot-toast'

export default function AdminSettingsPage() {
  const { user } = useAuth()

  // Platform payment defaults
  const [tokenAmountType, setTokenAmountType] = useState('fixed')
  const [tokenFixedAmount, setTokenFixedAmount] = useState('500')
  const [tokenPercentage, setTokenPercentage] = useState('20')
  const [platformCommissionPercent, setPlatformCommissionPercent] = useState('15')
  const [gstRatePercent, setGstRatePercent] = useState('18')
  const [platformFee, setPlatformFee] = useState('99')
  const [supportEmail, setSupportEmail] = useState('help@fleet.in')
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210')

  // Website Content / CMS
  const [announcementEnabled, setAnnouncementEnabled] = useState(false)
  const [announcementText, setAnnouncementText] = useState('')
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [footerTagline, setFooterTagline] = useState('')
  const [citiesText, setCitiesText] = useState('Dehradun, Mussoorie, Rishikesh')

  // Admin Credentials Management
  const [credentials, setCredentials] = useState([])
  const [newAdminId, setNewAdminId] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')

  const [savingSettings, setSavingSettings] = useState(false)
  const [savingCms, setSavingCms] = useState(false)
  const [savingCred, setSavingCred] = useState(false)

  const loadCredentials = async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const data = await apiFetch('/api/admin/credentials', { token })
      setCredentials(data.credentials || [])
    } catch {
      // Ignore if unavailable
    }
  }

  useEffect(() => {
    if (!user) return
    user.getIdToken().then((token) => {
      apiFetch('/api/admin/payment-settings', { token }).then((s) => {
        setTokenAmountType(s.tokenAmountType || 'fixed')
        setTokenFixedAmount(String(s.tokenFixedAmount ?? 500))
        setTokenPercentage(String(s.tokenPercentage ?? 20))
        setPlatformCommissionPercent(String(s.platformCommissionPercent ?? 15))
        setGstRatePercent(String(Math.round((s.gstRate ?? 0.18) * 100)))
        setPlatformFee(String(s.platformFee ?? 99))
        setSupportEmail(s.supportEmail || 'help@fleet.in')
        setSupportPhone(s.supportPhone || '+91 98765 43210')
      }).catch(() => {})
    })
    fetch('/api/public/site-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!c) return
        setAnnouncementEnabled(Boolean(c.announcementEnabled))
        setAnnouncementText(c.announcementText || '')
        setHeroTitle(c.heroTitle || '')
        setHeroSubtitle(c.heroSubtitle || '')
        setFooterTagline(c.footerTagline || '')
        if (Array.isArray(c.cities)) setCitiesText(c.cities.join(', '))
      })
      .catch(() => {})
    loadCredentials()
  }, [user])

  const saveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const token = await user.getIdToken()
      await apiFetch('/api/admin/payment-settings', {
        token,
        method: 'PUT',
        body: JSON.stringify({
          tokenAmountType,
          tokenFixedAmount: Number(tokenFixedAmount),
          tokenPercentage: Number(tokenPercentage),
          platformCommissionPercent: Number(platformCommissionPercent),
          gstRate: Number(gstRatePercent) / 100,
          platformFee: Number(platformFee),
          supportEmail,
          supportPhone,
        }),
      })
      toast.success('Platform payment & contact settings saved.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  const saveSiteContent = async (e) => {
    e.preventDefault()
    setSavingCms(true)
    try {
      const token = await user.getIdToken()
      const cities = citiesText.split(',').map((s) => s.trim()).filter(Boolean)
      await apiFetch('/api/admin/site-content', {
        token,
        method: 'PUT',
        body: JSON.stringify({
          announcementEnabled,
          announcementText,
          heroTitle,
          heroSubtitle,
          footerTagline,
          cities,
        }),
      })
      toast.success('Website content updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingCms(false)
    }
  }

  const saveAdminCredential = async (e) => {
    e.preventDefault()
    if (!newAdminId.trim()) return toast.error('Admin ID is required.')
    setSavingCred(true)
    try {
      const token = await user.getIdToken()
      await apiFetch('/api/admin/credentials', {
        token,
        method: 'POST',
        body: JSON.stringify({
          adminId: newAdminId.trim(),
          name: newAdminName.trim() || newAdminId.trim(),
          email: newAdminEmail.trim(),
          password: newAdminPassword,
          active: true,
        }),
      })
      setNewAdminId('')
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPassword('')
      await loadCredentials()
      toast.success('Admin credential saved.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingCred(false)
    }
  }

  const deleteCredential = async (id) => {
    if (!window.confirm(`Remove Admin ID "${id}"?`)) return
    try {
      const token = await user.getIdToken()
      await apiFetch(`/api/admin/credentials/${id}`, { token, method: 'DELETE' })
      await loadCredentials()
      toast.success('Admin ID deleted.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <AdminLayout title="Website Content, Payment Defaults & Admin Access" subtitle="Edit live website content, global split defaults, and administrator credentials">
      <div className="max-w-4xl space-y-8">
        {/* Website Content / CMS */}
        <form onSubmit={saveSiteContent} className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="font-extrabold text-white text-lg">Website Content (Live CMS)</h2>
          <label className="flex items-center gap-3 text-sm text-slate-300 font-semibold">
            <input type="checkbox" checked={announcementEnabled} onChange={(e) => setAnnouncementEnabled(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-orange-600" />
            Show announcement banner on homepage
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Announcement Banner Text</label>
              <input value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="e.g. Monsoon Ride Sale — 15% off with FLEET15" className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Active Cities (comma-separated)</label>
              <input value={citiesText} onChange={(e) => setCitiesText(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Hero Headline (optional)</label>
              <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Leave blank to keep default minimal hero" className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Hero Subtitle (optional)</label>
              <input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Footer Tagline</label>
            <input value={footerTagline} onChange={(e) => setFooterTagline(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
          </div>
          <button disabled={savingCms} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs disabled:opacity-50">
            {savingCms ? 'Saving...' : 'Publish Website Content'}
          </button>
        </form>

        {/* Payment & Global Split Defaults */}
        <form onSubmit={saveSettings} className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="font-extrabold text-white text-lg">Global Payment &amp; Commission Defaults</h2>
          <p className="text-xs text-slate-400">Used as the fallback split when a vendor does not have a custom rate configured on the Vendors &amp; Splits tab.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Default Platform Commission (%)</label>
              <input type="number" min="0" max="100" value={platformCommissionPercent} onChange={(e) => setPlatformCommissionPercent(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Token Payment Mode</label>
              <select value={tokenAmountType} onChange={(e) => setTokenAmountType(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white">
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            {tokenAmountType === 'fixed' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Token Fixed Amount (₹)</label>
                <input type="number" value={tokenFixedAmount} onChange={(e) => setTokenFixedAmount(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Token Percentage (%)</label>
                <input type="number" value={tokenPercentage} onChange={(e) => setTokenPercentage(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">GST (%)</label>
              <input type="number" value={gstRatePercent} onChange={(e) => setGstRatePercent(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Platform Fee (₹)</label>
              <input type="number" value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Support Email</label>
              <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Support Phone</label>
              <input type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
            </div>
          </div>

          <button disabled={savingSettings} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs disabled:opacity-50">
            {savingSettings ? 'Saving...' : 'Save Payment Settings'}
          </button>
        </form>

        {/* Admin Credentials Manager */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 space-y-5">
          <div>
            <h2 className="font-extrabold text-white text-lg">Administrator Login Credentials</h2>
            <p className="text-xs text-slate-400 mt-1">
              Stored in locked Firebase `adminCredentials` (salted scrypt hashes; inaccessible to clients). Only authenticated admins can update or add IDs here.
            </p>
          </div>

          <form onSubmit={saveAdminCredential} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)} placeholder="Admin ID *" className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white" />
            <input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Display Name" className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white" />
            <input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Email (optional)" className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white" />
            <input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="Password (min 8 chars)" className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white" />
            <button disabled={savingCred} className="h-10 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs disabled:opacity-50">
              {savingCred ? 'Saving...' : 'Save Admin ID'}
            </button>
          </form>

          <div className="space-y-2">
            {credentials.map((c) => (
              <div key={c.id} className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-orange-400">{c.id}</span>
                  <span className="text-slate-300 ml-2">({c.name})</span>
                  {c.email && <span className="text-slate-500 ml-2">• {c.email}</span>}
                </div>
                <button onClick={() => deleteCredential(c.id)} className="text-slate-400 hover:text-rose-400 font-bold">Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
