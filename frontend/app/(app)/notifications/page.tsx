'use client'

import React, { useEffect, useState } from 'react'
import { getNotifications, markNotificationRead, NotificationItem } from '@/services/api'
import { formatDistanceToNow } from 'date-fns' // You might need to install date-fns or use basic formatter
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)
        } catch (error) {
            console.error('Failed to load notifications')
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        await markNotificationRead(id)
    }

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
                <Skeleton height="80px" className="rounded-2xl" />
                <Skeleton height="80px" className="rounded-2xl" />
                <Skeleton height="80px" className="rounded-2xl" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Notifications</h1>
                </div>
                {/* Optional: 'Mark all as read' button could go here */}
            </div>

            {notifications.length === 0 ? (
                <EmptyState
                    title="No notifications yet"
                    description="We will let you know when something important happens."
                />
            ) : (
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                            className={`group relative flex items-start p-5 rounded-2xl border transition-all ${notification.read
                                ? 'bg-white border-zinc-100'
                                : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                                }`}
                        >
                            <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${notification.read ? 'bg-transparent' : 'bg-blue-500'
                                }`} />

                            <div className="ml-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`text-base font-bold ${notification.read ? 'text-zinc-900' : 'text-blue-900'}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-xs font-medium text-zinc-400 whitespace-nowrap ml-2">
                                        {/* Simple relative time if date-fns not avail, or just string */}
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className={`mt-1 text-sm ${notification.read ? 'text-zinc-500' : 'text-blue-800/80'}`}>
                                    {notification.message}
                                </p>
                                {notification.link && (
                                    <div className="mt-2 text-xs text-blue-500 font-bold hidden">
                                        Link: {notification.link}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
