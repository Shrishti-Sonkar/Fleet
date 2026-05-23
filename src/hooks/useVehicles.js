import { useState, useEffect, useMemo } from 'react'
import {
  collection, query, where, onSnapshot, doc, getDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useVehicles(initialFilter = 'All') {
  const [allVehicles, setAllVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(initialFilter)
  const [sort, setSort] = useState('Recommended')
  const [searchCity, setSearchCity] = useState('')

  useEffect(() => {
    // Real-time Firestore listener — active + available vehicles
    const q = query(
      collection(db, 'vehicles'),
      where('status', '==', 'active'),
      where('available', '==', true),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setAllVehicles(data)
        setLoading(false)
      },
      (err) => {
        console.error('Vehicles fetch error:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const vehicles = useMemo(() => {
    let list = [...allVehicles]

    if (filter !== 'All') {
      if (filter === 'Bikes') list = list.filter((v) => v.type === 'Bike')
      else if (filter === 'Scooters') list = list.filter((v) => v.type === 'Scooter')
      else if (filter === 'Cars') list = list.filter((v) => v.type === 'Car')
      else if (filter === 'Electric') list = list.filter((v) => v.fuelType === 'Electric')
      else if (filter === 'Under ₹500') list = list.filter((v) => v.dailyPrice < 500)
      else if (filter === 'Top Rated') list = list.filter((v) => v.rating >= 4.8)
    }

    if (searchCity) {
      list = list.filter((v) =>
        v.city?.toLowerCase().includes(searchCity.toLowerCase()),
      )
    }

    if (sort === 'Price: Low to High') list.sort((a, b) => a.dailyPrice - b.dailyPrice)
    else if (sort === 'Price: High to Low') list.sort((a, b) => b.dailyPrice - a.dailyPrice)
    else if (sort === 'Top Rated') list.sort((a, b) => b.rating - a.rating)

    return list
  }, [allVehicles, filter, sort, searchCity])

  const getVehicleById = async (id) => {
    const snap = await getDoc(doc(db, 'vehicles', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  return {
    vehicles,
    loading,
    filter,
    setFilter,
    sort,
    setSort,
    searchCity,
    setSearchCity,
    getVehicleById,
  }
}
