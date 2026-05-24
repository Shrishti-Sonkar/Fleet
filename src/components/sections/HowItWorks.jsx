const DEFAULT_STEPS = [
  { icon: 'search', title: 'Search', desc: 'Pick your location and find the perfect ride from our curated fleet.' },
  { icon: 'lock_clock', title: 'Book', desc: 'Verify your ID and make a secure payment to confirm your booking.' },
  { icon: 'motorcycle', title: 'Ride', desc: 'Pick up the keys from the host and start your Himalayan adventure.' },
]

export default function HowItWorks({
  title = 'Rent in 3 steps',
  steps = DEFAULT_STEPS,
}) {
  return (
    <section className="py-section-padding-lg bg-surface">
      <div className="max-w-screen-2xl mx-auto px-gutter">
        <div className="text-center mb-16">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">{title}</h2>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
        </div>
        <div className="relative grid md:grid-cols-3 gap-12 text-center">
          <div className="hidden md:block absolute top-1/4 left-1/4 right-1/4 h-[2px] border-t-2 border-dashed border-outline-variant -z-0" />
          {steps.map(step => (
            <div key={step.title} className="relative z-10 group">
              <div className="w-20 h-20 bg-surface-container-lowest shadow-premium rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-[32px]">{step.icon}</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-2">{step.title}</h3>
              <p className="text-on-surface-variant font-body-lg text-body-lg">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
