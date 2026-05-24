import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import PageLayout from '../components/layout/PageLayout'

const NOTIF_ICONS = {
  booking_approved:    '✅',
  booking_rejected:    '❌',
  new_booking_request: '🔔',
  ride_started:        '🚗',
  ride_completed:      '🏁',
  kyc_approved:        '🪪',
  kyc_rejected:        '⚠️',
  review_received:     '⭐',
  system:              '📢',
}

const timeAgo = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const diff = (new Date() - date) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const groupNotifications = (notifications) => {
  const now = new Date()
  const todayStr = now.toDateString()
  const yesterdayStr = new Date(now - 86400000).toDateString()

  return notifications.reduce((groups, notif) => {
    const d = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt || 0)
    const key = d.toDateString() === todayStr
      ? 'Today'
      : d.toDateString() === yesterdayStr
        ? 'Yesterday'
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

    if (!groups[key]) groups[key] = []
    groups[key].push(notif)
    return groups
  }, {})
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications(user?.uid)

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id)
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl)
    }
  }

  const grouped = groupNotifications(notifications)
  const groupKeys = Object.keys(grouped)

  return (
    <PageLayout showBottomBar={false}>
      <div className="max-w-md mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-on-surface">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-bold text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-4">🔔</span>
            <p className="font-semibold text-on-surface">No notifications yet</p>
            <p className="text-sm text-secondary mt-1">
              We'll let you know about bookings, rides & more
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupKeys.map((groupName) => (
              <div key={groupName} className="space-y-3">
                <p className="text-[11px] font-bold text-secondary uppercase tracking-wider pl-1">
                  {groupName}
                </p>
                <div className="space-y-2">
                  {grouped[groupName].map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer active:scale-[0.98] transition-all border border-outline-variant
                        ${!notif.read
                          ? 'bg-primary/5 border-primary/25 shadow-sm'
                          : 'bg-surface-container-lowest hover:bg-surface-container'}`}
                    >
                      {/* Unread indicator */}
                      <div className="flex-shrink-0 mt-1.5 w-2 h-2 flex items-center justify-center">
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>

                      {/* Icon */}
                      <span className="text-2xl flex-shrink-0 leading-none">
                        {NOTIF_ICONS[notif.type] ?? '🔔'}
                      </span>

                      {/* Text details */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug 
                          ${!notif.read ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-secondary mt-0.5 leading-snug">
                          {notif.body}
                        </p>
                        <p className="text-[10px] text-secondary mt-1 font-medium">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>

                      {notif.actionUrl && (
                        <span className="material-symbols-outlined text-secondary text-[16px] self-center shrink-0">
                          chevron_right
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </PageLayout>
  )
}
