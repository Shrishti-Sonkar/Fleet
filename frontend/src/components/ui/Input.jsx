export default function Input({ label, type = 'text', placeholder, value, onChange, icon, className = '', id, required }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant ml-1 block">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full h-12 ${icon ? 'pl-10' : 'pl-4'} pr-4 rounded-xl bg-surface border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all font-body-lg text-body-lg text-on-surface`}
        />
      </div>
    </div>
  )
}
