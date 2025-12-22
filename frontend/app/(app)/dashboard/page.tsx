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
import { DashboardInvitationList } from './DashboardInvitationList'
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
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
    const [layoutView, setLayoutView] = useState<'grid' | 'list'>('grid')

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

    const [activeTab, setActiveTab] = useState<'overview' | 'invitations' | 'schedule' | 'organized'>('overview')

    // ... (keep existing useEffects & functions)

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

    const organizedCount = events.filter(e => e.my_role === 'organizer' && new Date(e.end_datetime) > new Date()).length
    const scheduleCount = upcomingBookings.length

    return (
        <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto px-4 py-8 animate-fadeIn">
            <div className="flex flex-col lg:flex-row gap-10">

                {/* SIDEBAR NAVIGATION - Collapsible */}
                <aside className={`${isSidebarExpanded ? 'w-full lg:w-64' : 'w-full lg:w-20'} flex-shrink-0 lg:sticky lg:top-24 h-fit space-y-4 flex flex-col transition-all duration-300 bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-sm lg:shadow-none mb-6 lg:mb-0 pb-4 lg:pb-0 border lg:border-none border-zinc-100`}>
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                        className="hidden lg:flex w-full items-center justify-center p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                        title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isSidebarExpanded ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        )}
                    </button>

                    <nav className="space-y-2 w-full flex flex-row lg:flex-col justify-evenly lg:justify-start overflow-x-auto lg:overflow-visible px-2 lg:px-0">
                        <button
                            onClick={() => { setActiveTab('overview'); setView('list'); }}
                            title="Overview"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'overview' && view === 'list'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>Overview</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('invitations'); setView('list'); }}
                            title="Invitations"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${activeTab === 'invitations' && view === 'list'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <div className="relative">
                                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {!isSidebarExpanded && requests.length > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {requests.length}
                                    </span>
                                )}
                            </div>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>Invitations</span>
                            {isSidebarExpanded && requests.length > 0 && (
                                <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {requests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('schedule'); setView('list'); }}
                            title="My Schedule"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${activeTab === 'schedule' && view === 'list'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <div className="relative">
                                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {!isSidebarExpanded && scheduleCount > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {scheduleCount}
                                    </span>
                                )}
                            </div>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>My Schedule</span>
                            {isSidebarExpanded && scheduleCount > 0 && (
                                <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {scheduleCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('organized'); setView('list'); }}
                            title="Organized Events"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${activeTab === 'organized' && view === 'list'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <div className="relative">
                                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                {!isSidebarExpanded && organizedCount > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {organizedCount}
                                    </span>
                                )}
                            </div>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>Organized Events</span>
                            {isSidebarExpanded && organizedCount > 0 && (
                                <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {organizedCount}
                                </span>
                            )}
                        </button>
                    </nav>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 min-w-0">
                    {view === 'list' ? (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-10 animate-slideUp">
                                    {/* Stats Cards - Flexible Row (No Gaps) */}
                                    <div className="flex flex-col md:flex-row gap-4 w-full">
                                        <div onClick={() => setActiveTab('invitations')} className="flex-1 min-w-0 bg-white p-6 rounded-2xl border border-zinc-100 border-l-4 border-l-yellow-400 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group flex items-center justify-between relative overflow-hidden">
                                            <div className="relative z-10 shrink-0">
                                                <div className="text-yellow-600 font-bold uppercase text-xs tracking-wider mb-1">Pending Inivites</div>
                                                <div className="text-4xl font-black text-zinc-900">{requests.length}</div>
                                                <div className="text-sm font-medium text-zinc-500 mt-1 group-hover:text-zinc-900 transition-colors">Action Required</div>
                                            </div>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                                <svg className="w-24 h-24 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                            </div>
                                        </div>

                                        <div onClick={() => setActiveTab('schedule')} className="flex-1 min-w-0 bg-white p-6 rounded-2xl border border-zinc-100 border-l-4 border-l-blue-500 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group flex items-center justify-between relative overflow-hidden">
                                            <div className="relative z-10 shrink-0">
                                                <div className="text-blue-600 font-bold uppercase text-xs tracking-wider mb-1">Upcoming Gigs</div>
                                                <div className="text-4xl font-black text-zinc-900">{upcomingBookings.length}</div>
                                                <div className="text-sm font-medium text-zinc-500 mt-1 group-hover:text-zinc-900 transition-colors">Confirmed</div>
                                            </div>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                                <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>

                                        <div onClick={() => setActiveTab('organized')} className="flex-1 min-w-0 bg-white p-6 rounded-2xl border border-zinc-100 border-l-4 border-l-purple-500 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group flex items-center justify-between relative overflow-hidden">
                                            <div className="relative z-10 shrink-0">
                                                <div className="text-purple-600 font-bold uppercase text-xs tracking-wider mb-1">Organized</div>
                                                <div className="text-4xl font-black text-zinc-900">{organizedCount}</div>
                                                <div className="text-sm font-medium text-zinc-500 mt-1 group-hover:text-zinc-900 transition-colors">My Events</div>
                                            </div>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                                <svg className="w-24 h-24 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Simple View Toggle */}
                                    <div className="flex justify-end">
                                        <div className="bg-zinc-100 p-1 rounded-xl flex gap-1">
                                            <button onClick={() => setLayoutView('grid')} className={`p-2 rounded-lg transition-all ${layoutView === 'grid' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`} title="Grid View">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                            </button>
                                            <button onClick={() => setLayoutView('list')} className={`p-2 rounded-lg transition-all ${layoutView === 'list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`} title="List View">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Section: Pending Invites (if any) */}
                                    {requests.length > 0 && (
                                        <section>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-zinc-900">Pending Invitations</h3>
                                                <button onClick={() => setActiveTab('invitations')} className="text-sm font-bold text-zinc-400 hover:text-zinc-900">See all</button>
                                            </div>
                                            <DashboardInvitationList
                                                requests={requests.slice(0, 4)}
                                                onRespond={handleRespond}
                                                processingReq={processingReq}
                                                layoutMode={layoutView}
                                            />
                                        </section>
                                    )}

                                    {/* Section: Schedule */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-zinc-900">Your Schedule</h3>
                                            <button onClick={() => setActiveTab('schedule')} className="text-sm font-bold text-zinc-400 hover:text-zinc-900">See all</button>
                                        </div>
                                        {upcomingBookings.length > 0 ? (
                                            <div className={`${layoutView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                                                {upcomingBookings.slice(0, layoutView === 'grid' ? 4 : 3).map((evt) => {
                                                    const eventDate = new Date(evt.start_datetime)
                                                    const daysRemaining = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                                    // Determine colors
                                                    const typeColor = evt.type === 'online' ? 'bg-blue-100 text-blue-700' :
                                                        (evt.type as any) === 'physical' || (evt.type as any) === 'offline' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-purple-100 text-purple-700'

                                                    return (
                                                        <div
                                                            key={evt.event_id}
                                                            onClick={() => { setSelectedEventId(evt.event_id); setView('detail'); }}
                                                            className={`bg-white p-4 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-lg transition-all cursor-pointer flex gap-4 group ${layoutView === 'grid' ? 'flex-col sm:flex-row' : 'flex-row'}`}
                                                        >
                                                            {/* Image or Date Box */}
                                                            {evt.cover_url ? (
                                                                <div className="w-16 h-16 rounded-xl bg-zinc-100 flex-shrink-0 overflow-hidden">
                                                                    <img src={evt.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-16 h-16 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-900 flex-shrink-0 group-hover:bg-blue-100">
                                                                    <span className="text-xs font-bold uppercase">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                                                                    <span className="text-2xl font-black">{eventDate.getDate()}</span>
                                                                </div>
                                                            )}

                                                            <div className="overflow-hidden flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${evt.my_role === 'organizer' ? 'bg-purple-100 text-purple-700' :
                                                                        evt.my_role === 'committee' ? 'bg-blue-100 text-blue-700' :
                                                                            'bg-green-100 text-green-700'
                                                                        }`}>
                                                                        {evt.my_role}
                                                                    </span>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor}`}>
                                                                        {evt.type}
                                                                    </span>
                                                                    {daysRemaining > 0 && daysRemaining <= 30 && (
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                                                                            {daysRemaining} days left
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className="font-bold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">{evt.title}</h4>
                                                                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-zinc-50 rounded-2xl p-8 border border-dashed border-zinc-200 text-center">
                                                <p className="text-zinc-400 font-medium">No upcoming events.</p>
                                                <button onClick={() => router.push('/events')} className="text-sm font-bold text-zinc-900 mt-2 hover:underline">Browse Events</button>
                                            </div>
                                        )}
                                    </section>

                                    {/* Section: Organized */}
                                    {organizedCount > 0 && (
                                        <section>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-zinc-900">Recently Organized</h3>
                                                <button onClick={() => setActiveTab('organized')} className="text-sm font-bold text-zinc-400 hover:text-zinc-900">View all</button>
                                            </div>
                                            <div className={`${layoutView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                                                {events.filter(e => e.my_role === 'organizer' && new Date(e.end_datetime) > new Date()).slice(0, 4).map((evt) => {
                                                    const eventDate = new Date(evt.start_datetime)
                                                    const daysRemaining = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                                    // Determine colors
                                                    const typeColor = evt.type === 'online' ? 'bg-blue-100 text-blue-700' :
                                                        (evt.type as any) === 'physical' || (evt.type as any) === 'offline' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-purple-100 text-purple-700'

                                                    return (
                                                        <div
                                                            key={evt.event_id}
                                                            onClick={() => { setSelectedEventId(evt.event_id); setView('detail'); }}
                                                            className={`bg-white p-4 rounded-2xl border border-zinc-100 hover:border-yellow-400 hover:shadow-lg transition-all cursor-pointer flex gap-4 group ${layoutView === 'grid' ? 'flex-col sm:flex-row' : 'flex-row'}`}
                                                        >
                                                            {/* Image or Icon Box */}
                                                            {evt.cover_url ? (
                                                                <div className="w-16 h-16 rounded-xl bg-zinc-100 flex-shrink-0 overflow-hidden">
                                                                    <img src={evt.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-16 h-16 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600 flex-shrink-0 group-hover:bg-yellow-100">
                                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                </div>
                                                            )}

                                                            <div className="overflow-hidden flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${evt.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                                                        evt.status === 'draft' ? 'bg-zinc-100 text-zinc-700' :
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {evt.status}
                                                                    </span>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor}`}>
                                                                        {evt.type}
                                                                    </span>
                                                                    {daysRemaining > 0 && daysRemaining <= 30 && (
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                                                                            {daysRemaining} days left
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className="font-bold text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">{evt.title}</h4>
                                                                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                                    {evt.participant_count || 0} participants
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}
                            {activeTab === 'invitations' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        <h2 className="text-3xl font-black text-zinc-900">Invitations</h2>
                                    </div>
                                    <DashboardInvitationList
                                        requests={requests}
                                        onRespond={handleRespond}
                                        processingReq={processingReq}
                                        layoutMode={layoutView}
                                    />
                                </div>
                            )}

                            {activeTab === 'schedule' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <h2 className="text-3xl font-black text-zinc-900">My Schedule</h2>
                                    </div>
                                    <DashboardEventList
                                        events={events}
                                        user={user}
                                        me={me}
                                        onSelect={(e) => setSelectedEventId(e.event_id)}
                                        onCreate={() => router.push('/events/create')}
                                        onProUpgrade={fetchData}
                                        mode="schedule"
                                    />
                                </div>
                            )}

                            {activeTab === 'organized' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        </div>
                                        <h2 className="text-3xl font-black text-zinc-900">Organized Events</h2>
                                    </div>
                                    <DashboardEventList
                                        events={events}
                                        user={user}
                                        me={me}
                                        onSelect={(e) => setSelectedEventId(e.event_id)}
                                        onCreate={() => router.push('/events/create')}
                                        onProUpgrade={fetchData}
                                        mode="organized"
                                    />
                                </div>
                            )}
                        </>
                    ) : (

                        // DETAIL VIEW (Existing Logic)
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
                                        Back to {activeTab}
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
                </main>

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
        </div >
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12"><Skeleton height="400px" className="rounded-[2.5rem]" /></div>}>
            <DashboardPageInner />
        </Suspense>
    )
}
