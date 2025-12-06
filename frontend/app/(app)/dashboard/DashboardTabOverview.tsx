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
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-8">
            {/* Status & Countdown Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-zinc-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[80px] opacity-10 -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black mb-2">{event.title}</h2>
                        <p className="text-zinc-400 font-medium mb-8 max-w-lg">{event.description ? event.description.slice(0, 100) + '...' : 'Plan and manage your event here.'}</p>

                        <div className="flex gap-8">
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${event.status === 'published' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-zinc-300'
                                    }`}>
                                    {event.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Countdown</p>
                                <div className="text-3xl font-black text-yellow-400">
                                    {isPast ? (
                                        <span className="text-zinc-500">Event Ended</span>
                                    ) : (
                                        <>
                                            {daysLeft} <span className="text-sm font-bold text-white">Days Left</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats or Actions */}
                <div className="bg-white border border-zinc-200 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-1">Participants</h3>
                    <p className="text-sm text-zinc-500 mb-4">Manage your audience.</p>
                    <button onClick={() => document.getElementById('tab-people')?.click()} className="text-yellow-600 font-bold hover:underline">View People &rarr;</button>
                </div>
            </div>

            <div className="w-full">
                {isEditing && canEdit ? (
                    // EDIT MODE
                    <form onSubmit={handleUpdate} className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-black text-zinc-900">Edit Event Details</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-2 text-zinc-600 font-bold text-sm hover:text-zinc-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 font-bold text-zinc-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    rows={5}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Venue</label>
                                    <input
                                        type="text"
                                        value={form.venue_remark}
                                        onChange={(e) => setForm({ ...form, venue_remark: e.target.value })}
                                        className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Max Participants</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.max_participant}
                                        onChange={(e) => setForm({ ...form, max_participant: parseInt(e.target.value) || 0 })}
                                        className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                                    />
                                    <p className="text-[10px] text-zinc-400 mt-1 font-medium">Set to 0 for unlimited.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        value={form.start_datetime}
                                        onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
                                        className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={form.end_datetime}
                                        onChange={(e) => setForm({ ...form, end_datetime: e.target.value })}
                                        className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (
                    // READ ONLY MODE
                    <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm space-y-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-zinc-900 mb-2">{form.title}</h3>
                                <div className="flex items-center gap-4 text-zinc-500 font-medium text-sm">
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {new Date(event.start_datetime).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {form.venue_remark || 'No venue set'}
                                    </span>
                                </div>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-5 py-2 bg-white border-2 border-zinc-200 text-zinc-900 rounded-xl font-bold text-sm shadow-sm hover:border-zinc-300 hover:bg-zinc-50 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Edit Details
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-zinc-100 pt-8">
                            <div className="md:col-span-2 space-y-2">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Description</h4>
                                <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                    {form.description || 'No description provided.'}
                                </p>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Capacity</h4>
                                    <p className="font-bold text-zinc-900 text-lg">
                                        {event.max_participant ? `${event.max_participant} People` : 'Unlimited'}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Time</h4>
                                    <p className="font-bold text-zinc-900">
                                        {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <span className="text-zinc-400 font-normal mx-2">to</span>
                                        {new Date(event.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

    )
}
