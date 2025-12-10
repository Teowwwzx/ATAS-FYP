'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, intervalToDuration, formatDuration } from 'date-fns'
import { getRequestDetails, respondInvitationMe, getProfileByUserId, getEventById, getMe } from '@/services/api'
import { EventInvitationResponse, ProfileResponse, EventDetails, UserMeResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { CommunicationLog } from '@/components/dashboard/CommunicationLog'

export default function RequestDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [request, setRequest] = useState<EventInvitationResponse | null>(null)
    const [organizer, setOrganizer] = useState<ProfileResponse | null>(null)
    const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Parallel fetch
                const [reqData, userData] = await Promise.all([
                    getRequestDetails(id),
                    getMe()
                ])

                setRequest(reqData)
                setCurrentUser(userData)

                // Fetch organizer details using event.organizer_id
                if (reqData.event?.organizer_id) {
                    const orgProfile = await getProfileByUserId(reqData.event.organizer_id)
                    setOrganizer(orgProfile)
                }
            } catch (error) {
                console.error(error)
                toast.error('Failed to load request details')
                router.push('/dashboard')
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            fetchDetails()
        }
    }, [id, router])

    const handleRespond = async (status: 'accepted' | 'rejected') => {
        if (!request) return
        setProcessing(true)
        try {
            await respondInvitationMe(request.event.id, { status })
            toast.success(status === 'accepted' ? 'Invitation accepted!' : 'Invitation declined')
            router.push('/dashboard')
        } catch (error) {
            console.error(error)
            toast.error('Failed to update invitation')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-12">
                <Skeleton className="h-8 w-48 mb-6" />
                <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
        )
    }

    if (!request) return null

    const timeDiff = new Date().getTime() - new Date(request.created_at).getTime()
    const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
    const daysAgo = Math.floor(hoursAgo / 24)
    const timeString = daysAgo > 0 ? `${daysAgo} days ago` : `${hoursAgo} hours ago`

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 animate-fadeIn space-y-8">
            {/* Breadcrumb */}
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-bold text-sm transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-4xl font-black text-zinc-900 tracking-tight">
                    Request #{id.slice(0, 8).toUpperCase()}
                </h1>
                <span className="text-zinc-500 font-medium">
                    Received {timeString}
                </span>
            </div>

            {/* Status / Action Banner */}
            <div className="bg-zinc-900 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl text-white">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Action Required</h2>
                        <p className="text-zinc-400 text-sm">This request is pending your approval.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => handleRespond('rejected')}
                        disabled={processing}
                        className="flex-1 md:flex-none px-6 py-3 border border-zinc-700 hover:bg-zinc-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => handleRespond('accepted')}
                        disabled={processing}
                        className="flex-1 md:flex-none px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Accept Request
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Event & Organizer Card */}
                    <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm">
                        {/* Organizer Section */}
                        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-100">
                            <div className="w-16 h-16 rounded-full bg-zinc-100 overflow-hidden flex-shrink-0">
                                {organizer?.avatar_url ? (
                                    <img src={organizer.avatar_url} alt={organizer.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-xl bg-gradient-to-br from-zinc-100 to-zinc-200">
                                        {organizer?.full_name?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Request From</div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-zinc-900">{organizer?.full_name || 'Unknown User'}</h3>
                                    {organizer?.average_rating && (
                                        <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm bg-yellow-50 px-2 py-0.5 rounded-full">
                                            <span>★</span> {organizer.average_rating.toFixed(1)}
                                        </div>
                                    )}
                                </div>
                                {organizer?.title && <p className="text-zinc-500 text-sm mt-0.5">{organizer.title}</p>}
                            </div>
                        </div>

                        {/* Event Topic & Details Grid */}
                        <div className="mb-8">
                            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Event Topic</div>
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-8">
                                {request.event.title}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                {/* Date */}
                                <div>
                                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Proposed Date</div>
                                    <div className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                                        🗓️ {format(new Date(request.event.start_datetime), 'EEE, MMM d • h:mm a')}
                                    </div>
                                </div>

                                {/* Venue */}
                                <div>
                                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Venue</div>
                                    <div className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                                        📍 {request.event.venue_name || 'Online / TBD'}
                                    </div>
                                </div>

                                {/* Duration */}
                                <div>
                                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Duration</div>
                                    <div className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                                        🕒 {formatDuration(intervalToDuration({
                                            start: new Date(request.event.start_datetime),
                                            end: new Date(request.event.end_datetime)
                                        }), { format: ['hours', 'minutes'] })}
                                    </div>
                                </div>

                                {/* Est Audience */}
                                <div>
                                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Est. Audience</div>
                                    <div className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                                        👥 ~{request.event.max_participant || 50} Students
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invitation Message Section */}
                        <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Invitation Message</h4>

                            {request.description ? (
                                <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                    {request.description}
                                </p>
                            ) : (
                                <p className="text-zinc-400 italic">No specific message included.</p>
                            )}

                            {/* Fallback to Event Description if needed (User asked to remove generic description but keeping as backup logic internally is safe, but based on image, just showing the message is key) */}

                            {/* Linked Proposal Attachment */}
                            {request.proposal && (
                                <div className="mt-8 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm hover:border-yellow-300 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Attached Proposal</div>
                                                <div className="font-bold text-zinc-900 group-hover:text-yellow-600 transition-colors">{request.proposal.title}</div>
                                            </div>
                                        </div>
                                        <a
                                            href={request.proposal.file_url || '#'}
                                            target="_blank"
                                            download
                                            className="px-4 py-2 bg-zinc-900 text-white font-bold text-sm rounded-lg hover:bg-zinc-800 transition-colors shadow-lg"
                                        >
                                            Download PDF
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Communication Log */}
                <div className="space-y-6">
                    <CommunicationLog
                        conversationId={request.conversation_id}
                        organizerName={organizer?.full_name || 'Organizer'}
                        currentUserId={currentUser?.id}
                    />
                </div>
            </div>
        </div>
    )
}
