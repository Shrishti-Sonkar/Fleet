import Chip from '../ui/Chip'

const filters = ['All', 'Bikes', 'Scooters', 'Electric', 'Under ₹500', 'Top Rated']

export default function FilterBar({ activeFilter, onFilterChange }) {
  return (
    <div className="sticky top-[68px] w-full bg-surface-container-lowest z-40 border-b border-outline-variant">
      <div className="max-w-screen-2xl mx-auto px-gutter py-4 flex items-center gap-4 overflow-x-auto hide-scrollbar">
        {filters.map(f => (
          <Chip
            key={f}
            label={f}
            active={activeFilter === f}
            onClick={() => onFilterChange(f)}
          />
        ))}
      </div>
    </div>
  )
}
