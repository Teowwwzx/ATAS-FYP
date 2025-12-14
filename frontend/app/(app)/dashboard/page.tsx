'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { getMyEvents, getMyProfile, getEventById, getMe, getMyChecklistItems, getMyRequests, respondInvitationMe, publishEvent, unpublishEvent, getEventAttendanceStats, getMyReview } from '@/services/api'
import { EventDetails, ProfileResponse, UserMeResponse, EventInvitationResponse, MyEventItem, EventAttendanceStats } from '@/services/api.types'
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
import { EventReviewModal } from '@/components/event/EventReviewModal'
import { getEventPhase, EventPhase } from '@/lib/eventPhases'
import { EnvelopeClosedIcon, CalendarIcon, DashboardIcon } from '@radix-ui/react-icons'

function DashboardPageInner() {
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
    const [attendanceStats, setAttendanceStats] = useState<EventAttendanceStats | null>(null)
    const [currentPhase, setCurrentPhase] = useState<EventPhase>(EventPhase.DRAFT)
    const [isReviewOpen, setIsReviewOpen] = useState(false)
    const [hasReviewed, setHasReviewed] = useState(false)
    const [checkingReview, setCheckingReview] = useState(false)

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
            // Auto-select if only 1 organized event AND no other activities (joined events or requests)
            const organized = eventsData.filter(e => e.my_role === 'organizer')
            const joined = eventsData.filter(e => e.my_role !== 'organizer')

            if (organized.length === 1 && joined.length === 0 && requestsData.length === 0) {
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

            // Calculate and set current phase
            const phase = getEventPhase(fullEvent)
            setCurrentPhase(phase)

            // Fetch attendance stats if user is organizer
            try {
                const stats = await getEventAttendanceStats(eventId)
                setAttendanceStats(stats)
            } catch (e) {
                // Stats might not be available yet, ignore error
                setAttendanceStats(null)
            }

            // Check review status if Post-Event and not organizer
            if (phase === EventPhase.POST_EVENT && user?.id !== fullEvent.organizer_id) {
                setCheckingReview(true)
                try {
                    const review = await getMyReview(eventId)
                    setHasReviewed(!!review)
                } catch {
                    setHasReviewed(false)
                } finally {
                    setCheckingReview(false)
                }
            }

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
        router.push('/dashboard')
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

    const upcomingBookings = events.filter(e =>
        e.my_role !== 'organizer' &&
        e.my_status === 'accepted' &&
        new Date(e.start_datetime) > new Date()
    )

    const organizerEvents = events.filter(e => e.my_role === 'organizer')
    const organizerPublishedCount = organizerEvents.filter(e => e.status === 'published').length
    const committeeEvents = events.filter(e => e.my_role === 'committee')
    const sponsorEvents = events.filter(e => e.my_role === 'sponsor')

    return (
        <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto px-4 py-8">
            <div className="flex gap-8">
                <aside className="hidden md:block w-64 shrink-0">
                    <button
                        onClick={() => router.push('/events/create')}
                        className="w-full px-4 py-3 bg-zinc-900 text-yellow-400 rounded-2xl font-black shadow-md hover:bg-zinc-800"
                    >
                        Create Event
                    </button>
                    <nav className="mt-6 space-y-2">
                        <button
                            onClick={() => { router.push('/dashboard'); setView('list'); setSelectedEventId(null) }}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-bold hover:bg-zinc-50"
                        >
                            <span className="flex items-center gap-2"><DashboardIcon /> Overview</span>
                        </button>
                        <button
                            onClick={() => { router.push('/dashboard'); setView('list'); setTimeout(() => { const el = document.getElementById('invitations'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 100) }}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-bold hover:bg-zinc-50"
                        >
                            <span className="flex items-center gap-2"><EnvelopeClosedIcon /> Invitations</span>
                            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">{requests.length}</span>
                        </button>
                        <button
                            onClick={() => { router.push('/dashboard'); setView('list') }}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-bold hover:bg-zinc-50"
                        >
                            <span className="flex items-center gap-2"><CalendarIcon /> My Schedule</span>
                            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{upcomingBookings.length}</span>
                        </button>
                        <button
                            onClick={() => { router.push('/dashboard'); setView('list') }}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-bold hover:bg-zinc-50"
                        >
                            <span className="flex items-center gap-2"><DashboardIcon /> Organized</span>
                            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{organizerEvents.length}</span>
                        </button>
                    </nav>
                </aside>
                <div className="flex-1 flex flex-col items-center justify-center">

                {view === 'list' ? (
                    <>
                        <div className="w-full max-w-5xl mb-12 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                {[
                                    { title: 'Pending Invites', subtitle: 'Action Required', value: requests.length, bg: 'bg-yellow-100', text: 'text-yellow-600' },
                                    { title: 'Upcoming Gigs', subtitle: 'Confirmed', value: upcomingBookings.length, bg: 'bg-blue-100', text: 'text-blue-600' },
                                    { title: 'Organized', subtitle: 'My Events', value: organizerEvents.length, bg: 'bg-purple-100', text: 'text-purple-600' },
                                    ...(committeeEvents.length > 0 || openChecklistCount > 0 ? [{ title: 'Open Tasks', subtitle: 'Assigned', value: openChecklistCount, bg: 'bg-orange-100', text: 'text-orange-600' }] : []),
                                    ...(sponsorEvents.length > 0 ? [{ title: 'Active Sponsorships', subtitle: 'Live', value: sponsorEvents.filter(e => e.status === 'published').length, bg: 'bg-emerald-100', text: 'text-emerald-600' }] : []),
                                ].map((card, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.text} flex items-center justify-center font-bold text-xl`}>
                                            {card.value}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{card.title}</div>
                                            <div className="text-zinc-900 font-bold">{card.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pending Requests */}
                            {requests.length > 0 && (
                                <div id="invitations" className="animate-fadeIn">
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
                        </div>
                    </>
                ) : (

                    // DETAIL VIEW
                    <>
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full animate-fadeIn">
                            <div>
                                {/* Back Button - Available to everyone */}
                                <button
                                    onClick={handleBack}
                                    className="mb-4 text-sm font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to Dashboard
                                </button>
                            </div>

                            {/* Participant Actions (Review) */}
                            {currentPhase === EventPhase.POST_EVENT && user?.user_id !== nextEvent?.organizer_id && role !== 'committee' && (
                                <div>
                                    {checkingReview ? (
                                        <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-zinc-300"></div>
                                    ) : !hasReviewed ? (
                                        <button
                                            onClick={() => setIsReviewOpen(true)}
                                            className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-zinc-900 font-black rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                            Write a Review
                                        </button>
                                    ) : (
                                        <div className="px-6 py-2.5 bg-green-100 text-green-700 font-bold rounded-xl flex items-center gap-2 border border-green-200">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            You reviewed this event
                                        </div>
                                    )}
                                </div>
                            )}

                            {(user?.user_id === nextEvent?.organizer_id || role === 'committee') && (
                                <div className="flex items-center gap-3">
                                    {/* Show different controls based on event phase */}
                                    {(currentPhase === EventPhase.EVENT_DAY || currentPhase === EventPhase.ONGOING) ? (
                                        <>
                                            {/* Event Day/Ongoing Mode: Attendance Stats + Scan Button */}
                                            {attendanceStats && (
                                                <div className="px-6 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <div className="text-sm">
                                                                <span className="font-black text-green-700 text-lg">{attendanceStats.attended_total}</span>
                                                                <span className="text-zinc-500 font-medium mx-1">/</span>
                                                                <span className="font-bold text-zinc-700">{attendanceStats.total_participants}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs font-bold text-green-700 uppercase tracking-wider">
                                                            Attended
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <Link
                                                href={`/attendance/scan?eventId=${nextEvent?.id || ''}`}
                                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                </svg>
                                                Scan Attendance
                                            </Link>
                                        </>
                                    ) : currentPhase === EventPhase.POST_EVENT ? (
                                        <>
                                            {/* Post-Event Mode: Export & Analytics */}
                                            <div className="px-6 py-2.5 bg-zinc-100 border-2 border-zinc-300 rounded-xl">
                                                <div className="text-sm font-bold text-zinc-700">
                                                    ✅ Event Completed
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Draft/Pre-Event Mode: Preview + Publish/Unpublish */}
                                            <button
                                                onClick={() => setIsPreviewOpen(true)}
                                                className="px-6 py-2.5 bg-white border-2 border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
                                            >
                                                Preview
                                            </button>
                                            {user?.user_id === nextEvent?.organizer_id && (
                                                <button
                                                    onClick={async () => {
                                                        if (!nextEvent) return
                                                        if (nextEvent.status === 'published') {
                                                            if (confirm('Unpublish this event? It will be hidden from Discover.')) {
                                                                try {
                                                                    await unpublishEvent(nextEvent.id)
                                                                    toast.success('Event Unpublished')
                                                                    fetchData()
                                                                } catch (e) {
                                                                    toast.error('Failed to unpublish event')
                                                                }
                                                            }
                                                        } else {
                                                            if (confirm('Are you ready to publish this event?')) {
                                                                try {
                                                                    await publishEvent(nextEvent.id)
                                                                    toast.success('Event Published!')
                                                                    fetchData()
                                                                } catch (e) {
                                                                    toast.error('Failed to publish event')
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    className="px-6 py-2.5 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md flex items-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    {nextEvent?.status === 'published' ? 'Unpublish' : 'Publish'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Event Card Or Empty State */}
                        {nextEvent ? (
                            <div className="w-full animate-fadeIn pb-12">
                                <DashboardHeroCard
                                    event={nextEvent}
                                    onPreview={() => setIsPreviewOpen(true)}
                                    canEditCover={user?.user_id === nextEvent.organizer_id || role === 'committee'}
                                    phase={currentPhase}
                                    onCoverUpdated={() => fetchEventDetails(selectedEventId!)}
                                />

                                <DashboardTabs
                                    event={nextEvent}
                                    user={user}
                                    role={role}
                                    phase={currentPhase}
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

                <EventReviewModal
                    isOpen={isReviewOpen}
                    onClose={() => setIsReviewOpen(false)}
                    eventId={nextEvent?.id || ''}
                    eventTitle={nextEvent?.title || ''}
                    organizerId={nextEvent?.organizer_id || ''}
                    onSuccess={() => {
                        setHasReviewed(true)
                        fetchEventDetails(selectedEventId!) // Refresh to potential update details
                    }}
                />

                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12"><Skeleton height="400px" className="rounded-[2.5rem]" /></div>}>
            <DashboardPageInner />
        </Suspense>
    )
}
