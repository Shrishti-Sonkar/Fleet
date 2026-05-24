const StarRow = ({ count }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`text-sm ${i <= count ? 'text-amber-400' : 'text-outline-variant'}`}>
        ★
      </span>
    ))}
  </div>
)

export default function ReviewCard({ review }) {
  const timeAgo = (ts) => {
    if (!ts) return ''
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts)
      const diff = (new Date() - date) / 1000
      if (diff < 60) return 'Just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch (err) {
      console.error(err)
      return ''
    }
  }

  const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden border border-outline-variant">
          {review.renterPhoto ? (
            <img src={review.renterPhoto} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : (
            getInitials(review.renterName || 'A')
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm text-on-surface truncate">
              {review.renterName || 'Anonymous'}
            </p>
            <span className="text-xs text-secondary flex-shrink-0">
              {timeAgo(review.createdAt)}
            </span>
          </div>

          {/* Star rating */}
          <div className="flex items-center gap-2 mt-0.5">
            <StarRow count={Math.round(review.rating || 0)} />
            <span className="text-xs font-bold text-on-surface">
              {Number(review.rating || 0).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-secondary mt-3 leading-relaxed italic">
          "{review.comment}"
        </p>
      )}

      {/* Tags */}
      {review.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {review.tags.map(tag => (
            <span
              key={tag}
              className="text-[11px] font-semibold bg-surface-container text-secondary px-2.5 py-1 rounded-full border border-outline-variant/35"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Sub-ratings */}
      {review.subRatings && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-outline-variant">
          {[
            { label: 'Cleanliness', value: review.subRatings.cleanliness },
            { label: 'Condition', value: review.subRatings.condition },
            { label: 'Owner', value: review.subRatings.responsiveness },
          ].map(({ label, value }) => value !== undefined && value !== null && value !== 0 && (
            <div key={label} className="text-center">
              <p className="text-xs font-bold text-on-surface">
                {Number(value).toFixed(1)} ★
              </p>
              <p className="text-[10px] text-secondary mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
