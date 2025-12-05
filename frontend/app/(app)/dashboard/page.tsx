'use client'

import React, { useEffect, useState } from 'react'
import { getMyEvents, getMyProfile, getEventById } from '@/services/api'
import { EventDetails, ProfileResponse } from '@/services/api.types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardHeroCard } from './DashboardHeroCard'
import { DashboardTabs } from './DashboardTabs'
import { toast } from 'react-hot-toast'
import { EventInviteModal } from './EventInviteModal'
import { EventPreviewModal } from './EventPreviewModal'

export default function DashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [nextEvent, setNextEvent] = useState<EventDetails | null>(null)
    const [user, setUser] = useState<ProfileResponse | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [eventsData, profileData] = await Promise.all([
                getMyEvents(),
                getMyProfile()
            ])

            setUser(profileData)

            // Find the most relevant upcoming event
            // Note: MyEventItem uses event_id, not id
            const sorted = eventsData.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
            const now = new Date()
            const upcomingItem = sorted.find(e => new Date(e.end_datetime) > now) || sorted[sorted.length - 1]

            if (upcomingItem) {
                // Fetch full details for the hero event to satisfy EventCard props (and get 'id' vs 'event_id')
                const fullEvent = await getEventById(upcomingItem.event_id)
                setNextEvent(fullEvent)
            } else {
                setNextEvent(null)
            }

        } catch (error) {
            console.error(error)
            toast.error('Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
                <Skeleton height="400px" className="rounded-[2.5rem]" />
            </div>
        )
    }

    return (
        <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh]">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full animate-fadeIn">
                    <div>
                        <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">
                            Welcome back, {user?.full_name?.split(' ')[0]}!
                        </h1>
                        <p className="text-zinc-500 font-medium">
                            Here is your next upcoming event.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="px-6 py-2.5 bg-white border-2 border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => toast.success('Event Published!')}
                            className="px-6 py-2.5 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Publish
                        </button>
                    </div>
                </div>

                {/* Event Card Or Empty State */}
                {nextEvent ? (
                    <div className="w-full animate-fadeIn pb-12">
                        <DashboardHeroCard
                            event={nextEvent}
                            onPreview={() => setIsPreviewOpen(true)}
                        />

                        <DashboardTabs
                            event={nextEvent}
                            user={user}
                            onUpdate={fetchData}
                        />
                    </div>
                ) : (
                    <div className="w-full max-w-2xl">
                        <EmptyState
                            title="No Upcoming Events"
                            description="You haven't created any events yet. Host your first event today!"
                            actionLabel="Create Event"
                            onAction={() => router.push('/events/create')}
                        />
                    </div>
                )}

                <EventPreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    event={nextEvent}
                />

            </div>
        </div>
    )
}
