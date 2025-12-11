'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, joinPublicEvent, leaveEvent, getMe, getEventAttendanceStats, setEventReminder, getPublicOrganizations, getReviewsByEvent, getMyParticipationSummary } from '@/services/api'
import { EventDetails, UserMeResponse, EventAttendanceStats, OrganizationResponse, ReviewResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
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
                    const summary = await getMyParticipationSummary(id)
                    setIsParticipant(!!summary?.is_participant)
                    setIsJoinedAccepted(summary?.my_status === 'accepted' || summary?.my_status === 'attended')
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
            {/* Hero Image Section - Full Width */}
            <div className="relative h-[50vh] min-h-[400px] w-full bg-zinc-900 group overflow-hidden">
                {event.cover_url && (
                    <img
                        src={event.cover_url}
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

                <div className="absolute top-8 right-8 z-20 flex gap-3">
                    <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-xs font-bold uppercase tracking-wider shadow-lg">
                        {event.format.replace('_', ' ')}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-xs font-bold uppercase tracking-wider shadow-lg">
                        {event.type}
                    </span>
                </div>

                {/* Title and Meta Section - Bottom Left */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-32">
                    <div className="max-w-7xl mx-auto w-full space-y-4">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight shadow-sm max-w-4xl">
                            {event.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-zinc-200 font-medium text-lg pt-2">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(event.start_datetime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            
                            {(event.venue_remark || event.venue_place_id) ? (
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="truncate max-w-[300px]">{event.venue_remark || event.venue_place_id}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="truncate max-w-[300px]">{event.type === 'online' ? 'Online Event' : 'Venue to be announced'}</span>
                                </div>
                            )}

                            {(
                                typeof stats?.total_participants !== 'undefined' || typeof event.max_participant !== 'undefined'
                            ) && (
                                <div className="flex items-center gap-2">
                                    <span className="truncate max-w-[300px]">
                                        Participants: {(stats?.total_participants || 0)}
                                        {typeof event.max_participant !== 'undefined' ? ` / ${event.max_participant}` : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
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

                            {/* Registration Card */}
                            <div className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden relative">
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
                                                <span className="text-4xl font-black text-zinc-900 tracking-tight">$$$</span>
                                            </div>
                                        )}

                                        {isParticipant ? (
                                            <div className="flex gap-3">
                                                <button
                                                    className="flex-1 py-4 bg-zinc-200 text-zinc-700 rounded-2xl font-bold text-center text-lg cursor-default"
                                                    disabled
                                                >
                                                    Joined
                                                </button>
                                                <button
                                                    onClick={handleLeave}
                                                    className="px-4 py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-bold hover:bg-zinc-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleJoin}
                                                disabled={registering}
                                                className="block w-full py-4 bg-yellow-400 text-zinc-900 rounded-2xl font-bold text-center text-lg hover:bg-yellow-300 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                                            >
                                                {registering ? 'Registering...' : 'Register Now'}
                                            </button>
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
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
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
