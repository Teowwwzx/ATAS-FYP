'use client'

import React, { useEffect, useState } from 'react'
import { getMyEvents, getMyProfile, getEventById, getMe, getMyChecklistItems } from '@/services/api'
import { EventDetails, ProfileResponse, UserMeResponse } from '@/services/api.types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardHeroCard } from './DashboardHeroCard'
import { DashboardTabs } from './DashboardTabs'
import { toast } from 'react-hot-toast'
import { EventInviteModal } from './EventInviteModal'
import { EventPreviewModal } from './EventPreviewModal'
import { DashboardEventList } from './DashboardEventList'
import { MyEventItem } from '@/services/api.types'

export default function DashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [view, setView] = useState<'list' | 'detail'>('list')

    // Detail View State
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
    const [nextEvent, setNextEvent] = useState<EventDetails | null>(null)
    const [role, setRole] = useState<string | null>(null)

    // Global State
    const [user, setUser] = useState<ProfileResponse | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [me, setMe] = useState<UserMeResponse | null>(null)
    const [openChecklistCount, setOpenChecklistCount] = useState(0)

    useEffect(() => {
        fetchData()
    }, [])

    // If an event is selected, fetch its full details
    useEffect(() => {
        if (selectedEventId) {
            fetchEventDetails(selectedEventId)
        }
    }, [selectedEventId])

    const fetchData = async () => {
        try {
            const [eventsData, profileData, meData, checklistItems] = await Promise.all([
                getMyEvents(),
                getMyProfile(),
                getMe().catch(() => null),
                getMyChecklistItems(true).catch(() => [])
            ])

            setEvents(eventsData)
            setUser(profileData)
            setMe(meData)
            setOpenChecklistCount((checklistItems || []).length)

            // Auto-select if only 1 organized event
            const organized = eventsData.filter(e => e.my_role === 'organizer')
            if (organized.length === 1) {
                setSelectedEventId(organized[0].event_id)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    const fetchEventDetails = async (eventId: string) => {
        setLoading(true)
        try {
            const fullEvent = await getEventById(eventId)
            // find role from list
            const listItem = events.find(e => e.event_id === eventId)
            setNextEvent(fullEvent)
            setRole(listItem?.my_role || null)
            setView('detail')
        } catch (error: any) {
            console.error(error)
            if (error?.response?.status === 404) {
                toast.error('Event not found or has been deleted')
                // Remove from local list to preventing re-clicking
                setEvents(prev => prev.filter(e => e.event_id !== eventId))
                setSelectedEventId(null)
            } else {
                toast.error('Failed to load event details')
            }
            setView('list')
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        setView('list')
        setSelectedEventId(null)
        setNextEvent(null)
    }

    if (loading && view === 'list' && events.length === 0) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
                <Skeleton height="400px" className="rounded-[2.5rem]" />
            </div>
        )
    }

    return (
        <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center">

                {view === 'list' ? (
                    <DashboardEventList
                        events={events}
                        user={user}
                        me={me}
                        onSelect={(e) => setSelectedEventId(e.event_id)}
                        onCreate={() => router.push('/events/create')}
                        onProUpgrade={fetchData}
                    />
                ) : (
                    // DETAIL VIEW
                    <>
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full animate-fadeIn">
                            <div>
                                {/* Only show back button for Dashboard Pro users */}
                                {me?.is_dashboard_pro && (
                                    <button
                                        onClick={handleBack}
                                        className="mb-4 text-sm font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to Events
                                    </button>
                                )}
                            </div>
                            {user?.user_id === nextEvent?.organizer_id && (
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
                            )}
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
                                    role={role}
                                    onUpdate={() => fetchEventDetails(selectedEventId!)}
                                    onDelete={() => {
                                        setSelectedEventId(null)
                                        setNextEvent(null)
                                        setView('list')
                                        fetchData()
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-full max-w-2xl text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                            </div>
                        )}
                    </>
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
