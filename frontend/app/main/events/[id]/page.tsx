"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, getEventParticipants, respondInvitationMe, getMe } from '@/services/api'
import { EventDetails, UserMeResponse, EventParticipantDetails } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { EventHeroCard } from '@/components/ui/EventHeroCard'

export default function EventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const eventId = params.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [participants, setParticipants] = useState<EventParticipantDetails[]>([])
    const [myParticipant, setMyParticipant] = useState<EventParticipantDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<UserMeResponse | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [evt, parts, me] = await Promise.all([
                    getEventById(eventId),
                    getEventParticipants(eventId),
                    getMe().catch(() => null)
                ])
                setEvent(evt)
                setParticipants(parts)
                setUser(me)
                if (me) {
                    const found = parts.find(p => p.user_id === me.id)
                    setMyParticipant(found || null)
                }
            } catch (error) {
                console.error(error)
                toast.error('Failed to load event details')
            } finally {
                setLoading(false)
            }
        }
        if (eventId) fetchData()
    }, [eventId])

    const handleResponse = async (status: 'accepted' | 'rejected') => {
        try {
            await respondInvitationMe(eventId, { status })
            toast.success(`Invitation ${status}`)
            // Refresh
            const parts = await getEventParticipants(eventId)
            setParticipants(parts)
            if (user) {
                const found = parts.find(p => p.user_id === user.id)
                setMyParticipant(found || null)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to update status')
        }
    }

    if (loading) return <div className="p-6">Loading...</div>
    if (!event) return <div className="p-6">Event not found</div>

    // Expert View: Pending Invitation (Disabled for testing public view)
    // if (myParticipant?.status === 'pending') { ... } 

    // Normal Event Page
    // Find organizer
    const organizer = participants.find(p => p.role === 'organizer')

    return (
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 animate-fadeIn">
            <div className="mb-8">
                <Link href="/main/events" className="text-zinc-500 hover:text-zinc-900 mb-6 inline-flex items-center gap-2 font-medium transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Events
                </Link>

                {/* Hero Card */}
                <div className="mb-12">
                    <EventHeroCard event={event} enableImagePreview />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: About */}
                    <div className="lg:col-span-8 space-y-10">
                        {/* Status for My Participant */}
                        {myParticipant && (
                            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                                <span className="text-zinc-500 font-medium">Your Status</span>
                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${myParticipant.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                                    myParticipant.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                        'bg-zinc-100 text-zinc-600 border-zinc-200'
                                    }`}>
                                    {myParticipant.status}
                                </span>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-1 w-10 bg-yellow-400 rounded-full"></div>
                                <h3 className="text-xl font-black text-zinc-900 uppercase tracking-wide">About This Event</h3>
                            </div>
                            <div className="prose prose-lg max-w-none text-zinc-600 leading-relaxed">
                                <p className="whitespace-pre-wrap">{event.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Register & Organizer */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Register Card */}
                        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-200/50">
                            <button
                                className="w-full bg-yellow-400 text-zinc-900 font-black py-4 rounded-xl hover:bg-yellow-500 transition-all shadow-lg hover:shadow-xl active:scale-95 text-lg"
                                onClick={() => {/* Handle registration logic */ }}
                            >
                                Register Now
                            </button>
                        </div>

                        {/* Organizer Card */}
                        <div>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Organizer</h4>
                            <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-xl font-bold text-zinc-400 overflow-hidden">
                                    {organizer ? (
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${organizer.user_id}&background=random`}
                                            alt="Org"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : 'O'}
                                </div>
                                <div>
                                    <p className="font-bold text-zinc-900">Event Host</p>
                                    <p className="text-xs text-zinc-500 font-medium">View Profile</p>
                                </div>
                                <div className="ml-auto w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
