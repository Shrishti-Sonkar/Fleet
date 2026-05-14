import PageLayout from '../components/layout/PageLayout'
import Footer from '../components/layout/Footer'
import { Link } from 'react-router-dom'

export default function AboutPage() {
  const stats = [
    { value: '15,000+', label: 'Happy Riders' },
    { value: '500+', label: 'Active Hosts' },
    { value: '2,000+', label: 'Vehicles Listed' },
    { value: '4.8/5', label: 'Avg. Rating' },
  ]

  const team = [
    { name: 'Arjun Mehta', role: 'Co-Founder & CEO', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkdTfdudfLzUcNEIsMXAKOmoh6UEXjOkq4oWiINHtCtIMyOb-COTaXsS1xArOINN1hdhcqVO8fys4m0GF2UBUjsyVtDXTlTECzPBIKy6HqwLnmf_g5Ix3DVFd95r3KyFOGdVy7WdRQjGhdp1wh-5Mjm9pT1WIIqFNBqfRtcJn4gLXp2AjklYe-kwcTM8N1R6ImA2_fFSCYfD9l8lrIgHYmIkl5n4ILYIULK_ZjB4ttGSDZhZ5F6zL2PNjPkUM2cSvHD-XmEgemzxoQ' },
    { name: 'Priya Kapoor', role: 'Co-Founder & CPO', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkdTfdudfLzUcNEIsMXAKOmoh6UEXjOkq4oWiINHtCtIMyOb-COTaXsS1xArOINN1hdhcqVO8fys4m0GF2UBUjsyVtDXTlTECzPBIKy6HqwLnmf_g5Ix3DVFd95r3KyFOGdVy7WdRQjGhdp1wh-5Mjm9pT1WIIqFNBqfRtcJn4gLXp2AjklYe-kwcTM8N1R6ImA2_fFSCYfD9l8lrIgHYmIkl5n4ILYIULK_ZjB4ttGSDZhZ5F6zL2PNjPkUM2cSvHD-XmEgemzxoQ' },
    { name: 'Rahul Singh', role: 'Head of Engineering', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkdTfdudfLzUcNEIsMXAKOmoh6UEXjOkq4oWiINHtCtIMyOb-COTaXsS1xArOINN1hdhcqVO8fys4m0GF2UBUjsyVtDXTlTECzPBIKy6HqwLnmf_g5Ix3DVFd95r3KyFOGdVy7WdRQjGhdp1wh-5Mjm9pT1WIIqFNBqfRtcJn4gLXp2AjklYe-kwcTM8N1R6ImA2_fFSCYfD9l8lrIgHYmIkl5n4ILYIULK_ZjB4ttGSDZhZ5F6zL2PNjPkUM2cSvHD-XmEgemzxoQ' },
  ]

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-primary-container text-white py-section-padding-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48" />
        </div>
        <div className="relative max-w-screen-2xl mx-auto px-gutter text-center">
          <h1 className="font-headline-md text-headline-md mb-6">We're reimagining mobility in the Himalayas</h1>
          <p className="font-body-lg text-body-lg opacity-90 max-w-2xl mx-auto mb-10">
            Fleet started in 2022 with a simple belief: every traveler deserves a world-class experience when exploring India's incredible mountain landscapes.
          </p>
          <Link to="/browse" className="inline-block bg-white text-primary px-10 py-4 rounded-full font-black hover:scale-105 transition-transform">
            Start Exploring
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-outline-variant">
        <div className="max-w-screen-2xl mx-auto px-gutter grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="font-black text-primary text-[48px] leading-none">{s.value}</div>
              <div className="text-secondary mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-section-padding-lg">
        <div className="max-w-screen-2xl mx-auto px-gutter grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-md text-headline-md mb-6">Our Mission</h2>
            <p className="text-secondary text-body-lg mb-6 leading-relaxed">
              Fleet was born out of a frustration. The founders wanted to explore the Kedarkantha trail but couldn't find a reliable, premium motorcycle rental in Dehradun. So they built one.
            </p>
            <p className="text-secondary text-body-lg leading-relaxed">
              Today, Fleet is the most trusted vehicle rental marketplace in Uttarakhand, connecting passionate explorers with responsible local vehicle owners.
            </p>
          </div>
          <div className="bg-surface-container rounded-3xl overflow-hidden h-[400px]">
            <img
              alt="Team"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCG6to6WAn9nAbhAK_3L2T7qhfF-unT40KqAxKGdaZoZ9RK2CWkF4SS0qA4bJLlKRRrSjh1jqb4I7fobdKvDPaNWF3VXGu-tl0W0tqBubkquJ9Z5z5ptS7NOGgm5w7mmp2m1CPgQ_xg5w9bT7BGjhtHCK4oV_mPInmevNZ3srGNRnt7-HGnphHi_CmOy2Q4ZKzhJDhtEYoLvqUKryqJQI2l5nhz91Jm30ioKZLnEs1ynTYFQBSjU2JSoXpmcaFozjb2UFMz1Ehy5Vuv"
            />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-section-padding-lg bg-surface-container-lowest">
        <div className="max-w-screen-2xl mx-auto px-gutter">
          <h2 className="font-headline-md text-headline-md text-center mb-12">The Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map(member => (
              <div key={member.name} className="text-center group">
                <div className="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden border-4 border-primary-fixed group-hover:border-primary transition-all">
                  <img alt={member.name} src={member.img} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-on-surface">{member.name}</h3>
                <p className="text-secondary text-label-md">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </PageLayout>
  )
}
