import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useVehicleReviews(vehicleId) {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({
    average: '0.0',
    total: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    cleanliness: '0.0',
    condition: '0.0',
    responsiveness: '0.0'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'reviews'),
      where('vehicleId', '==', vehicleId)
    )

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const tA = a.createdAt?.toDate?.() ?? new Date(0)
          const tB = b.createdAt?.toDate?.() ?? new Date(0)
          return tB - tA
        })

      setReviews(list)

      // Calculate stats
      if (list.length > 0) {
        const total = list.length
        const avg = list.reduce((s, r) => s + (r.rating || 0), 0) / total

        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        list.forEach(r => {
          const star = Math.round(r.rating)
          if (breakdown[star] !== undefined) breakdown[star]++
        })

        const subAvg = (field) => {
          const vals = list.map(r => r.subRatings?.[field]).filter(Boolean)
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
        }

        setStats({
          average: avg.toFixed(1),
          total,
          breakdown,
          cleanliness: subAvg('cleanliness').toFixed(1),
          condition: subAvg('condition').toFixed(1),
          responsiveness: subAvg('responsiveness').toFixed(1)
        })
      } else {
        setStats({
          average: '0.0',
          total: 0,
          breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          cleanliness: '0.0',
          condition: '0.0',
          responsiveness: '0.0'
        })
      }

      setLoading(false)
    }, (err) => {
      console.error('Error fetching reviews:', err)
      setLoading(false)
    })

    return unsub
  }, [vehicleId])

  return { reviews, stats, loading }
}
