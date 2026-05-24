import { Link } from 'react-router-dom'
import { ROUTES } from '../../lib/constants'
import VehicleCard from './VehicleCard'

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
            <div key={v.id} className="min-w-[320px] snap-start">
              <VehicleCard vehicle={v} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
