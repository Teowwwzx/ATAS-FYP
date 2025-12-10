'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, joinPublicEvent, leaveEvent, getMe, getEventParticipants, getEventAttendanceStats, setEventReminder, getPublicOrganizations, getReviewsByEvent } from '@/services/api'
import { EventDetails, UserMeResponse, EventAttendanceStats, OrganizationResponse, ReviewResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { DashboardHeroCard } from '@/app/(app)/dashboard/DashboardHeroCard'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'

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
    const [stats, setStats] = useState<EventAttendanceStats | null>(null)
    const [hostOrg, setHostOrg] = useState<OrganizationResponse | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [reviewsAvg, setReviewsAvg] = useState<number>(0)
    const [reviewsCount, setReviewsCount] = useState<number>(0)

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places'] as ("places")[],
    })
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)

    useEffect(() => {
        if (!isLoaded || !event?.venue_place_id) return
        // @ts-ignore
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ placeId: event.venue_place_id }, (results: any, status: any) => {
            try {
                if (status === 'OK' && results && results[0]) {
                    const loc = results[0].geometry.location
                    const json = loc.toJSON()
                    setMapCenter({ lat: json.lat, lng: json.lng })
                }
            } catch { }
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
            if (userData) {
                try {
                    const participants = await getEventParticipants(id)
                    const mine = participants.find(p => p.user_id === userData.id)
                    setIsParticipant(!!mine)
                    setIsJoinedAccepted(!!mine && mine.status === 'accepted')
                } catch {
                    setIsParticipant(false)
                    setIsJoinedAccepted(false)
                }
            } else {
                setIsParticipant(false)
                setIsJoinedAccepted(false)
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

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to cancel your registration?')) return
        setRegistering(true)
        try {
            await leaveEvent(id)
            toast.success('Registration cancelled')
            fetchData()
        } catch (error: any) {
            toast.error('Failed to leave event')
        } finally {
            setRegistering(false)
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
    const isPublished = event.status === 'published'
    const now = new Date()
    const isEnded = now > new Date(event.end_datetime)
    const isFull = !!(event.max_participant && (stats?.total_participants || 0) >= event.max_participant)

    const allowedHosts = new Set(['res.cloudinary.com', 'ui-avatars.com', 'picsum.photos'])
    const pickCover = () => {
        const url = event.cover_url || ''
        try {
            const u = new URL(url)
            if (allowedHosts.has(u.hostname)) return url
        } catch { }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(event.title)}&background=random&size=800`
    }
    const coverUrl = pickCover()
    // For now, let's assume getEventById might return 'is_participant' or similar if the backend supports it, 
    // OR we ignore the "Unregister" button state for MVP if the data isn't easily available without another call.
    // Actually, createEvent returns EventDetails. 

    // Let's rely on basic display first.


    const handleShare = async () => {
        try {
            const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
            const data = {
                title: event.title,
                text: event.description || 'Check out this event',
                url: shareUrl,
            }
            // @ts-ignore
            if (navigator.share) {
                // @ts-ignore
                await navigator.share(data)
            } else if (navigator.clipboard && shareUrl) {
                await navigator.clipboard.writeText(shareUrl)
                toast.success('Link copied to clipboard')
            }
        } catch {
            toast.error('Unable to share right now')
        }
    }

    return (
        <div className="w-full min-h-screen bg-white">
            <DashboardHeroCard event={event} />

            {/* Meta Bar */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 mt-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 text-sm font-bold shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Participants:</span>
                        <span className="text-zinc-900">{stats?.total_participants || 0}</span>
                        <span className="text-zinc-400">/ {event.max_participant ? event.max_participant : '∞'}</span>
                    </div>

                    <div className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 text-sm font-bold shadow-sm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${event.registration_status === 'opened' ? 'bg-green-500' : 'bg-zinc-400'}`}></span>
                        <span>Registration: </span>
                        <span className="capitalize text-zinc-900">{event.registration_status || 'closed'}</span>
                    </div>

                    {event.venue_remark && (
                        <div className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 text-sm font-bold shadow-sm flex items-center gap-2">
                            <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate max-w-[240px]">{event.venue_remark}</span>
                        </div>
                    )}

                    <button
                        onClick={handleShare}
                        className="ml-auto px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-bold shadow-sm hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v12" />
                        </svg>
                        Share
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

                    {/* Left Column: Description & Details (Span 8) */}
                    <div className="lg:col-span-8 space-y-12">
                        <div>
                            <h3 className="text-xl font-black text-zinc-900 mb-6 uppercase tracking-wider flex items-center gap-3">
                                <span className="w-8 h-1 bg-yellow-400 rounded-full"></span>
                                About This Event
                            </h3>
                            <div className="prose prose-lg prose-zinc max-w-none text-zinc-600 leading-loose">
                                {event.description ? (
                                    <div className="whitespace-pre-wrap">{event.description}</div>
                                ) : (
                                    <p className="italic text-zinc-400">No description provided.</p>
                                )}
                            </div>
                        </div>

                        {/* Reviews */}
                        <div>
                            <h3 className="text-xl font-black text-zinc-900 mb-6 uppercase tracking-wider flex items-center gap-3">
                                <span className="w-8 h-1 bg-yellow-400 rounded-full"></span>
                                Reviews
                            </h3>
                            {reviewsLoading ? (
                                <div className="text-sm text-zinc-500">Loading reviews…</div>
                            ) : reviewsCount === 0 ? (
                                <div className="text-sm text-zinc-500">No reviews yet.</div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <svg key={i} className={`w-5 h-5 ${i < Math.round(reviewsAvg) ? 'text-yellow-400' : 'text-zinc-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                        <span className="text-zinc-900 font-bold">{reviewsAvg.toFixed(1)}</span>
                                        <span className="text-zinc-500">({reviewsCount})</span>
                                    </div>
                                    <div className="space-y-4">
                                        {reviews.slice(0, 3).map((r) => (
                                            <div key={r.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <svg key={i} className={`w-4 h-4 ${i < Math.round(r.rating || 0) ? 'text-yellow-400' : 'text-zinc-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                    <span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</span>
                                                </div>
                                                {r.comment ? (
                                                    <p className="text-sm text-zinc-700">{r.comment}</p>
                                                ) : (
                                                    <p className="text-sm text-zinc-500 italic">No comment provided.</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sticky Action Sidebar (Span 4) */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-8 space-y-6">

                            {/* Action Card */}
                            <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-zinc-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

                                {/* Action Button */}
                                {isOrganizer ? (
                                    <Link
                                        href={`/dashboard`}
                                        className="block w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center text-lg hover:bg-zinc-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                                    >
                                        Manage Event
                                    </Link>
                                ) : (
                                    <div className="space-y-6">
                                        {event.registration_type === 'paid' && (
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-zinc-400 font-bold uppercase tracking-wider text-xs">Price</span>
                                                <span className="text-2xl font-black text-zinc-900 tracking-tight">$$$</span>
                                            </div>
                                        )}
                                        {!isParticipant ? (
                                            <>
                                                <button
                                                    onClick={handleJoin}
                                                    disabled={registering || !isPublished || !isRegistrationOpen || isEnded || isFull}
                                                    className="block w-full py-4 bg-yellow-400 text-zinc-900 rounded-2xl font-bold text-center text-lg hover:bg-yellow-300 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                                                >
                                                    {registering
                                                        ? 'Registering...'
                                                        : (!isPublished
                                                            ? 'Not Published'
                                                            : (!isRegistrationOpen
                                                                ? 'Registration Closed'
                                                                : (isEnded
                                                                    ? 'Event Ended'
                                                                    : (isFull ? 'Event Full' : 'Register Now'))))}
                                                </button>
                                                {(isEnded || isFull) && (
                                                    <div className="text-xs text-zinc-500 font-medium text-center">
                                                        {isEnded ? 'This event has ended.' : 'Capacity reached.'}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="space-y-3">
                                                <button
                                                    onClick={handleLeave}
                                                    disabled={registering}
                                                    className="block w-full py-4 bg-white text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-center text-lg hover:bg-zinc-50 transition-all shadow-sm disabled:opacity-70"
                                                >
                                                    Cancel Registration
                                                </button>
                                                <div className="text-xs text-zinc-600 font-medium text-center">
                                                    {isJoinedAccepted ? 'Status: accepted' : 'Status: pending approval'}
                                                </div>
                                                {isJoinedAccepted && (
                                                    <button
                                                        onClick={async () => {
                                                            setReminding(true)
                                                            try {
                                                                await setEventReminder(id, { option: 'one_day' })
                                                                toast.success('Reminder set for one day before')
                                                            } catch (e) {
                                                                toast.error('Failed to set reminder')
                                                            } finally {
                                                                setReminding(false)
                                                            }
                                                        }}
                                                        disabled={reminding}
                                                        className="block w-full py-3 bg-zinc-900 text-white rounded-2xl font-bold text-center text-sm hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-70"
                                                    >
                                                        {reminding ? 'Setting reminder…' : 'Remind me one day before'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {event.payment_qr_url && isParticipant && (
                                <div className="bg-white rounded-[2rem] p-6 border border-zinc-100 shadow-sm">
                                    <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-3">Payment QR</h4>
                                    <p className="text-xs text-zinc-500 mb-4">Scan to pay. Upload receipt separately if requested by organizer.</p>
                                    <img src={event.payment_qr_url} alt="Payment QR" className="w-full max-w-xs mx-auto rounded-xl border border-zinc-200" />
                                </div>
                            )}

                            {/* Organizer Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Organizer</h3>
                                <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-lg shrink-0 border border-zinc-100">
                                        {event.organizer_id ? event.organizer_id.charAt(0).toUpperCase() : '?'}
                                    </div>
                            <div className="min-w-0">
                                <div className="font-bold text-zinc-900 text-base truncate">Event Host</div>
                                <div className="text-xs text-zinc-500 font-medium truncate">View Profile</div>
                            </div>
                            <button className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </button>
                        </div>

                        {hostOrg && (
                            <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center overflow-hidden">
                                    {hostOrg.logo_url ? (
                                        <img src={hostOrg.logo_url} alt={hostOrg.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-zinc-900 font-bold">{hostOrg.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-zinc-900 text-base truncate">{hostOrg.name}</div>
                                    {hostOrg.type && (
                                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider truncate">{hostOrg.type}</div>
                                    )}
                                </div>
                                <Link href={`/organizations/${hostOrg.id}`} className="ml-auto px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800">
                                    View Organization
                                </Link>
                            </div>
                        )}
                    </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Location Map */}
            {event.type !== 'online' && event.venue_place_id && (
                <div className="max-w-7xl mx-auto px-6 md:px-12 pb-12">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-3">Location</h3>
                    <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
                        <div className="h-[300px] w-full">
                            {isLoaded && mapCenter ? (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={mapCenter}
                                    zoom={15}
                                >
                                    <Marker position={mapCenter} />
                                </GoogleMap>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium">Loading map…</div>
                            )}
                        </div>
                        {event.venue_remark && (
                            <div className="p-4 border-t border-zinc-200 text-sm text-zinc-700 font-medium">{event.venue_remark}</div>
                        )}
                        {mapCenter && (
                            <div className="p-4 border-t border-zinc-200 text-xs text-zinc-500 font-medium">
                                Coordinates: {mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)}
                            </div>
                        )}
                        <div className="p-4 border-t border-zinc-200 text-xs">
                            <a
                                href={`https://www.google.com/maps/search/?api=1${event.venue_place_id ? `&query_place_id=${encodeURIComponent(event.venue_place_id)}` : `&query=${encodeURIComponent(event.venue_remark || '')}`}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-zinc-700 hover:text-zinc-900 font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Open in Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
