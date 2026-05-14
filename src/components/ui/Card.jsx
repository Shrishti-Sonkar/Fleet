export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-premium ${className}`}>
      {children}
    </div>
  )
}
