import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

export default function VehicleCard({ vehicle }) {
  const { id, name, badge, imageUrl, fuelType, cc, dailyPrice, rating, reviewCount } = vehicle

  const badgeClass = badge?.toLowerCase() === 'popular' ? 'bg-on-surface text-surface-lowest' :
    badge?.toLowerCase() === 'electric' ? 'bg-secondary-container text-on-secondary-container' :
    'bg-inverse-surface text-on-tertiary'

  return (
    <article className="bg-surface-container-lowest rounded-xl p-4 vehicle-card-shadow group border border-surface-variant hover:border-primary-container transition-all duration-300">
      {/* Image */}
      <div className="relative h-48 mb-6 overflow-hidden rounded-lg bg-surface flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-surface-dim/20 to-transparent" />
        <img
          src={imageUrl}
          alt={name}
          className="h-40 w-auto object-contain z-10 group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {badge && (
          <span className={`absolute top-3 left-3 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase z-20 ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="font-headline-sm text-[20px] font-bold text-on-surface leading-tight">{name}</h2>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
            <span className="text-label-md font-label-md text-on-surface-variant">Verified Partner</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="font-bold text-body-lg">{rating}</span>
          </div>
          <span className="text-[12px] text-on-surface-variant">({reviewCount} reviews)</span>
        </div>
      </div>

      {/* Engine info */}
      <div className="flex items-center gap-1 text-on-surface-variant text-label-md mb-4">
        <span className="material-symbols-outlined text-[16px]">
          {fuelType === 'Electric' ? 'ev_station' : 'speed'}
        </span>
        <span>{fuelType === 'Electric' ? 'Electric' : fuelType} • {cc}</span>
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-variant">
        <div>
          <span className="text-headline-sm text-primary font-black">₹{dailyPrice.toLocaleString('en-IN')}</span>
          <span className="text-on-surface-variant text-label-md font-medium"> / day</span>
        </div>
        <Link
          to={ROUTES.VEHICLE_DETAIL(id)}
          className="bg-primary-container text-white px-5 py-2.5 rounded-full font-bold text-label-md transition-all active:scale-95 hover:opacity-90"
        >
          Book Now
        </Link>
      </div>
    </article>
  )
}
