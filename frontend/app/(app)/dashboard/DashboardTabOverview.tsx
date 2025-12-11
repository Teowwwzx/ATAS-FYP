import React, { useState } from 'react'
import { EventDetails, ProfileResponse } from '@/services/api.types'
import { updateEvent } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { differenceInDays, differenceInHours } from 'date-fns'
import useSWR from 'swr'
import { getEventAttendanceStats } from '@/services/api'
import { EventPhase, canEditCoreDetails } from '@/lib/eventPhases'

interface DashboardTabOverviewProps {
    event: EventDetails
    user: ProfileResponse | null
    role?: string | null
    phase: EventPhase // Add phase prop
    onUpdate: () => void
}

export function DashboardTabOverview({ event, user, role, phase, onUpdate }: DashboardTabOverviewProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)

    // Check permissions
    const isOrganizer = user?.user_id === event.organizer_id
    const isCommittee = role === 'committee'
    const canEdit = isOrganizer || isCommittee

    // Date Logic
    const startDate = new Date(event.start_datetime)
    const endDate = new Date(event.end_datetime)
    const now = new Date()

    const isEnded = now > endDate
    const isOngoing = now >= startDate && now <= endDate
    const daysLeft = differenceInDays(startDate, now)

    // Form State
    const [form, setForm] = useState({
        title: event.title,
        description: event.description || '',
        venue_remark: event.venue_remark || '',
        max_participant: event.max_participant || 0,
        start_datetime: event.start_datetime.slice(0, 16),
        end_datetime: event.end_datetime.slice(0, 16),
    })

    const handleUpdate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!canEdit) return

        setLoading(true)
        try {
            await updateEvent(event.id, {
                ...form,
                max_participant: form.max_participant > 0 ? form.max_participant : null,
                start_datetime: new Date(form.start_datetime).toISOString(),
                end_datetime: new Date(form.end_datetime).toISOString(),
            })
            toast.success('Event settings updated')
            setIsEditing(false) // Exit edit mode on success
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update event')
        } finally {
            setLoading(false)
        }
    }

    // Fetch Stats
    const { data: stats } = useSWR(`/events/${event.id}/attendance/stats`, () => getEventAttendanceStats(event.id))
    const totalParticipants = stats?.total_participants || 0

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
            <div className="w-full">
                {isEditing && canEdit ? (
                    // EDIT MODE
                    <form onSubmit={handleUpdate} className="bg-white rounded-[2.5rem] border border-zinc-200 p-10 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-zinc-900">Edit Details</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-2.5 text-zinc-600 font-bold text-sm hover:text-zinc-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 font-bold text-zinc-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    rows={5}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Venue</label>
                                    <input
                                        type="text"
                                        value={form.venue_remark}
                                        onChange={(e) => setForm({ ...form, venue_remark: e.target.value })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Max Participants</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.max_participant}
                                        onChange={(e) => setForm({ ...form, max_participant: parseInt(e.target.value) || 0 })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                                    />
                                    <p className="text-[10px] text-zinc-400 mt-2 font-medium">Set to 0 for unlimited.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        value={form.start_datetime}
                                        onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={form.end_datetime}
                                        onChange={(e) => setForm({ ...form, end_datetime: e.target.value })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (
                    // READ ONLY MODE (Redesigned - Clean & Compact)
                    <div className="space-y-6">
                        {/* 1. Metrics Strip (No Cards, Just Clean Stats) */}
                        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-around gap-6">

                            {/* Status */}
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${event.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-500'}`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-zinc-900 capitalize">{event.status}</span>
                                        {event.status === 'published' && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
                                    </div>
                                </div>
                            </div>

                            {/* Divider (Hidden on mobile) */}
                            <div className="hidden md:block w-px h-12 bg-zinc-100"></div>

                            {/* Timeline */}
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Timeline</h4>
                                    <div className="flex items-baseline gap-1">
                                        {isEnded ? (
                                            <span className="text-lg font-black text-zinc-900">Ended</span>
                                        ) : isOngoing ? (
                                            <span className="text-lg font-black text-green-600 animate-pulse">Ongoing</span>
                                        ) : (
                                            <>
                                                <span className="text-lg font-black text-zinc-900">{Math.max(0, daysLeft)}</span>
                                                <span className="text-xs font-bold text-zinc-500">Days Left</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="hidden md:block w-px h-12 bg-zinc-100"></div>

                            {/* Registrations */}
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Registrations</h4>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-black text-zinc-900">{totalParticipants}</span>
                                        <span className="text-xs font-bold text-zinc-500">
                                            / {event.max_participant ? event.max_participant : '∞'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Main Detail Area (NO ACTIONS SIDEBAR) */}
                        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">

                            {/* About & Dates */}
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-zinc-900">About Event</h3>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => window.open(`/events/${event.id}`, '_blank')}
                                            className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            View Public Page
                                        </button>
                                        {canEdit && canEditCoreDetails(phase) && (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="prose prose-zinc prose-sm max-w-none">
                                    <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                        {form.description || 'No description provided.'}
                                    </p>
                                </div>

                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex gap-3">
                                        <div className="mt-1">
                                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Venue</h4>
                                            <p className="text-sm font-semibold text-zinc-900">{form.venue_remark || 'No venue set'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="mt-1">
                                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Schedule</h4>
                                            <p className="text-sm font-semibold text-zinc-900">
                                                {new Date(event.start_datetime).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
