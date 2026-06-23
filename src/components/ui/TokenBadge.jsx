import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function TokenBadge({ size = 'default' }) {
  const { userDoc } = useAuth()
  const tokens = userDoc?.tokens ?? 0

  const urgency = useMemo(() => {
    if (tokens <= 0)  return 'empty'
    if (tokens <= 3)  return 'low'
    if (tokens <= 10) return 'medium'
    return 'high'
  }, [tokens])

  const styles = {
    empty:  'bg-red-100 text-red-700 border-red-200',
    low:    'bg-yellow-100 text-yellow-700 border-yellow-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    high:   'bg-green-100 text-green-700 border-green-200',
  }

  if (size === 'compact') {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-bold ${styles[urgency]}`}>
        <span
          className="material-symbols-outlined text-[13px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          token
        </span>
        {tokens}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${styles[urgency]}`}>
      <span
        className="material-symbols-outlined text-[16px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        token
      </span>
      <span className="text-[11px] font-black">{tokens}</span>
      <span className="text-[10px] font-medium opacity-70">tokens</span>
      {urgency === 'empty' && (
        <span className="text-[10px] font-bold animate-pulse ml-0.5">Buy</span>
      )}
    </div>
  )
}
