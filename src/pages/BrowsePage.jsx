import { useState } from 'react'
import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import FilterBar from '../components/sections/FilterBar'
import VehicleCard from '../components/sections/VehicleCard'
import PriceModeToggle from '../components/sections/PriceModeToggle'
import { useVehicles } from '../hooks/useVehicles'

const engineFilters = ['100cc+', '350cc+', '500cc+']
const vehicleTypes = ['Cruiser', 'Adventure Tourer', 'Sports Bike']

export default function BrowsePage() {
  const { vehicles, filter, setFilter, sort, setSort } = useVehicles()
  const [priceRange, setPriceRange] = useState(2000)
  const [activeEngine, setActiveEngine] = useState('100cc+')
  const [checkedTypes, setCheckedTypes] = useState(['Cruiser'])
  const [locationQuery, setLocationQuery] = useState('')

  const toggleType = (t) => {
    setCheckedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  return (
    <PageLayout>
      {/* Sticky filter bar */}
      <FilterBar activeFilter={filter} onFilterChange={setFilter} />

      <main className="max-w-screen-2xl mx-auto px-gutter py-10 flex gap-gutter">
        {/* ── Sidebar ── */}
        <aside className="w-[280px] shrink-0 hidden lg:block">
          <div className="sticky top-40 space-y-8">
            <div>
              <h3 className="font-headline-sm text-headline-sm mb-4 text-primary">Filters</h3>
              <div className="space-y-6">
                {/* Location */}
                <div>
                  <label className="font-bold text-label-md font-label-md block mb-3">Location</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">location_on</span>
                    <input
                      className="w-full h-12 pl-10 pr-4 rounded-[10px] bg-surface-container-low border border-outline-variant focus:ring-1 focus:ring-primary outline-none text-body-lg font-body-lg"
                      placeholder="Search Dehradun..."
                      type="text"
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="font-bold text-label-md font-label-md block mb-3">Rental Dates</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">calendar_today</span>
                    <input
                      className="w-full h-12 pl-10 pr-4 rounded-[10px] bg-surface-container-low border border-outline-variant focus:ring-1 focus:ring-primary outline-none text-body-lg font-body-lg"
                      type="text"
                      defaultValue="Oct 24 - Oct 26"
                    />
                  </div>
                </div>

                {/* Price Slider */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="font-bold text-label-md font-label-md">Price per Day</label>
                    <span className="text-primary font-bold text-label-md font-label-md">₹200 - ₹{priceRange.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    className="w-full h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary-container"
                    max="2000"
                    min="200"
                    step="50"
                    type="range"
                    value={priceRange}
                    onChange={e => setPriceRange(Number(e.target.value))}
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="font-bold text-label-md font-label-md block mb-3">Vehicle Type</label>
                  <div className="space-y-3">
                    {vehicleTypes.map(t => (
                      <label key={t} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checkedTypes.includes(t)}
                          onChange={() => toggleType(t)}
                          className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                        />
                        <span className="text-body-lg font-body-lg">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Engine CC */}
                <div>
                  <label className="font-bold text-label-md font-label-md block mb-3">Engine Capacity</label>
                  <div className="flex flex-wrap gap-2">
                    {engineFilters.map(e => (
                      <button
                        key={e}
                        onClick={() => setActiveEngine(e)}
                        className={`px-3 py-1.5 rounded-lg text-label-md font-bold transition-all ${
                          activeEngine === e
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : 'bg-surface-container text-on-surface-variant border border-outline-variant font-medium'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Vehicle Grid ── */}
        <section className="flex-1">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Available Vehicles</h1>
              <p className="text-on-surface-variant font-body-lg text-body-lg">
                Showing {vehicles.length} results in {locationQuery || 'Dehradun'}
              </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
              <PriceModeToggle />
              <span className="text-label-md font-label-md font-bold text-on-surface-variant whitespace-nowrap">Sort by:</span>
              <select
                id="sort-select"
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="flex-1 md:flex-none h-10 px-4 rounded-lg bg-surface-container-low border border-outline-variant text-label-md font-medium focus:ring-1 focus:ring-primary outline-none"
              >
                <option>Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Top Rated</option>
              </select>
            </div>
          </header>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 overflow-visible">
            {vehicles.map(v => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
            {vehicles.length === 0 && (
              <div className="col-span-full text-center py-24 text-on-surface-variant">
                <span className="material-symbols-outlined text-[64px] block mb-4">search_off</span>
                <p className="font-headline-sm text-headline-sm">No vehicles match your filters</p>
              </div>
            )}
          </div>

          {/* Load More */}
          <div className="mt-16 flex flex-col items-center gap-6">
            <button className="px-10 py-4 bg-surface-container-lowest border border-primary text-primary font-bold rounded-full hover:bg-primary-fixed transition-colors">
              Load More Vehicles
            </button>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    n === 1 ? 'bg-primary-container text-white' : 'bg-surface hover:bg-surface-container transition-colors'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="flex items-center justify-center px-2">...</span>
              <button className="w-10 h-10 rounded-full flex items-center justify-center bg-surface hover:bg-surface-container transition-colors">12</button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </PageLayout>
  )
}
