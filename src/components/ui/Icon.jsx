export default function Icon({ name, className = '', fill = 0, size = 24 }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}` }}
    >
      {name}
    </span>
  )
}
