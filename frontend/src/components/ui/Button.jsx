export default function Button({ children, variant = 'primary', className = '', onClick, type = 'button', disabled = false }) {
  const base = 'inline-flex items-center justify-center font-bold transition-all active:scale-95 duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'h-12 px-6 bg-primary-container text-white rounded-full hover:opacity-90 shadow-sm hover:shadow-md hover:shadow-primary-container/20',
    secondary: 'h-12 px-6 bg-white border border-outline-variant text-on-surface rounded-full hover:bg-surface-container',
    ghost: 'h-12 px-6 text-primary hover:bg-primary-fixed/20 rounded-full',
    dark: 'h-12 px-6 bg-on-surface text-surface-lowest rounded-xl hover:opacity-90',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
