'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, joinPublicEvent, leaveEvent, getMe, getEventAttendanceStats, setEventReminder, deleteEventReminder, getPublicOrganizations, getReviewsByEvent, getMyParticipationSummary, getMyReminders } from '@/services/api'
import { EventDetails, UserMeResponse, EventAttendanceStats, OrganizationResponse, ReviewResponse, EventReminderResponse, EventReminderOption } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'
import { AttendanceQRModal } from '@/components/event/AttendanceQRModal'
import { getEventPhase, EventPhase } from '@/lib/eventPhases'
import { EventBadge } from '@/components/ui/EventBadge'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { ReminderModal } from '@/components/event/ReminderModal'

export default function EventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<UserMeResponse | null>(null)
    const [registering, setRegistering] = useState(false)
    const [isParticipant, setIsParticipant] = useState(false)
    const [isJoinedAccepted, setIsJoinedAccepted] = useState(false)
    const [reminding, setReminding] = useState(false)
    const [showLeaveModal, setShowLeaveModal] = useState(false)
    const [showReminderModal, setShowReminderModal] = useState(false)
    const [myReminder, setMyReminder] = useState<EventReminderResponse | null>(null)
    const [stats, setStats] = useState<EventAttendanceStats | null>(null)
    const [hostOrg, setHostOrg] = useState<OrganizationResponse | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [reviewsAvg, setReviewsAvg] = useState<number>(0)
    const [reviewsCount, setReviewsCount] = useState<number>(0)
    const [showQRModal, setShowQRModal] = useState(false)
    const [participantStatus, setParticipantStatus] = useState<string | null>(null)
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
    const [currentPhase, setCurrentPhase] = useState<EventPhase>(EventPhase.DRAFT)
    const [showImageModal, setShowImageModal] = useState(false)

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places'] as ("places")[],
    })
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)

    const [mapError, setMapError] = useState(false)

    useEffect(() => {
        if (!isLoaded || !event?.venue_place_id) return
        setMapError(false)
        // @ts-ignore
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ placeId: event.venue_place_id }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location
                const json = loc.toJSON()
                setMapCenter({ lat: json.lat, lng: json.lng })
            } else {
                setMapError(true)
            }
        })
    }, [isLoaded, event?.venue_place_id])

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    useEffect(() => {
        const loadHostOrg = async () => {
            if (!event?.organizer_id) return
            try {
                const orgs = await getPublicOrganizations()
                const match = orgs.find(o => o.owner_id === event.organizer_id) || null
                setHostOrg(match)
            } catch {
                setHostOrg(null)
            }
        }
        loadHostOrg()
    }, [event?.organizer_id])

    useEffect(() => {
        const loadReviews = async () => {
            // Only load reviews if Post-Event
            if (!event?.id) return
            try {
                setReviewsLoading(true)
                const data = await getReviewsByEvent(event.id)
                setReviews(data)
                const count = data.length
                const avg = count > 0 ? data.reduce((s, r) => s + (r.rating || 0), 0) / count : 0
                setReviewsCount(count)
                setReviewsAvg(Number(avg.toFixed(1)))
            } catch {
                setReviews([])
                setReviewsAvg(0)
                setReviewsCount(0)
            } finally {
                setReviewsLoading(false)
            }
        }
        loadReviews()
    }, [event?.id])

    const fetchData = async () => {
        try {
            const [eventData, userData] = await Promise.all([
                getEventById(id),
                getMe().catch(() => null)
            ])
            setEvent(eventData)
            setUser(userData)
            setCurrentPhase(getEventPhase(eventData))

            if (userData) {
                try {
                    const summary: any = await getMyParticipationSummary(id)
                    setIsParticipant(!!summary?.is_participant)
                    setIsJoinedAccepted(summary?.my_status === 'accepted' || summary?.my_status === 'attended')
                    setParticipantStatus(summary?.my_status || null)
                    setPaymentStatus(summary?.payment_status || null)
                } catch {
                    setIsParticipant(false)
                    setIsJoinedAccepted(false)
                    setParticipantStatus(null)
                    setPaymentStatus(null)
                }


                try {
                    const reminders = await getMyReminders()
                    const existing = reminders.find(r => r.event_id === id)
                    setMyReminder(existing || null)
                } catch {
                    setMyReminder(null)
                }
            } else {
                setIsParticipant(false)
                setIsJoinedAccepted(false)
                setParticipantStatus(null)
                setPaymentStatus(null)
            }
            try {
                const s = await getEventAttendanceStats(id)
                setStats(s)
            } catch {
                setStats(null)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load event details')
            router.push('/dashboard')
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async () => {
        if (!user) {
            router.push(`/login?redirect=/events/${id}`)
            return
        }
        setRegistering(true)
        try {
            await joinPublicEvent(id)
            toast.success('Successfully registered!')
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to join event')
        } finally {
            setRegistering(false)
        }
    }

    const handleLeaveClick = () => {
        setShowLeaveModal(true)
    }

    const confirmLeave = async () => {
        setRegistering(true)
        try {
            await leaveEvent(id)
            toast.success('Registration cancelled')
            setShowLeaveModal(false)
            fetchData()
        } catch (error: any) {
            toast.error('Failed to leave event')
        } finally {
            setRegistering(false)
        }
    }

    const handleReminderClick = () => {
        setShowReminderModal(true)
    }

    const confirmReminder = async (option: string | null) => {
        if (!option) {
            handleRemoveReminder()
            return
        }

        setReminding(true)
        try {
            const newReminder = await setEventReminder(id, { option: option as EventReminderOption })
            toast.success('Preferences saved!')
            setMyReminder(newReminder)
            setShowReminderModal(false)
        } catch (error: any) {
            if (error?.response?.status === 409) {
                toast.success('Preferences saved!')

                try {
                    const reminders = await getMyReminders()
                    const existing = reminders.find(r => r.event_id === id)
                    if (existing) setMyReminder(existing)
                } catch {
                    // Fallback
                }
                setShowReminderModal(false)
            } else {
                toast.error('Error saving preference')
            }
        } finally {
            setReminding(false)
        }
    }

    const handleRemoveReminder = async () => {
        setReminding(true)
        try {
            await deleteEventReminder(id)
            toast.success('Reminder removed')
            setMyReminder(null)
            setShowReminderModal(false)
        } catch (error) {
            toast.error('Failed to remove reminder')
        } finally {
            setReminding(false)
        }
    }

    const handleShare = async () => {
        try {
            const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
            await navigator.clipboard.writeText(shareUrl)
            toast.success('Link copied to clipboard')
        } catch {
            toast.error('Unable to copy link')
        }
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <Skeleton height="300px" className="rounded-3xl" />
                <div className="space-y-4">
                    <Skeleton height="40px" width="60%" className="rounded-xl" />
                    <Skeleton height="20px" width="40%" className="rounded-lg" />
                </div>
            </div>
        )
    }

    if (!event) return null

    const isOrganizer = user?.id === event.organizer_id
    const isRegistrationOpen = event.registration_status === 'opened'
    const isAttendanceOpen = currentPhase === EventPhase.EVENT_DAY || currentPhase === EventPhase.ONGOING

    const eventStart = new Date(event.start_datetime)
    const eventEnd = new Date(event.end_datetime)

    return (
        <div className="w-full min-h-screen pt-8 pb-24">
            <div className="max-w-screen-xl mx-auto px-4 md:px-8">

                {/* 1. Breadcrumb / Back */}
                <div className="flex items-center gap-2 mb-6 text-sm font-medium text-zinc-500">
                    <Link href="/dashboard" className="hover:text-zinc-900 transition-colors">Events</Link>
                    <span>/</span>
                    <span className="text-zinc-900 truncate max-w-[200px]">{event.title}</span>
                </div>

                {/* 2. Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* --- LEFT COLUMN (Content) --- */}
                    <div className="lg:col-span-8 flex flex-col gap-10">

                        {/* Combined Header Card */}
                        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                            {/* Cover Image */}
                            <div className="w-full aspect-[21/9] md:aspect-[21/8] bg-zinc-100 relative group overflow-hidden cursor-pointer" onClick={() => setShowImageModal(true)}>
                                {event.cover_url ? (
                                    <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                        <svg className="w-20 h-20 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md">View Fullscreen</span>
                                </div>
                            </div>

                            {/* Event Details Content */}
                            <div className="flex flex-col gap-6 p-8">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <EventBadge type="type" value={event.type} />
                                    </div>
                                    <h1 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight leading-tight">
                                        {event.title}
                                    </h1>
                                </div>

                                {/* Host Info Row */}
                                <div className="flex flex-wrap items-center gap-6 pb-6 border-b border-zinc-100">
                                    <Link href={`/profile/${event.organizer_id}`} className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border border-indigo-200 group-hover:border-indigo-400 transition-colors">
                                            {event.organizer_avatar ? (
                                                <img src={event.organizer_avatar} alt={event.organizer_name || 'Organizer'} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{(event.organizer_name || 'Org').charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Hosted by</span>
                                            <span className="font-bold text-zinc-900 group-hover:underline">{event.organizer_name || 'Event Host'}</span>
                                        </div>
                                    </Link>

                                    {hostOrg && (
                                        <>
                                            <div className="w-px h-8 bg-zinc-200 hidden md:block"></div>
                                            <Link href={`/organizations/${hostOrg.id}`} className="flex items-center gap-3 group">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center overflow-hidden border border-amber-200 group-hover:border-amber-400 transition-colors">
                                                    {hostOrg.logo_url && <img src={hostOrg.logo_url} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Organization</span>
                                                    <span className="font-bold text-zinc-900 group-hover:underline">{hostOrg.name}</span>
                                                </div>
                                            </Link>
                                        </>
                                    )}
                                </div>

                                {/* Date/Location/Duration Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start gap-4 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-sky-900 uppercase">Date & Time</h4>
                                            <p className="text-sky-800 text-sm mt-1 font-medium">
                                                {eventStart.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-sky-600 text-xs mt-0.5">
                                                {eventStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {eventEnd.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-900 uppercase">{event.type === 'online' ? 'Online Event' : 'Location'}</h4>
                                            <p className="text-emerald-800 text-sm mt-1 font-medium">
                                                {event.type === 'online' ? 'Join via Link' : (event.venue_name || 'TBD')}
                                            </p>
                                            <div className="text-emerald-600 text-xs mt-0.5 line-clamp-1">
                                                {event.type === 'online' ? (
                                                    isParticipant && event.meeting_url ? (
                                                        <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-800 font-bold">
                                                            {event.meeting_url}
                                                        </a>
                                                    ) : (
                                                        <span>Link available after registration</span>
                                                    )
                                                ) : (
                                                    event.venue_remark || 'Details upon registration'
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 mb-6 flex items-center gap-3">
                                About This Event
                            </h2>
                            <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
                                <div className="prose prose-lg prose-zinc max-w-none text-zinc-600 leading-loose">
                                    {event.description ? (
                                        <div className="whitespace-pre-wrap">{event.description}</div>
                                    ) : (
                                        <p className="italic text-zinc-400">No description provided.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Map Section */}
                        {event.venue_place_id && event.type !== 'online' && (
                            <div id="map-section">
                                <h2 className="text-xl font-black text-zinc-900 mb-6">Venue Map</h2>
                                <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-zinc-200 shadow-sm relative">
                                    {isLoaded && mapCenter ? (
                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            center={mapCenter}
                                            zoom={15}
                                        >
                                            <Marker position={mapCenter} />
                                        </GoogleMap>
                                    ) : mapError ? (
                                        <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-400 font-medium">
                                            Location TBD
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-400">Loading Map...</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Reviews Section - Only for Post Event */}
                        {currentPhase === EventPhase.POST_EVENT && (
                            <div>
                                <h2 className="text-xl font-black text-zinc-900 mb-6">Reviews</h2>
                                {reviews.length === 0 ? (
                                    <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-zinc-500">
                                        No reviews available yet.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {reviews.map(r => (
                                            <div key={r.id} className="p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="flex text-yellow-500">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <svg key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-current' : 'text-zinc-200 fill-current'}`} viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-zinc-700">{r.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- RIGHT COLUMN (Sticky Sidebar) --- */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-24 space-y-6">

                            {/* 1. Main Action Card */}
                            <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden p-6 relative">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-70 pointer-events-none"></div>

                                <div className="relative z-10">
                                    {event.registration_type === 'paid' && (
                                        <div className="mb-6">
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Ticket Price</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-zinc-900">$$$</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    {isOrganizer ? (
                                        <Link
                                            href={`/manage/${event.id}`}
                                            className="block w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center text-lg hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                        >
                                            Manage Event
                                        </Link>
                                    ) : (
                                        <div className="space-y-4">
                                            {isParticipant ? (
                                                <>
                                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-emerald-800">You are going!</p>
                                                            <p className="text-xs text-emerald-600">{participantStatus === 'attended' ? 'Attendance marked' : 'Ticket confirmed'}</p>
                                                        </div>
                                                    </div>



                                                    {isJoinedAccepted && (
                                                        <button
                                                            onClick={() => setShowQRModal(true)}
                                                            disabled={!isAttendanceOpen}
                                                            className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${isAttendanceOpen
                                                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                                                                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                                            {isAttendanceOpen ? 'Show Attendance QR' : 'QR Available 24h Before Event'}
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={handleLeaveClick}
                                                        disabled={registering}
                                                        className="w-full py-2 text-zinc-400 text-xs font-bold hover:text-red-500 transition-colors disabled:opacity-50"
                                                    >
                                                        {registering ? 'Processing...' : 'Cancel Registration'}
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={handleJoin}
                                                    disabled={registering || !isRegistrationOpen}
                                                    className="block w-full py-4 bg-yellow-400 text-zinc-900 rounded-2xl font-bold text-center text-lg hover:bg-yellow-300 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                                                >
                                                    {registering ? 'Registering...' : isRegistrationOpen ? 'Join' : 'Registration Closed'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* What to Prepare - Re-styled & Moved to Sidebar */}
                            {isJoinedAccepted && (
                                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-100 rounded-full blur-xl opacity-60 group-hover:scale-110 transition-transform"></div>
                                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide mb-4 flex items-center gap-2 relative z-10">
                                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        What to Prepare
                                    </h3>
                                    <ul className="space-y-4 relative z-10 mb-6">
                                        <li className="flex gap-3 text-amber-900">
                                            <div className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                                                <span className="text-xs font-bold">1</span>
                                            </div>
                                            <span className="text-sm font-medium leading-tight pt-0.5">Bring digital/printed ticket.</span>
                                        </li>
                                        <li className="flex gap-3 text-amber-900">
                                            <div className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                                                <span className="text-xs font-bold">2</span>
                                            </div>
                                            <span className="text-sm font-medium leading-tight pt-0.5">Arrive 15 mins early.</span>
                                        </li>
                                        {(event.type === 'offline' || event.type === 'hybrid') && (
                                            <li className="flex gap-3 text-amber-900">
                                                <div className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                                                    <span className="text-xs font-bold">3</span>
                                                </div>
                                                <span className="text-sm font-medium leading-tight pt-0.5">Dress: Smart Casual.</span>
                                            </li>
                                        )}

                                    </ul>
                                    <div className="relative z-10">
                                        {myReminder ? (
                                            <button
                                                onClick={handleReminderClick}
                                                className="w-full py-3 bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors cursor-pointer"
                                            >
                                                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Reminder: {myReminder.option === 'one_day' ? '1 Day Before' : myReminder.option === 'three_days' ? '3 Days Before' : '1 Week Before'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleReminderClick}
                                                disabled={reminding}
                                                className="w-full py-2 bg-white border border-amber-200 text-amber-800 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors shadow-sm"
                                            >
                                                Set Reminder
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Payment QR Box */}
                            {isParticipant && event.payment_qr_url && (
                                <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide mb-4">Payment</h3>
                                    <div className="bg-zinc-50 p-4 rounded-xl flex flex-col items-center border border-zinc-100">
                                        <img src={event.payment_qr_url} alt="Payment QR" className="max-w-[150px] border border-zinc-200 rounded-lg mb-2" />
                                        <p className="text-xs text-zinc-500 text-center">Scan to pay</p>
                                    </div>
                                    {paymentStatus === 'rejected' && (
                                        <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100 text-center">
                                            Payment Rejected.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Share & Socials */}
                            <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest">Share this event</h3>
                                    {(event.participant_count !== undefined || stats) && (
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-violet-900 leading-none">{event.participant_count ?? stats?.total_participants ?? 0}</p>
                                            <p className="text-[10px] font-bold text-violet-500 uppercase">
                                                {event.max_participant ? `/ ${event.max_participant} Joined` : 'Joined'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={handleShare} className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-violet-600 font-bold text-sm hover:bg-violet-100 transition-all flex items-center justify-center gap-2 shadow-sm" title="Copy Link">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    </button>
                                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-sky-500 hover:bg-sky-50 transition-all flex items-center justify-center shadow-sm" title="Twitter">
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                                    </a>
                                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm" title="Facebook">
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                    </a>
                                    <a href={`whatsapp://send?text=${encodeURIComponent(event.title + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-green-600 hover:bg-green-50 transition-all flex items-center justify-center shadow-sm" title="WhatsApp">
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </a>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

            </div>

            {/* Attendance QR Modal */}
            {event && (
                <>
                    <AttendanceQRModal
                        eventId={event.id}
                        eventTitle={event.title}
                        eventEndTime={event.end_datetime}
                        isOpen={showQRModal}
                        onClose={() => setShowQRModal(false)}
                    />

                    <ConfirmationModal
                        isOpen={showLeaveModal}
                        onClose={() => setShowLeaveModal(false)}
                        onConfirm={confirmLeave}
                        title="Cancel Registration"
                        message="Are you sure you want to cancel your registration? You will lose your spot in this event."
                        confirmText="Yes, Cancel"
                        variant="danger"
                        isLoading={registering}
                    />

                    <ReminderModal
                        isOpen={showReminderModal}
                        onClose={() => setShowReminderModal(false)}
                        onConfirm={confirmReminder}
                        currentReminderId={myReminder?.option}
                        isLoading={reminding}
                        eventTitle={event.title}
                        eventStart={event.start_datetime}
                        eventEnd={event.end_datetime}
                        eventDescription={event.description || ''}
                        eventLocation={event.location || event.venue_name || ''}
                    />
                </>
            )}

            {/* Image Preview Modal */}
            {showImageModal && event && event.cover_url && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setShowImageModal(false)}
                >
                    <div className="relative max-w-7xl max-h-screen w-full h-full flex items-center justify-center">
                        <img
                            src={event.cover_url}
                            alt={event.title}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                            onClick={() => setShowImageModal(false)}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
