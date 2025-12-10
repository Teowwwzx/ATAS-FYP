'use client'

import React, { useEffect, useState } from 'react'
import { getMyEvents, getMyProfile, getEventById, getMe, getMyChecklistItems, getMyRequests, respondInvitationMe, publishEvent } from '@/services/api'
import { EventDetails, ProfileResponse, UserMeResponse, EventInvitationResponse, MyEventItem } from '@/services/api.types'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardHeroCard } from './DashboardHeroCard'
import { DashboardTabs } from './DashboardTabs'
import { toast } from 'react-hot-toast'
import { EventInviteModal } from './EventInviteModal'
import { EventPreviewModal } from './EventPreviewModal'
import { DashboardEventList } from './DashboardEventList'

export default function DashboardPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlEventId = searchParams.get('eventId')

    const [loading, setLoading] = useState(true)
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [requests, setRequests] = useState<EventInvitationResponse[]>([])
    const [processingReq, setProcessingReq] = useState<string | null>(null)
    const [view, setView] = useState<'list' | 'detail'>('list')

    // Detail View State
    const [selectedEventId, setSelectedEventId] = useState<string | null>(urlEventId || null)
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
            const [eventsData, profileData, meData, checklistItems, requestsData] = await Promise.all([
                getMyEvents(),
                getMyProfile(),
                getMe().catch(() => null),
                getMyChecklistItems(true).catch(() => []),
                getMyRequests().catch(() => [])
            ])

            setEvents(eventsData)
            setUser(profileData)
            setRequests(requestsData)
            setMe(meData)
            setOpenChecklistCount((checklistItems || []).length)

            // Auto-select if only 1 organized event (OPTIONAL: Maybe disable this if we have pending requests?)
            // Keeping original logic for now as user likes it.
            const organized = eventsData.filter(e => e.my_role === 'organizer')
            if (organized.length === 1 && requestsData.length === 0) {
                setSelectedEventId(organized[0].event_id)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    const handleRespond = async (invitationId: string, eventId: string, status: 'accepted' | 'rejected') => {
        setProcessingReq(invitationId)
        try {
            // Using existing endpoint instead of generic request endpoint
            await respondInvitationMe(eventId, { status })
            toast.success(status === 'accepted' ? 'Invitation accepted!' : 'Invitation declined')
            // Refresh data
            fetchData()
        } catch (error) {
            console.error(error)
            toast.error('Failed to respond to invitation')
        } finally {
            setProcessingReq(null)
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

    // Filter for upcoming bookings (accepted events where I am NOT organizer)
    const upcomingBookings = events.filter(e =>
        e.my_role !== 'organizer' &&
        e.my_status === 'accepted' &&
        new Date(e.start_datetime) > new Date()
    )

    return (
        <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center">

                {view === 'list' ? (
                    <>
                        {/* EXPERT DASHBOARD SECTION */}
                        <div className="w-full max-w-5xl mb-12 space-y-8">
                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-xl">
                                        {requests.length}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Pending Invites</div>
                                        <div className="text-zinc-900 font-bold">Action Required</div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                                        {upcomingBookings.length}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Upcoming Gigs</div>
                                        <div className="text-zinc-900 font-bold">Confirmed</div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xl">
                                        {events.filter(e => e.my_role === 'organizer').length}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Organized</div>
                                        <div className="text-zinc-900 font-bold">My Events</div>
                                    </div>
                                </div>
                            </div>

                            {/* Pending Requests */}
                            {requests.length > 0 && (
                                <div className="animate-fadeIn">
                                    <h2 className="text-2xl font-black text-zinc-900 mb-6 flex items-center gap-2">
                                        <span className="w-2 h-8 bg-yellow-400 rounded-full"></span>
                                        Pending Invitations
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {requests.map(req => (
                                            <div key={req.id} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-lg relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold uppercase tracking-wider text-zinc-600">
                                                            Invited as {req.role}
                                                        </span>
                                                        <span className="text-xs font-mono text-zinc-400">
                                                            {new Date(req.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-xl font-bold text-zinc-900 mb-2 truncate group-hover:text-yellow-600 transition-colors cursor-pointer"
                                                        title={req.event.title}
                                                        onClick={() => router.push(`/dashboard/requests/${req.id}`)}
                                                    >
                                                        {req.event.title}
                                                    </h3>
                                                    <p className="text-zinc-500 text-sm mb-6 line-clamp-2">
                                                        {req.event.description || 'No description provided.'}
                                                    </p>

                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => router.push(`/dashboard/requests/${req.id}`)}
                                                            className="px-4 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                                                        >
                                                            Details
                                                        </button>
                                                        <button
                                                            onClick={() => handleRespond(req.id, req.event.id, 'accepted')}
                                                            disabled={processingReq === req.id}
                                                            className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-transform active:scale-95 disabled:opacity-50"
                                                        >
                                                            {processingReq === req.id ? '...' : 'Accept'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRespond(req.id, req.event.id, 'rejected')}
                                                            disabled={processingReq === req.id}
                                                            className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-transform active:scale-95 disabled:opacity-50"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Divider & My Events (Only show if organized events exist) */}
                            {events.some(e => e.my_role === 'organizer') && (
                                <>
                                    <div className="border-t border-zinc-100 pt-8" />
                                    <DashboardEventList
                                        events={events}
                                        user={user}
                                        me={me}
                                        onSelect={(e) => setSelectedEventId(e.event_id)}
                                        onCreate={() => router.push('/events/create')}
                                        onProUpgrade={fetchData}
                                    />
                                </>
                            )}
                        </div>
                    </>
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
                                        onClick={async () => {
                                            if (!nextEvent) return
                                            if (confirm('Are you ready to publish this event?')) {
                                                try {
                                                    await publishEvent(nextEvent.id)
                                                    toast.success('Event Published!')
                                                    fetchData()
                                                } catch (e) {
                                                    toast.error('Failed to publish event')
                                                }
                                            }
                                        }}
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
