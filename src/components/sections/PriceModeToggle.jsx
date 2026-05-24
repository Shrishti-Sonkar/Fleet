import { usePriceMode } from '../../context/PriceContext'

export default function PriceModeToggle({ className = '' }) {
  const { priceMode, togglePriceMode } = usePriceMode()

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-label-md font-medium text-secondary hidden sm:block">Show prices:</span>
      <button
        onClick={togglePriceMode}
        className="flex items-center bg-surface-container-high rounded-full p-0.5 transition-all"
        aria-label={`Switch to ${priceMode === 'daily' ? 'hourly' : 'daily'} pricing`}
      >
        <span
          className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-all duration-200 ${
            priceMode === 'daily'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Daily
        </span>
        <span
          className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-all duration-200 ${
            priceMode === 'hourly'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Hourly
        </span>
      </button>
    </div>
  )
}
