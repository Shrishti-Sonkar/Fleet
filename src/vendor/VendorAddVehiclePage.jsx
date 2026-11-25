import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { uploadFile } from '../lib/upload'
import { useAuth } from '../context/AuthContext'
import VendorLayout from './VendorLayout'
import toast from 'react-hot-toast'

export default function VendorAddVehiclePage() {
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('SUV')
  const [fuelType, setFuelType] = useState('Diesel')
  const [city, setCity] = useState('Dehradun')
  const [regNo, setRegNo] = useState('')
  const [dailyPrice, setDailyPrice] = useState('')
  const [securityDeposit, setSecurityDeposit] = useState('5000')
  const [cc, setCc] = useState('')
  const [seats, setSeats] = useState('5')
  const [mileage, setMileage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !dailyPrice || !city) return toast.error('Vehicle name, daily price, and city are required.')

    setSaving(true)
    try {
      const typeMap = { SUV: 'Car', Sedan: 'Car', Hatchback: 'Car', Bike: 'Bike', Scooter: 'Scooter' }
      const finalType = typeMap[category] || 'Car'

      let resolvedImageUrl = imageUrl.trim()
      if (imageFile) {
        resolvedImageUrl = await uploadFile(imageFile, `vehicles/${user.uid}`)
      }
      if (!resolvedImageUrl) {
        resolvedImageUrl = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=2070'
      }

      await addDoc(collection(db, 'vehicles'), {
        name,
        regNo,
        type: finalType,
        category,
        fuelType,
        city,
        cc,
        seats: Number(seats),
        mileage,
        dailyPrice: Number(dailyPrice),
        securityDeposit: Number(securityDeposit),
        description,
        imageUrl: resolvedImageUrl,
        images: [resolvedImageUrl],
        status: 'pending',
        available: true,
        ownerId: user.uid,
        hostName: userDoc?.name || 'Vendor Partner',
        hostRating: 5.0,
        hostReviews: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success('Vehicle listing submitted for review!')
      navigate('/vehicles')
    } catch (err) {
      toast.error('Failed to add vehicle: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <VendorLayout title="List New Vehicle" subtitle="Publish a vehicle to the Fleet rental catalog">
      <div className="max-w-3xl mx-auto bg-[#0e1424] border border-slate-800 rounded-3xl p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="font-extrabold text-[#f1f5f9] text-lg pb-3 border-b border-slate-800">Vehicle Basics</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Vehicle Brand &amp; Model *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mahindra Thar 4x4 / Royal Enfield 350"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Registration No.</label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="UK 07 XX 1234"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              >
                <option>SUV</option>
                <option>Sedan</option>
                <option>Hatchback</option>
                <option>Bike</option>
                <option>Scooter</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Fuel Type</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              >
                <option>Diesel</option>
                <option>Petrol</option>
                <option>Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">City Location *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dehradun / Mussoorie"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
                required
              />
            </div>
          </div>

          <h3 className="font-extrabold text-[#f1f5f9] text-lg pt-4 pb-3 border-b border-slate-800">Pricing &amp; Deposits</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Daily Price (₹) *</label>
              <input
                type="number"
                value={dailyPrice}
                onChange={(e) => setDailyPrice(e.target.value)}
                placeholder="2500"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Security Deposit (₹)</label>
              <input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="5000"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              />
            </div>
          </div>

          <h3 className="font-extrabold text-[#f1f5f9] text-lg pt-4 pb-3 border-b border-slate-800">Specs &amp; Media</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Engine CC</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="1998cc"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Seats</label>
              <input
                type="number"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder="5"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Mileage</label>
              <input
                type="text"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="14 kmpl"
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Upload Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Or Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide vehicle condition, guidelines, or features..."
              className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white outline-none transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Publishing...' : 'Publish Vehicle Listing'}
          </button>
        </form>
      </div>
    </VendorLayout>
  )
}
