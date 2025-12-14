'use client'

import React, { useState } from 'react'
import { EventInvitationResponse } from '@/services/api.types'
import { useRouter } from 'next/navigation'

interface DashboardInvitationListProps {
    requests: EventInvitationResponse[]
    onRespond: (reqId: string, eventId: string, status: 'accepted' | 'rejected') => void
    processingReq: string | null
}

export function DashboardInvitationList({ requests, onRespond, processingReq }: DashboardInvitationListProps) {
    const router = useRouter()
    const [page, setPage] = useState(0)

    const PAGE_SIZE = 5
    const totalPages = Math.ceil(requests.length / PAGE_SIZE)
    const visibleRequests = requests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const goNext = () => setPage(p => Math.min(p + 1, totalPages - 1))
    const goPrev = () => setPage(p => Math.max(p - 1, 0))

    if (requests.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center border border-zinc-100 flex flex-col items-center justify-center h-64">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 text-zinc-300">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-zinc-900">No pending invitations</h3>
                <p className="text-zinc-500 text-sm">You're all caught up!</p>
            </div>
        )
    }

    return (
        <div className="w-full space-y-4 animate-fadeIn">
            {visibleRequests.map(req => {
                const eventDate = new Date(req.event.start_datetime)
                const dateStr = eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                const timeStr = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                const hasLocation = req.event.venue_remark || (req.event as any).location

                return (
                    <div key={req.id} className="bg-white rounded-2xl border border-zinc-100 p-4 hover:border-yellow-400 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center group">
                        {/* Date Box */}
                        <div className="flex-shrink-0 w-16 h-16 bg-zinc-50 rounded-xl flex flex-col items-center justify-center border border-zinc-100 text-zinc-900 font-bold group-hover:bg-yellow-50 group-hover:border-yellow-200 group-hover:text-yellow-700 transition-colors">
                            <span className="text-xs uppercase text-zinc-500 group-hover:text-yellow-600">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                            <span className="text-2xl leading-none">{eventDate.getDate()}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${req.role === 'speaker' ? 'bg-purple-100 text-purple-700' :
                                        req.role === 'sponsor' ? 'bg-blue-100 text-blue-700' :
                                            'bg-zinc-100 text-zinc-600'
                                    }`}>
                                    {req.role}
                                </span>
                                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {timeStr}
                                </span>
                            </div>

                            <h3 className="text-lg font-black text-zinc-900 truncate cursor-pointer hover:underline" onClick={() => router.push(`/dashboard/requests/${req.id}`)}>
                                {req.event.title}
                            </h3>

                            <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                                <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                    {req.event.type}
                                </span>
                                {hasLocation && (
                                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {req.event.venue_remark || (req.event as any).location}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                            <button
                                onClick={() => onRespond(req.id, req.event.id, 'accepted')}
                                disabled={processingReq === req.id}
                                className="flex-1 md:flex-none px-4 py-2 bg-zinc-900 text-white rounded-lg font-bold text-sm hover:bg-zinc-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {processingReq === req.id ? '...' : 'Accept'}
                            </button>
                            <button
                                onClick={() => onRespond(req.id, req.event.id, 'rejected')}
                                disabled={processingReq === req.id}
                                className="flex-1 md:flex-none px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg font-bold text-sm hover:bg-zinc-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                )
            })}

            {/* Pagination Controls */}
            {requests.length > PAGE_SIZE && (
                <div className="flex justify-center gap-2 pt-4">
                    <button
                        onClick={goPrev}
                        disabled={page === 0}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${page === 0 ? 'border-zinc-100 text-zinc-300 cursor-not-allowed' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="flex items-center text-xs font-bold text-zinc-400">
                        Page {page + 1} of {totalPages}
                    </span>
                    <button
                        onClick={goNext}
                        disabled={page === totalPages - 1}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${page === totalPages - 1 ? 'border-zinc-100 text-zinc-300 cursor-not-allowed' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            )}
        </div>
    )
}
