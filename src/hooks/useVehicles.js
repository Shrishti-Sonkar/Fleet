import { useState, useMemo } from 'react'
import { mockVehicles } from '../data/mockVehicles'

export function useVehicles(initialFilter = 'All') {
  const [filter, setFilter] = useState(initialFilter)
  const [sort, setSort] = useState('Recommended')
  const [searchCity, setSearchCity] = useState('')

  const filtered = useMemo(() => {
    let list = [...mockVehicles]

    if (filter !== 'All') {
      if (filter === 'Bikes') list = list.filter(v => v.type === 'Bike')
      else if (filter === 'Scooters') list = list.filter(v => v.type === 'Scooter')
      else if (filter === 'Electric') list = list.filter(v => v.fuelType === 'Electric')
      else if (filter === 'Under ₹500') list = list.filter(v => v.dailyPrice < 500)
      else if (filter === 'Top Rated') list = list.filter(v => v.rating >= 4.8)
    }

    if (searchCity) {
      list = list.filter(v => v.city.toLowerCase().includes(searchCity.toLowerCase()))
    }

    if (sort === 'Price: Low to High') list.sort((a, b) => a.dailyPrice - b.dailyPrice)
    else if (sort === 'Price: High to Low') list.sort((a, b) => b.dailyPrice - a.dailyPrice)
    else if (sort === 'Top Rated') list.sort((a, b) => b.rating - a.rating)

    return list
  }, [filter, sort, searchCity])

  const getVehicleById = (id) => mockVehicles.find(v => v.id === id)

  return { vehicles: filtered, filter, setFilter, sort, setSort, searchCity, setSearchCity, getVehicleById }
}
