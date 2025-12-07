"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, getEventParticipants, respondInvitationMe, getMe } from '@/services/api'
import { EventDetails, UserMeResponse, EventParticipantStatus, EventParticipantDetails } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function EventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const eventId = params.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
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

    // Expert View: Pending Invitation
    if (myParticipant?.status === 'pending') {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <div className="bg-white border rounded-2xl shadow-sm p-8 text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Invitation Request</h1>
                    <p className="text-lg text-gray-600">
                        You have been invited to speak at <strong>{event.title}</strong>.
                    </p>

                    <div className="bg-gray-50 text-left p-6 rounded-xl border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500">Date & Time</label>
                                <p className="font-medium text-gray-900">
                                    {new Date(event.start_datetime).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Duration</label>
                                <p className="font-medium text-gray-900">
                                    {Math.round((new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / 60000)} mins
                                </p>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs text-gray-500">Description</label>
                                <div className="prose prose-sm mt-1 text-gray-800 whitespace-pre-wrap">
                                    {myParticipant.description || event.description}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Role</label>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                    {myParticipant.role}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <button
                            onClick={() => handleResponse('rejected')}
                            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors w-full sm:w-auto"
                        >
                            Decline
                        </button>
                        <button
                            onClick={() => handleResponse('accepted')}
                            className="px-6 py-3 rounded-xl bg-yellow-500 text-white font-bold hover:bg-yellow-600 shadow-lg shadow-yellow-500/30 transition-all w-full sm:w-auto"
                        >
                            Accept Invitation
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Normal Event Page
    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="mb-6">
                <Link href="/main/events" className="text-gray-500 hover:text-gray-900 mb-4 inline-block">&larr; Back to Events</Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                            <span>{new Date(event.start_datetime).toLocaleString()}</span>
                            <span>&bull;</span>
                            <span className="capitalize">{event.format.replace('_', ' ')}</span>
                        </p>
                    </div>
                    {myParticipant && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${myParticipant.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' :
                            myParticipant.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                            {myParticipant.status.charAt(0).toUpperCase() + myParticipant.status.slice(1)}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Cover Image */}
                    <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden relative">
                        {event.cover_url ? (
                            <img src={event.cover_url} alt={event.title} className="object-cover w-full h-full" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">No Cover Image</div>
                        )}
                    </div>

                    <div className="prose max-w-none">
                        <h3 className="text-lg font-bold text-gray-900">About this event</h3>
                        <p className="whitespace-pre-wrap">{event.description}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Registration</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Price</span>
                                <span className="font-medium capitalize">{event.registration_type}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Type</span>
                                <span className="font-medium capitalize">{event.type}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Availability</span>
                                <span className="font-medium capitalize">{event.visibility}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
