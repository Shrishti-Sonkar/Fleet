export default function Chip({ label, active = false, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-full text-label-md font-label-md whitespace-nowrap transition-all active:scale-95 ${
        active
          ? 'bg-primary-container text-on-primary-container font-semibold'
          : 'bg-surface-container-low text-on-surface font-medium border border-outline-variant hover:border-primary'
      } ${className}`}
    >
      {label}
    </button>
  )
}
