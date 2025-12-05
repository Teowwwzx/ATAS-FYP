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
                        </div>
                    </div>
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
                                                <span className="text-4xl font-black text-zinc-900 tracking-tight">$$$</span>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleJoin}
                                            disabled={registering}
                                            className="block w-full py-4 bg-yellow-400 text-zinc-900 rounded-2xl font-bold text-center text-lg hover:bg-yellow-300 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                                        >
                                            {registering ? 'Registering...' : 'Register Now'}
                                        </button>
                                    </div>
                                )}
                            </div>

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
        </div>
    )
}
