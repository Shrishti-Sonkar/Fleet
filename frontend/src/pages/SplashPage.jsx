import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

export default function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate(ROUTES.LOGIN), 2500)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full px-margin-mobile overflow-hidden bg-surface-container-lowest">
      {/* Logo Section */}
      <div className="flex flex-col items-center text-center z-10">
        {/* Brand Headline */}
        <h1 className="font-headline-xl text-headline-xl text-primary-container font-black tracking-tighter mb-xs">
          Fleet
        </h1>
        {/* Subtitle */}
        <div className="flex flex-col items-center space-y-sm">
          <p className="font-body-md text-body-md text-on-surface-variant opacity-60">
            Rent · Ride · Repeat
          </p>
          {/* Animated cycling words */}
          <div className="h-8 overflow-hidden flex items-center justify-center mt-md">
            <div className="flex flex-col items-center animate-bounce">
              <span className="font-headline-md text-headline-md text-primary uppercase tracking-widest block">
                Rent
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Motorcycle silhouette */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none">
        <img
          alt="Motorcycle Silhouette"
          className="w-full opacity-5 transform translate-y-8"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTWkwlvbZYouhHB_7qwhKAOdXsX-LxZzXoRcM1UVgmGvZdDnc1zbfm44sjLxyFOtZ6S-uozp0kZ2sO4iWlIc5H9trNgtomkJpug4TXy7MKDfax5DpUXqbNi-8sWuBUe_JGHoUHa94zxNBLIlIrjOjpj_ti2V0Rh6yUoAzhh38N5hwf_FBH9P_dnx2uz6h79B-zQPvrK7e-dwBLBAQSL6fzvxEQLUKsRzti5OGz9TOhHdLsP87LkhFl0zvJyEadRRFGNUg6POMId2KL"
          style={{ filter: 'sepia(100%) saturate(500%) hue-rotate(340deg)' }}
        />
      </div>

      {/* Decorative lines */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-10 w-24 h-[1px] bg-primary" />
        <div className="absolute top-1/3 right-20 w-32 h-[1px] bg-primary" />
        <div className="absolute bottom-1/4 left-1/4 w-16 h-[1px] bg-primary" />
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-16 flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-primary-container rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Footer version */}
      <div className="fixed bottom-lg left-0 w-full flex justify-center pointer-events-none">
        <span className="font-label-sm text-label-sm text-outline opacity-40">
          v 1.0.4 · High Velocity Mobility
        </span>
      </div>
    </main>
  )
}
