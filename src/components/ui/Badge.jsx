export default function Badge({ label, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-inverse-surface text-on-tertiary',
    available: 'bg-secondary-container text-on-secondary-container',
    booked: 'bg-error-container text-on-error-container',
    popular: 'bg-on-surface text-surface-lowest',
    electric: 'bg-secondary-container text-on-secondary-container',
    luxury: 'bg-on-surface text-on-tertiary',
    sports: 'bg-inverse-surface text-on-tertiary',
    premium: 'bg-surface-container-high text-on-surface',
    adventure: 'bg-primary-fixed text-on-primary-fixed',
    utility: 'bg-tertiary-container text-on-tertiary-container',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${variants[variant] || variants.default} ${className}`}>
      {label}
    </span>
  )
}
