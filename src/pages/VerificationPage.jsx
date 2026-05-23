import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import toast from 'react-hot-toast'

const steps = ['Aadhaar Card', 'Driving License', 'Selfie', 'Review & Submit']

export default function VerificationPage() {
  const { user, userDoc, refreshUserDoc } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [aadhaarFile, setAadhaarFile] = useState(null)
  const [aadhaarPreview, setAadhaarPreview] = useState(null)
  const [dlFile, setDlFile] = useState(null)
  const [dlPreview, setDlPreview] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  if (userDoc?.kycStatus === 'pending') {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-yellow-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                pending
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md mb-3">Documents Under Review</h2>
            <p className="text-body-lg text-secondary mb-6">
              Your KYC documents have been submitted. Our team will verify them within 24 hours.
            </p>
            <div className="bg-surface-container p-4 rounded-xl text-left space-y-2 mb-8">
              <p className="text-label-md font-label-md text-secondary">✅ Aadhaar Card — Submitted</p>
              <p className="text-label-md font-label-md text-secondary">✅ Driving License — Submitted</p>
              <p className="text-label-md font-label-md text-secondary">✅ Selfie — Submitted</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-primary-container text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (userDoc?.kycStatus === 'approved') {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-green-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md mb-3">You're Verified! ✅</h2>
            <p className="text-body-lg text-secondary mb-8">
              Your account is fully verified. You can now book any vehicle on Fleet.
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="bg-primary-container text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all"
            >
              Browse Vehicles
            </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  const handleFileChange = (e, setter, previewSetter) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return
    }
    setter(file)
    previewSetter(URL.createObjectURL(file))
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraStream(stream)
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      toast.error('Camera access denied. Please upload a photo instead.')
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    canvasRef.current.toBlob((blob) => {
      setSelfieFile(blob)
      setSelfiePreview(URL.createObjectURL(blob))
      cameraStream?.getTracks().forEach((t) => t.stop())
      setCameraStream(null)
    })
  }

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return await getDownloadURL(storageRef)
  }

  const handleSubmit = async () => {
    if (!aadhaarFile || !dlFile || !selfieFile) {
      toast.error('Please complete all 3 steps first')
      return
    }
    setSubmitting(true)
    try {
      const [aadhaarUrl, dlUrl, selfieUrl] = await Promise.all([
        uploadFile(aadhaarFile, `kyc/${user.uid}/aadhaar`),
        uploadFile(dlFile, `kyc/${user.uid}/dl`),
        uploadFile(selfieFile, `kyc/${user.uid}/selfie`),
      ])

      await setDoc(doc(db, 'verificationRequests', user.uid), {
        userId: user.uid,
        userName: userDoc?.name || '',
        email: user.email,
        phone: userDoc?.phone || '',
        aadhaarUrl,
        dlUrl,
        selfieUrl,
        status: 'pending',
        submittedAt: serverTimestamp(),
      })

      await updateDoc(doc(db, 'users', user.uid), {
        kycStatus: 'pending',
        aadhaarUrl,
        dlUrl,
        selfieUrl,
        updatedAt: serverTimestamp(),
      })

      await refreshUserDoc()
      toast.success('Documents submitted! Verification in 24 hrs.')
    } catch (err) {
      console.error(err)
      toast.error('Upload failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout showBottomBar={false}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-label-md font-bold uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            KYC Verification Required
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-3">Verify Your Identity</h1>
          <p className="text-body-lg text-secondary">Only verified users can book vehicles on Fleet. Complete in 3 easy steps.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-bold shrink-0 transition-all ${
                i < currentStep ? 'bg-primary-container text-white' :
                i === currentStep ? 'bg-on-surface text-white' :
                'bg-surface-container-high text-secondary'
              }`}>
                {i < currentStep
                  ? <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  : i + 1
                }
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${i < currentStep ? 'bg-primary-container' : 'bg-surface-container-high'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-label-md text-secondary mb-8">Step {currentStep + 1}: {steps[currentStep]}</p>

        {/* Step 0: Aadhaar */}
        {currentStep === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-on-surface">Upload Aadhaar Card</h2>
                <p className="text-label-md text-secondary">Front side only • Max 5MB</p>
              </div>
            </div>
            {aadhaarPreview ? (
              <div className="relative mb-6">
                <img src={aadhaarPreview} alt="Aadhaar preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  onClick={() => { setAadhaarFile(null); setAadhaarPreview(null) }}
                  className="absolute top-3 right-3 bg-error text-white w-8 h-8 rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-primary-container transition-all mb-6">
                <span className="material-symbols-outlined text-4xl text-secondary mb-3">cloud_upload</span>
                <p className="font-medium text-on-surface mb-1">Click to upload Aadhaar</p>
                <p className="text-label-md text-secondary">JPG, PNG, PDF supported</p>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={(e) => handleFileChange(e, setAadhaarFile, setAadhaarPreview)} />
              </label>
            )}
            <div className="bg-surface-container p-4 rounded-xl text-label-md text-secondary mb-6">
              <p className="font-medium text-on-surface mb-1">🔒 Your data is secure</p>
              <p>Your Aadhaar is encrypted and only used for identity verification.</p>
            </div>
            <button
              onClick={() => aadhaarFile ? setCurrentStep(1) : toast.error('Please upload your Aadhaar card')}
              className="w-full h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 1: Driving License */}
        {currentStep === 1 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>drive_eta</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-on-surface">Upload Driving License</h2>
                <p className="text-label-md text-secondary">Valid Indian DL required</p>
              </div>
            </div>
            {dlPreview ? (
              <div className="relative mb-6">
                <img src={dlPreview} alt="DL preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  onClick={() => { setDlFile(null); setDlPreview(null) }}
                  className="absolute top-3 right-3 bg-error text-white w-8 h-8 rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-primary-container transition-all mb-6">
                <span className="material-symbols-outlined text-4xl text-secondary mb-3">cloud_upload</span>
                <p className="font-medium text-on-surface mb-1">Click to upload Driving License</p>
                <p className="text-label-md text-secondary">Front side • JPG, PNG, PDF</p>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={(e) => handleFileChange(e, setDlFile, setDlPreview)} />
              </label>
            )}
            <div className="flex gap-3">
              <button onClick={() => setCurrentStep(0)} className="flex-1 h-12 border border-outline-variant rounded-xl font-medium hover:bg-surface-container transition-all">
                ← Back
              </button>
              <button
                onClick={() => dlFile ? setCurrentStep(2) : toast.error('Please upload your Driving License')}
                className="flex-[2] h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Selfie */}
        {currentStep === 2 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>face</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-on-surface">Take a Selfie</h2>
                <p className="text-label-md text-secondary">Face clearly visible, good lighting</p>
              </div>
            </div>
            {selfiePreview ? (
              <div className="relative mb-6">
                <img src={selfiePreview} alt="Selfie preview" className="w-full h-64 object-cover rounded-xl" />
                <button
                  onClick={() => { setSelfieFile(null); setSelfiePreview(null) }}
                  className="absolute top-3 right-3 bg-error text-white w-8 h-8 rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ) : cameraStream ? (
              <div className="relative mb-6">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
                <canvas ref={canvasRef} className="hidden" />
                <button onClick={capturePhoto} className="mt-4 w-full h-12 bg-on-surface text-white font-bold rounded-xl">
                  📸 Capture Photo
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                <button
                  onClick={startCamera}
                  className="w-full h-14 border-2 border-primary-container text-primary-container font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-primary/5 transition-all"
                >
                  <span className="material-symbols-outlined">photo_camera</span>
                  Open Camera
                </button>
                <p className="text-center text-label-md text-secondary">or</p>
                <label className="w-full h-14 border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:border-primary-container transition-all font-medium">
                  <span className="material-symbols-outlined">upload</span>
                  Upload a Photo
                  <input type="file" accept="image/*" capture="user" className="hidden"
                    onChange={(e) => handleFileChange(e, setSelfieFile, setSelfiePreview)} />
                </label>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setCurrentStep(1)} className="flex-1 h-12 border border-outline-variant rounded-xl font-medium hover:bg-surface-container transition-all">
                ← Back
              </button>
              <button
                onClick={() => selfieFile ? setCurrentStep(3) : toast.error('Please take or upload a selfie')}
                className="flex-[2] h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8">
            <h2 className="font-headline-sm text-on-surface mb-6">Review & Submit</h2>
            <div className="space-y-4 mb-8">
              {[
                { label: 'Aadhaar Card', preview: aadhaarPreview, round: false },
                { label: 'Driving License', preview: dlPreview, round: false },
                { label: 'Selfie', preview: selfiePreview, round: true },
              ].map(({ label, preview, round }) => (
                <div key={label} className="flex items-center gap-4 p-4 bg-surface-container rounded-xl">
                  <img
                    src={preview}
                    alt={label}
                    className={`w-16 object-cover ${round ? 'h-16 rounded-full' : 'h-12 rounded-lg'}`}
                  />
                  <div>
                    <p className="font-medium text-on-surface">{label}</p>
                    <p className="text-label-md text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Uploaded
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-label-md text-secondary mb-6">
              By submitting, you confirm all documents are genuine. False documents will result in permanent account ban.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCurrentStep(2)} className="flex-1 h-12 border border-outline-variant rounded-xl font-medium">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] h-12 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all"
              >
                {submitting ? 'Submitting...' : 'Submit for Verification ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
