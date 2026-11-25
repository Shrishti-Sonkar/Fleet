import { motion } from 'framer-motion'
import SearchWidget from '@/components/sections/SearchWidget'
import { useSiteConfig } from '@/hooks/useSiteConfig'

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
}

const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function HeroSection() {
    const siteConfig = useSiteConfig()

    return (
        <section className="relative min-h-[600px] flex items-center bg-surface-container-lowest overflow-hidden">
            <div className="max-w-screen-2xl mx-auto px-gutter grid md:grid-cols-12 items-center gap-12 w-full">

                {/* Content */}
                <motion.div
                    className="md:col-span-12 space-y-8 z-10 py-4 max-w-3xl mx-auto flex flex-col items-center"
                    variants={container}
                    initial="hidden"
                    animate="show"
                >
                    {siteConfig.announcementEnabled && siteConfig.announcementText && (
                        <motion.div variants={item} className="px-4 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold tracking-wide text-center">
                            {siteConfig.announcementText}
                        </motion.div>
                    )}

                    {(siteConfig.heroTitle || siteConfig.heroSubtitle) && (
                        <motion.div variants={item} className="text-center space-y-2">
                            {siteConfig.heroTitle && (
                                <h1 className="text-3xl md:text-5xl font-black text-on-surface tracking-tight">{siteConfig.heroTitle}</h1>
                            )}
                            {siteConfig.heroSubtitle && (
                                <p className="text-sm md:text-base text-on-surface-variant max-w-xl mx-auto">{siteConfig.heroSubtitle}</p>
                            )}
                        </motion.div>
                    )}

                    <motion.div variants={item} className="w-full flex justify-center">
                        <SearchWidget />
                    </motion.div>

                    {/* Trust row */}
                    <motion.div variants={item} className="flex flex-wrap justify-center gap-4 items-center opacity-80">
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
                    </motion.div>
                </motion.div>


            </div>
        </section>
    )
}
