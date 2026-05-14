import TopNavBar from './TopNavBar'
import BottomTabBar from './BottomTabBar'

export default function PageLayout({ children, showBottomBar = true, className = '' }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      <TopNavBar />
      <main className={`mt-[68px] ${showBottomBar ? 'pb-16 md:pb-0' : ''} ${className}`}>
        {children}
      </main>
      {showBottomBar && <BottomTabBar />}
    </div>
  )
}
