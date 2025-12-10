
'use client'

import React, { useEffect, useState } from 'react'
import { getMyRequests, respondInvitationMe } from '@/services/api'
import { EventInvitationResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<EventInvitationResponse[]>([])
    const [loading, setLoading] = useState(true)

    const fetchRequests = async () => {
        try {
            const data = await getMyRequests()
            setRequests(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load requests')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleRespond = async (eventId: string, status: 'accepted' | 'rejected') => {
        try {
            await respondInvitationMe(eventId, { status })
            toast.success(`Request ${status}`)
            fetchRequests() // Refresh list
        } catch (error) {
            console.error(error)
            toast.error('Failed to process request')
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading requests...</div>
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-black text-zinc-900 mb-2">My Requests</h1>
            <p className="text-zinc-500 mb-8">Manage your pending invitations and booking requests.</p>

            {requests.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200">
                    <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">No Pending Requests</h3>
                    <p className="text-zinc-500">You don't have any pending invitations at the moment.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                        {req.role}
                                    </span>
                                    <span className="text-zinc-400 text-xs font-medium">
                                        Invited on {format(new Date(req.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 mb-1">
                                    <Link href={`/requests/${req.event.id}`} className="hover:text-amber-600 transition-colors">
                                        {req.event.title}
                                    </Link>
                                </h3>
                                <p className="text-zinc-500 text-sm line-clamp-2 mb-3">
                                    {req.event.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-zinc-500">
                                    <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {format(new Date(req.event.start_datetime), 'MMM d, h:mm a')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {req.event.type}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 md:border-l md:border-zinc-100 md:pl-6 md:w-auto w-full md:justify-end">
                                <button
                                    onClick={() => handleRespond(req.event.id, 'rejected')}
                                    className="flex-1 md:flex-none px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={() => handleRespond(req.event.id, 'accepted')}
                                    className="flex-1 md:flex-none px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
