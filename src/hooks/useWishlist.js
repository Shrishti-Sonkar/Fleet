import { useState, useEffect } from 'react'
import {
  doc, onSnapshot, setDoc,
  arrayUnion, arrayRemove, serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Firestore-backed wishlist for a user.
 * Document path: wishlists/{userId}
 * Fields: vehicleIds: string[], updatedAt: Timestamp
 *
 * @param {string|null|undefined} userId
 */
export function useWishlist(userId) {
  const [wishlistIds, setWishlistIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setWishlistIds([])
      setLoading(false)
      return
    }

    const ref = doc(db, 'wishlists', userId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setWishlistIds(snap.exists() ? (snap.data().vehicleIds || []) : [])
        setLoading(false)
      },
      (err) => {
        console.error('useWishlist error:', err)
        setLoading(false)
      }
    )
    return unsub
  }, [userId])

  /**
   * Toggle a vehicle in/out of the wishlist.
   * @param {string} vehicleId
   * @returns {boolean} new isWishlisted state
   */
  const toggleWishlist = async (vehicleId) => {
    if (!userId) return false

    const ref = doc(db, 'wishlists', userId)
    const isInWishlist = wishlistIds.includes(vehicleId)

    await setDoc(
      ref,
      {
        vehicleIds: isInWishlist ? arrayRemove(vehicleId) : arrayUnion(vehicleId),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    return !isInWishlist
  }

  const isWishlisted = (vehicleId) => wishlistIds.includes(vehicleId)

  return { wishlistIds, toggleWishlist, isWishlisted, loading }
}
