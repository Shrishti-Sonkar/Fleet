import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useDropzone } from 'react-dropzone'
import PageLayout from '../components/layout/PageLayout'
import toast from 'react-hot-toast'

const VEHICLE_TYPES = ['Bike', 'Scooter', 'Car', 'SUV']
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG']
const CITIES = ['Dehradun', 'Mussoorie', 'Rishikesh']
const STEPS = ['Vehicle Info', 'Photos', 'Pricing', 'Review']

export default function AddVehiclePage() {
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '',
    type: 'Bike',
    brand: '',
    model: '',
    year: '',
    fuelType: 'Petrol',
    seats: 2,
    city: 'Dehradun',
    description: '',
  })
  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [pricing, setPricing] = useState({
    dailyPrice: '',
    weeklyPrice: '',
    securityDeposit: '5000',
  })

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setPricingField = (key, value) => setPricing((p) => ({ ...p, [key]: value }))

  const onDrop = useCallback((accepted) => {
    const valid = accepted.filter((f) => f.size <= 10 * 1024 * 1024)
    if (valid.length < accepted.length) toast.error('Some files exceeded 10MB and were skipped')
    setImages((prev) => [...prev, ...valid].slice(0, 5))
    setImagePreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))].slice(0, 5))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  })

  const removeImage = (i) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) return toast.error('Vehicle name is required'), false
      if (!form.brand.trim()) return toast.error('Brand is required'), false
      if (!form.year || isNaN(form.year)) return toast.error('Valid year is required'), false
    }
    if (step === 1) {
      if (images.length === 0) return toast.error('Upload at least 1 photo'), false
    }
    if (step === 2) {
      if (!pricing.dailyPrice || isNaN(pricing.dailyPrice)) return toast.error('Valid daily price is required'), false
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, 3))
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      // Upload images
      const imageUrls = await Promise.all(
        images.map(async (file, i) => {
          const r = ref(storage, `vehicles/${user.uid}/${Date.now()}_${i}`)
          await uploadBytes(r, file)
          return await getDownloadURL(r)
        }),
      )

      await addDoc(collection(db, 'vehicles'), {
        ...form,
        year: Number(form.year),
        seats: Number(form.seats),
        dailyPrice: Number(pricing.dailyPrice),
        weeklyPrice: Number(pricing.weeklyPrice) || Number(pricing.dailyPrice) * 6,
        securityDeposit: Number(pricing.securityDeposit),
        imageUrl: imageUrls[0] || '',
        images: imageUrls,
        ownerId: user.uid,
        ownerName: userDoc?.name || '',
        status: 'pending',
        available: true,
        rating: 0,
        reviewCount: 0,
        badge: 'New',
        createdAt: serverTimestamp(),
      })

      toast.success('Vehicle listed successfully! 🎉')
      navigate('/vendor/dashboard')
    } catch (err) {
      console.error(err)
      toast.error('Failed to list vehicle. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout showBottomBar={false}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-on-surface mb-1">List Your Vehicle</h1>
          <p className="text-secondary text-label-md">Earn money by sharing your vehicle with Fleet renters</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-bold shrink-0 transition-all ${
                i < step ? 'bg-primary-container text-white' :
                i === step ? 'bg-on-surface text-white' :
                'bg-surface-container-high text-secondary'
              }`}>
                {i < step
                  ? <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  : i + 1
                }
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-primary-container' : 'bg-surface-container-high'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-label-md text-secondary mb-8">Step {step + 1}: {STEPS[step]}</p>

        {/* STEP 0: Vehicle Info */}
        {step === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-label-md text-secondary block mb-1">Vehicle Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Royal Enfield Classic 350"
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Brand *</label>
                <input
                  value={form.brand}
                  onChange={(e) => setField('brand', e.target.value)}
                  placeholder="e.g. Royal Enfield"
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Model</label>
                <input
                  value={form.model}
                  onChange={(e) => setField('model', e.target.value)}
                  placeholder="e.g. Classic 350"
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setField('type', e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                >
                  {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Fuel Type</label>
                <select
                  value={form.fuelType}
                  onChange={(e) => setField('fuelType', e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                >
                  {FUEL_TYPES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Year *</label>
                <input
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                  placeholder="2022"
                  type="number"
                  min="2000"
                  max={new Date().getFullYear()}
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Seats</label>
                <input
                  value={form.seats}
                  onChange={(e) => setField('seats', e.target.value)}
                  type="number"
                  min="1"
                  max="8"
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">City</label>
                <select
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                >
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-label-md text-secondary block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Describe your vehicle — condition, features, special notes..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
            <button onClick={handleNext} className="w-full h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all">
              Continue →
            </button>
          </div>
        )}

        {/* STEP 1: Photos */}
        {step === 1 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
            <h2 className="font-bold text-on-surface mb-2">Upload Vehicle Photos</h2>
            <p className="text-label-md text-secondary mb-5">Upload up to 5 photos. First photo will be the cover. Max 10MB each.</p>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all mb-5 ${
                isDragActive ? 'border-primary-container bg-primary/5' : 'border-outline-variant hover:border-primary-container'
              }`}
            >
              <input {...getInputProps()} />
              <span className="material-symbols-outlined text-4xl text-secondary mb-3">add_photo_alternate</span>
              <p className="font-medium text-on-surface mb-1">{isDragActive ? 'Drop photos here' : 'Drag & drop or click to upload'}</p>
              <p className="text-label-md text-secondary">JPG, PNG, WEBP • Max 5 photos</p>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover rounded-xl" />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-primary-container text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Cover</span>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 bg-error text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 h-12 border border-outline-variant rounded-xl font-medium hover:bg-surface-container transition-all">← Back</button>
              <button onClick={handleNext} className="flex-[2] h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 2: Pricing */}
        {step === 2 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
            <h2 className="font-bold text-on-surface mb-2">Set Your Pricing</h2>
            <p className="text-label-md text-secondary mb-5">Fleet recommends ₹300–800/day for bikes, ₹800–2000/day for cars.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-label-md text-secondary block mb-1">Daily Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                  <input
                    value={pricing.dailyPrice}
                    onChange={(e) => setPricingField('dailyPrice', e.target.value)}
                    type="number"
                    placeholder="500"
                    className="w-full h-11 pl-8 pr-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Weekly Price (₹) <span className="text-[11px]">Optional — auto-calc as 6× daily</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                  <input
                    value={pricing.weeklyPrice}
                    onChange={(e) => setPricingField('weeklyPrice', e.target.value)}
                    type="number"
                    placeholder={pricing.dailyPrice ? String(Number(pricing.dailyPrice) * 6) : '3000'}
                    className="w-full h-11 pl-8 pr-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-label-md text-secondary block mb-1">Security Deposit (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                  <input
                    value={pricing.securityDeposit}
                    onChange={(e) => setPricingField('securityDeposit', e.target.value)}
                    type="number"
                    className="w-full h-11 pl-8 pr-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                  />
                </div>
              </div>
            </div>
            {pricing.dailyPrice && (
              <div className="bg-surface-container p-4 rounded-xl mb-5 text-label-md text-secondary">
                <p className="font-medium text-on-surface mb-1">Estimated Monthly Earnings</p>
                <p className="text-primary-container font-bold text-lg">
                  ₹{(Number(pricing.dailyPrice) * 20).toLocaleString('en-IN')}
                  <span className="text-secondary font-normal text-label-md"> /month (avg 20 days)</span>
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 h-12 border border-outline-variant rounded-xl font-medium hover:bg-surface-container transition-all">← Back</button>
              <button onClick={handleNext} className="flex-[2] h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all">Review →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === 3 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
            <h2 className="font-bold text-on-surface mb-5">Review & Submit</h2>
            {imagePreviews[0] && (
              <img src={imagePreviews[0]} alt="Cover" className="w-full h-48 object-cover rounded-xl mb-5" />
            )}
            <div className="space-y-3 mb-5">
              {[
                { label: 'Name', value: form.name },
                { label: 'Type', value: `${form.type} • ${form.fuelType}` },
                { label: 'Year', value: form.year },
                { label: 'City', value: form.city },
                { label: 'Daily Price', value: `₹${Number(pricing.dailyPrice).toLocaleString('en-IN')}` },
                { label: 'Security Deposit', value: `₹${Number(pricing.securityDeposit).toLocaleString('en-IN')}` },
                { label: 'Photos', value: `${images.length} uploaded` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-outline-variant last:border-0">
                  <span className="text-label-md text-secondary">{label}</span>
                  <span className="font-medium text-on-surface">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-secondary mb-5">
              By submitting, you agree to Fleet's host terms. Your listing will be live immediately after submission.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 h-12 border border-outline-variant rounded-xl font-medium">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all"
              >
                {submitting ? 'Submitting...' : '🚀 List Vehicle'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
