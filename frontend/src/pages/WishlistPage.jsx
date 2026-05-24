import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, documentId } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../hooks/useWishlist'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import VehicleCard from '../components/sections/VehicleCard'
import { Link } from 'react-router-dom'

export default function WishlistPage() {
  const { user } = useAuth()
  const { wishlistIds, loading: wishlistLoading } = useWishlist(user?.uid)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (wishlistLoading) return

    if (wishlistIds.length === 0) {
      setVehicles([])
      setLoading(false)
      return
    }

    // Filter out vehicles that have been removed
    setVehicles((prev) => prev.filter((v) => wishlistIds.includes(v.id)))

    const existingIds = vehicles.map((v) => v.id)
    const missingIds = wishlistIds.filter((id) => !existingIds.includes(id))

    if (missingIds.length > 0) {
      const fetchMissing = async () => {
        setLoading(true)
        try {
          const chunks = []
          for (let i = 0; i < missingIds.length; i += 10) {
            chunks.push(missingIds.slice(i, i + 10))
          }
          const fetched = []
          for (const chunk of chunks) {
            const q = query(
              collection(db, 'vehicles'),
              where(documentId(), 'in', chunk)
            )
            const snap = await getDocs(q)
            snap.forEach((doc) => {
              fetched.push({ id: doc.id, ...doc.data() })
            })
          }

          setVehicles((prev) => {
            const currentFiltered = prev.filter((v) => wishlistIds.includes(v.id))
            return [...currentFiltered, ...fetched]
          })
        } catch (err) {
          console.error('Error fetching wishlist details:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchMissing()
    } else {
      setLoading(false)
    }
  }, [wishlistIds, wishlistLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageLayout>
      <main className="max-w-screen-2xl mx-auto px-gutter py-12 flex-1">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight flex items-center gap-2">
            My Wishlist <span className="text-red-500">❤️</span>
          </h1>
          <p className="text-on-surface-variant font-body-lg text-body-lg">
            Your curated collection of premium vehicles for future rentals.
          </p>
        </div>

        {/* Loader / Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-3xl max-w-xl mx-auto shadow-sm">
            <span
              className="material-symbols-outlined text-7xl text-secondary mb-4 block"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              favorite
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-on-surface-variant font-body-lg text-body-lg mb-8 max-w-xs mx-auto">
              Save your favorite bikes and cars by tapping the heart icon on any card.
            </p>
            <Link
              to="/browse"
              className="bg-primary-container text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all inline-block shadow-md"
            >
              Browse Vehicles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 overflow-visible">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  )
}
