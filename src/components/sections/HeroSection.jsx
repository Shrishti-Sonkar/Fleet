import SearchWidget from '@/components/sections/SearchWidget'

export default function HeroSection() {
    return (
        <section className="relative min-h-[870px] flex items-center bg-surface-container-lowest overflow-hidden">
            <div className="max-w-screen-2xl mx-auto px-gutter grid md:grid-cols-12 items-center gap-12 w-full">

                {/* Left content */}
                <div className="md:col-span-6 space-y-8 z-10 py-12">
                    <div className="inline-block px-4 py-1.5 bg-primary-fixed text-on-primary-fixed rounded-full font-label-md text-label-md font-bold tracking-wide uppercase">
                        INDIA'S FASTEST-GROWING RENTAL PLATFORM
                    </div>

                    <h1 className="font-display text-display leading-tight">
                        Rent. Ride. Repeat.{' '}
                        <span className="text-primary">
                            Explore the Himalayas
                        </span>{' '}
                        on your own terms.
                    </h1>

                    <SearchWidget />

                    {/* Trust row */}
                    <div className="flex flex-wrap gap-4 items-center opacity-80">
                        {[
                            { icon: 'verified_user', label: 'Verified Hosts' },
                            { icon: 'speed', label: 'Instant Booking' },
                            { icon: 'security', label: 'Fully Insured' },
                        ].map(item => (
                            <div
                                key={item.label}
                                className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high rounded-full"
                            >
                                <span
                                    className="material-symbols-outlined text-[18px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    {item.icon}
                                </span>

                                <span className="text-label-md font-label-md">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right – hero image */}
                <div className="md:col-span-6 relative h-[600px] flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full blur-3xl opacity-10 bg-primary" />

                    <div className="relative w-full h-full flex items-center justify-center perspective-1000">
                        <div className="bg-surface-container w-4/5 h-[20px] absolute bottom-1/4 rounded-[100%] opacity-20 blur-xl" />

                        <img
                            alt="Luxury Motorcycle"
                            className="w-full h-auto object-contain drop-shadow-2xl z-10 rotate-y-12"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlFTsemsAE3PvgrWne188Q_eHfFfvpyQU-Rypj4BFHMRYRUbga_TmOrwXFe_Xulk5PL6Ae_ELT-_y7gY6nE5RCA8b8Kxq3lVVz_8TgBLlG6e_LLrJU4wVQ-1ziHlW7IXoEv3KcZCJg5Wk8TGHGZB6xfbL1SUUo704PRMEUUSwg2cMP4VIFcLC7HPtwnepE9PHZA3wCsP0d9T9wTIwE5IX4o3DSXXA5pImSxY3dqjZvF06KAV7j25yftGQ5mrh50XjGOe0ZyqoBWhZO"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}