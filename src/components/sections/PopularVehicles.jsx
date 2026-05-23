import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

export default function PopularVehicles({
  title = 'Ride what the locals love',
  subtitle = 'Our top picks for the week in Uttarakhand.',
  vehicles = [],
}) {
  return (
    <section className="py-section-padding-lg bg-surface-container-lowest">
      <div className="max-w-screen-2xl mx-auto px-gutter">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
            <p className="text-on-surface-variant font-body-lg text-body-lg">{subtitle}</p>
          </div>
          <Link to={ROUTES.BROWSE} className="flex items-center gap-2 text-primary font-bold hover:underline">
            View All <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
        <div className="flex gap-gutter overflow-x-auto pb-8 snap-x no-scrollbar">
          {vehicles.map(v => (
            <div key={v.id} className="min-w-[280px] snap-start">
              <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-premium group">
                <div className="bg-surface-container-low rounded-lg h-40 mb-4 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                  <img
                    alt={v.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                    src={v.imageUrl}
                    loading="lazy"
                  />
                  {v.badge === 'Popular' && (
                    <div className="absolute top-2 left-2 bg-on-surface text-surface-lowest px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      Popular
                    </div>
                  )}
                </div>
                <h4 className="font-headline-sm text-[20px] mb-1">{v.name}</h4>
                <div className="flex items-center gap-1 text-on-surface-variant text-label-md mb-4">
                  <span className="material-symbols-outlined text-[16px]">
                    {v.fuelType === 'Electric' ? 'ev_station' : 'bolt'}
                  </span>
                  {v.category} • {v.cc}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-outline-variant">
                  <div>
                    <span className="font-black text-on-surface text-headline-sm">₹{v.dailyPrice.toLocaleString('en-IN')}</span>
                    <span className="text-on-surface-variant text-label-md">/day</span>
                  </div>
                  <Link to={ROUTES.VEHICLE_DETAIL(v.id)} className="bg-primary-container p-2 rounded-lg text-white hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined">add</span>
                  </Link>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
