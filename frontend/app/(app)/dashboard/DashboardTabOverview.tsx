import React, { useState } from 'react'
import { EventDetails, ProfileResponse } from '@/services/api.types'
import { updateEvent } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { differenceInDays, differenceInHours } from 'date-fns'

interface DashboardTabOverviewProps {
    event: EventDetails
    user: ProfileResponse | null
    onUpdate: () => void
}

export function DashboardTabOverview({ event, user, onUpdate }: DashboardTabOverviewProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)

    // Check permissions
    const canEdit = user?.user_id === event.organizer_id

    // Date Logic
    const startDate = new Date(event.start_datetime)
    const daysLeft = differenceInDays(startDate, new Date())
    const hoursLeft = differenceInHours(startDate, new Date())
    const isPast = hoursLeft < 0

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

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
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
                    // READ ONLY MODE
                    <div className="bg-white rounded-[2.5rem] border border-zinc-200 p-10 shadow-sm space-y-10 relative overflow-hidden">
                        {/* Status Ribbon/Badge */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${event.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                                    }`}>
                                    {event.status}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
                                    {event.type}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wider">
                                    {event.format.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Countdown */}
                            <div className="flex items-center gap-2 text-zinc-400 font-bold text-sm">
                                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {isPast ? (
                                    <span>Event Ended</span>
                                ) : (
                                    <span className="text-zinc-900">{daysLeft} Days Left</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {/* Left Column: Description */}
                            <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">About Event</h4>
                                </div>
                                <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap text-base">
                                    {form.description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Right Column: Details */}
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Venue</h4>
                                    <div className="flex items-start gap-2 text-zinc-900 font-medium">
                                        <svg className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{form.venue_remark || 'No venue set'}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Time</h4>
                                    <div className="flex items-start gap-2 text-zinc-900 font-medium">
                                        <svg className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex flex-col">
                                            <span>{new Date(event.start_datetime).toLocaleDateString()}</span>
                                            <span className="text-sm text-zinc-500">
                                                {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Capacity</h4>
                                    <div className="flex items-center gap-2 text-zinc-900 font-medium">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        {event.max_participant ? `${event.max_participant} People` : 'Unlimited'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {canEdit && (
                            <div className="pt-6 border-t border-zinc-100 flex justify-end">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Details
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

    )
}
