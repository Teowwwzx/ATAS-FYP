// frontend/app/(app)/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getMyEvents } from '@/services/api'
import type { MyEventItem } from '@/services/api.types'

export default function DashboardPage() {
    const [todayEvents, setTodayEvents] = useState<MyEventItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMyEvents = async () => {
            try {
                const items = await getMyEvents()
                const now = new Date()
                const eventsToday = items.filter((item) => {
                    const start = new Date(item.start_datetime)
                    const end = new Date(item.end_datetime)
                    return now >= start && now <= end
                })
                setTodayEvents(eventsToday)
            } catch (e: any) {
                setError(e?.response?.data?.detail || 'Failed to load your events')
            } finally {
                setLoading(false)
            }
        }
        fetchMyEvents()
    }, [])

    const openAttendanceQR = (eventId: string) => {
        const url = `http://localhost:8000/api/v1/events/${eventId}/attendance/qr.png?minutes_valid=15`
        window.open(url, '_blank')
    }

    return (
        <div className="rounded-lg bg-white p-6 shadow-md space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to your Dashboard</h1>
            <p className="mt-2 text-gray-600">This is where you'll see your upcoming events, pending requests, and more.</p>

            <div className="mt-6">
                <h2 className="text-xl font-semibold">Today's events</h2>
                {loading ? (
                    <div className="text-gray-600">Loading...</div>
                ) : error ? (
                    <div className="text-red-600">{error}</div>
                ) : todayEvents.length === 0 ? (
                    <div className="text-gray-600">No events today.</div>
                ) : (
                    <ul className="space-y-3">
                        {todayEvents.map((evt) => (
                            <li key={evt.event_id} className="flex items-center justify-between border rounded p-4">
                                <div>
                                    <div className="font-medium">{evt.title}</div>
                                    <div className="text-sm text-gray-600">
                                        {new Date(evt.start_datetime).toLocaleTimeString()} - {new Date(evt.end_datetime).toLocaleTimeString()}
                                    </div>
                                </div>
                                {(evt.my_role === 'organizer' || evt.my_role === 'committee') ? (
                                    <button
                                        className="px-3 py-2 rounded bg-primary-600 text-white hover:bg-primary-700"
                                        onClick={() => openAttendanceQR(evt.event_id)}
                                    >
                                        Take attendance
                                    </button>
                                ) : (
                                    <span className="text-sm text-gray-500">Attendance available during event</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}