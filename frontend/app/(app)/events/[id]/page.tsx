'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, joinPublicEvent, leaveEvent, getMe } from '@/services/api'
import { EventDetails, UserMeResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'

export default function EventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<UserMeResponse | null>(null)
    const [registering, setRegistering] = useState(false)

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    const fetchData = async () => {
        try {
            const [eventData, userData] = await Promise.all([
                getEventById(id),
                getMe().catch(() => null)
            ])
            setEvent(eventData)
            setUser(userData)
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
    const isParticipant = false // You would check this if the API returned participation status, assuming it does or we check separate endpoint. 
    // For now, let's assume getEventById might return 'is_participant' or similar if the backend supports it, 
    // OR we ignore the "Unregister" button state for MVP if the data isn't easily available without another call.
    // Actually, createEvent returns EventDetails. 

    // Let's rely on basic display first.

    return (
        <div className="w-full min-h-screen bg-zinc-50 pt-8 pb-12">
            <div className="max-w-[95%] xl:max-w-screen-2xl mx-auto px-4 md:px-8">
                {/* Hero Card Section */}
                <div className="bg-zinc-900 rounded-[2.5rem] relative overflow-hidden shadow-2xl min-h-[500px] flex items-end group">
                    {/* Background Image */}
                    {event.cover_url && (
                        <img
                            src={event.cover_url}
                            alt={event.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-8 right-8 z-20 flex gap-3">
                        <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs font-bold uppercase tracking-wider shadow-lg">
                            {event.format.replace('_', ' ')}
                        </span>
                        <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs font-bold uppercase tracking-wider shadow-lg">
                            {event.type}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 p-8 md:p-16 w-full max-w-7xl mx-auto">
                        <div className="space-y-6">
                            <div className="bg-yellow-400 text-zinc-900 inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transform -rotate-1">
                                Public Event
                            </div>
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tight shadow-sm max-w-5xl">
                                {event.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-8 text-zinc-200 font-medium text-lg md:text-xl pt-4">
                                <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                                    <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(event.start_datetime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    <span className="w-1 h-1 bg-zinc-500 rounded-full"></span>
                                    {new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </div>

                                {(event.venue_remark || event.venue_place_id) ? (
                                    <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                                        <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="truncate max-w-[300px]">{event.venue_remark || event.venue_place_id}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                                        <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span>{event.type === 'online' ? 'Online Event' : 'Venue TBA'}</span>
                                    </div>
                                )}
                            </div>
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
                    </div>

                    {/* Right Column: Sticky Action Sidebar (Span 4) */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-8 space-y-6">

                            {/* Registration Card */}
                            <div className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    Registration
                                </h3>

                                <div className="space-y-6 relative z-10">
                                    {event.registration_type === 'paid' && (
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-zinc-500 font-bold text-sm">Price</span>
                                            <span className="text-3xl font-black text-zinc-900 tracking-tight">$$$</span>
                                        </div>
                                    )}

                                    {isOrganizer ? (
                                        <Link
                                            href={`/dashboard`}
                                            className="block w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center text-lg hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                        >
                                            Manage Event
                                        </Link>
                                    ) : (
                                        <>
                                            {registering ? (
                                                <button disabled className="w-full py-4 bg-yellow-400/50 text-zinc-900 rounded-2xl font-bold text-center text-lg cursor-not-allowed">
                                                    Processing...
                                                </button>
                                            ) : isParticipant ? (
                                                <button
                                                    onClick={handleLeave}
                                                    className="w-full py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold text-center text-lg hover:bg-zinc-200 transition-all"
                                                >
                                                    Cancel Registration
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleJoin}
                                                    className="w-full py-4 bg-yellow-400 text-zinc-900 rounded-2xl font-bold text-center text-lg hover:bg-yellow-300 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95"
                                                >
                                                    Register Now
                                                </button>
                                            )}

                                            <p className="text-center text-xs text-zinc-400 font-medium">
                                                {event.registration_type === 'paid' ? 'Secure payment powered by Stripe' : 'Limited spots available'}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Organizer Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest px-1">Organizer</h3>
                                <Link href={`/profile/${event.organizer_id}`} className="block group">
                                    <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4 group-hover:border-yellow-400 transition-colors">
                                        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-lg shrink-0 border border-zinc-100 overflow-hidden">
                                            {/* Ideally fetch organizer details or use placeholder */}
                                            ?
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-zinc-900 text-base truncate group-hover:text-yellow-600 transition-colors">Event Host</div>
                                            <div className="text-xs text-zinc-500 font-medium truncate">View Profile</div>
                                        </div>
                                        <div className="ml-auto w-8 h-8 rounded-full bg-zinc-50 text-zinc-400 flex items-center justify-center group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
