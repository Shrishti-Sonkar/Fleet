import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import toast from 'react-hot-toast'

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, userDoc, refreshUserDoc } = useAuth()
  
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Prefer not to say')
  const [bio, setBio] = useState('')
  
  const [previewURL, setPreviewURL] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (userDoc) {
      setDisplayName(userDoc.name || userDoc.displayName || user?.displayName || '')
      setPhone(userDoc.phone || '')
      setDob(userDoc.dob || '')
      setGender(userDoc.gender || 'Prefer not to say')
      setBio(userDoc.bio || '')
      setPreviewURL(userDoc.photoURL || user?.photoURL || '')
    }
  }, [userDoc, user])

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP supported')
      return
    }

    setPhotoUploading(true)
    try {
      const storageRef = ref(storage, `profilePhotos/${user.uid}`)
      const snapshot = await uploadBytes(storageRef, file)
      const url = await getDownloadURL(snapshot.ref)

      await updateProfile(user, { photoURL: url })
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url })
      
      setPreviewURL(url)
      await refreshUserDoc()
      toast.success('Photo updated!')
    } catch (err) {
      console.error(err)
      toast.error('Photo upload failed. Try again.')
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      await updateProfile(user, { displayName: displayName.trim() })
      await updateDoc(doc(db, 'users', user.uid), {
        name: displayName.trim(),
        displayName: displayName.trim(),
        phone: phone.trim(),
        dob: dob,
        gender: gender,
        bio: bio.trim().slice(0, 150),
        updatedAt: serverTimestamp(),
      })
      await refreshUserDoc()
      toast.success('Profile updated!')
      navigate('/profile')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageLayout showBottomBar={false}>
      <div className="max-w-md mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-on-surface">Edit Profile</h1>
        </div>

        {/* Photo Upload Section */}
        <div className="flex flex-col items-center mb-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />

          <div
            className="relative w-24 h-24 cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewURL ? (
              <img
                src={previewURL}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border border-outline-variant shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center text-2xl font-bold text-secondary border border-outline-variant shadow-md">
                {getInitials(displayName || userDoc?.name)}
              </div>
            )}
            
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg border border-white">
              {photoUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px] text-white">photo_camera</span>
              )}
            </div>
          </div>
          <p className="text-xs text-secondary mt-3">Click photo to update</p>
        </div>

        {/* Forms */}
        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-secondary mb-1 block">Full Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter full name"
              className="w-full h-12 px-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary mb-1 block">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full h-12 px-4 rounded-2xl bg-surface border border-outline-variant outline-none text-secondary text-sm cursor-not-allowed opacity-60"
            />
            <p className="text-[10px] text-secondary mt-1 ml-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary mb-1 block">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full h-12 px-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-secondary mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary mb-1 block">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-secondary block">Bio</label>
              <span className="text-[10px] text-secondary">{bio.length}/150</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              placeholder="Tell others a bit about yourself..."
              rows={3}
              className="w-full p-4 rounded-2xl bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none text-on-surface text-sm transition-all resize-none"
            />
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={handleSave}
              disabled={saving || photoUploading}
              className="w-full h-12 bg-primary-container text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <button
              onClick={() => navigate('/profile')}
              disabled={saving}
              className="w-full h-12 border border-outline-variant text-on-surface font-semibold rounded-2xl hover:bg-surface-container transition-all text-sm"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </PageLayout>
  )
}
