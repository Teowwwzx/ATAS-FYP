'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { BellIcon } from '@radix-ui/react-icons'
import { adminService } from '@/services/admin.service'

export function AdminNotificationBell() {
  const { data, mutate } = useSWR(['audit-logs', 'broadcast_notification'], () => adminService.getAuditLogs({ action: 'broadcast_notification', page_size: 10 }), {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  })
  const [open, setOpen] = useState(false)
  const [lastView, setLastView] = useState<number>(() => {
    try {
      const v = localStorage.getItem('atas_admin_notifications_last_view')
      return v ? parseInt(v, 10) : 0
    } catch { return 0 }
  })

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#admin-notification-bell')) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const items = useMemo(() => data || [], [data])
  const unreadCount = useMemo(() => items.filter(it => new Date(it.created_at).getTime() > lastView).length, [items, lastView])

  const markAllRead = () => {
    const ts = Date.now()
    setLastView(ts)
    try { localStorage.setItem('atas_admin_notifications_last_view', String(ts)) } catch { }
  }

  return (
    <div id="admin-notification-bell" className="relative">
      <button
        aria-label="Notifications"
        onClick={() => { setOpen(v => !v); if (!open) mutate() }}
        className="relative p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="font-bold text-gray-900">Notifications</div>
            <button onClick={markAllRead} className="text-xs text-gray-600 hover:text-gray-900">Mark all read</button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.map(it => (
              <li key={it.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                <div className="text-sm font-medium text-gray-900">{it.action.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-600 truncate">{it.details || 'Broadcast sent'}</div>
                <div className="text-[10px] text-gray-500 mt-1">{new Date(it.created_at).toLocaleString()}</div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-600">No notifications</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

