import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

const vehicleTypes = ['Rent a Bike', 'Scooter', 'Electric']

export default function SearchWidget() {
  const [activeType, setActiveType] = useState('Rent a Bike')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(ROUTES.BROWSE)
  }

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-premium border border-outline-variant max-w-lg">
      {/* Vehicle type tabs */}
      <div className="flex border-b border-outline-variant mb-6">
        {vehicleTypes.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 font-label-md text-label-md transition-all ${
              activeType === type
                ? 'border-b-2 border-primary text-primary font-bold'
                : 'text-on-surface-variant font-medium hover:text-primary'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Pickup city */}
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase">Pickup City</label>
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg border border-transparent focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
              <input
                className="bg-transparent border-none p-0 focus:ring-0 w-full text-body-lg font-body-lg outline-none"
                placeholder="Dehradun"
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
          </div>
          {/* Date */}
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase">Date</label>
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg border border-transparent focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
              <input
                className="bg-transparent border-none p-0 focus:ring-0 w-full text-body-lg font-body-lg outline-none"
                placeholder="Select Date"
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-primary-container text-white h-12 rounded-lg font-bold hover:opacity-90 transition-opacity"
        >
          Find My Ride
        </button>
      </form>
    </div>
  )
}
