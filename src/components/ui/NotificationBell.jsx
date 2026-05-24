import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../context/AuthContext'

const TYPE_CONFIG = {
  booking_approved: { icon: 'check_circle',      color: 'text-green-500'  },
  booking_rejected: { icon: 'cancel',             color: 'text-red-500'    },
  new_booking_request: { icon: 'notifications',   color: 'text-primary'    },
  ride_started:        { icon: 'directions_car',  color: 'text-blue-500'   },
  ride_completed:      { icon: 'flag',            color: 'text-green-500'  },
  kyc_approved:        { icon: 'verified_user',   color: 'text-green-500'  },
  kyc_rejected:        { icon: 'gpp_bad',         color: 'text-red-500'    },
  review_received:     { icon: 'star',            color: 'text-amber-500'  },
  default:             { icon: 'notifications',   color: 'text-secondary'  },
}

function timeAgo(timestamp) {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const diff = Date.now() - date.getTime()
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.uid)
  const [open, setOpen]   = useState(false)
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleItemClick = async (n) => {
    setOpen(false)
    if (!n.read) {
      await markAsRead(n.id)
    }
    if (n.actionUrl) {
      navigate(n.actionUrl)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={() => setOpen(v => !v)}
        className="relative w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-all"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-on-surface text-[22px]">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary-container text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[90vw] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <h3 className="font-bold text-on-surface">Notifications</h3>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-label-sm text-primary font-bold hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/notifications') }}
                className="text-label-sm text-secondary font-bold hover:underline"
              >
                View all
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-outline-variant">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-secondary">
                <span className="material-symbols-outlined text-[40px] mb-2">notifications_off</span>
                <p className="text-label-md">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-container transition-all ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] mt-0.5 shrink-0 ${cfg.color}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {cfg.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-label-md font-bold text-on-surface leading-snug">{n.title}</p>
                      <p className="text-[12px] text-secondary mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-secondary/70 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
