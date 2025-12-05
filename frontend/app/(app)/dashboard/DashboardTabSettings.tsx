import React, { useState } from 'react'
import { EventDetails } from '@/services/api.types'
import { updateEvent, openRegistration, closeRegistration, deleteEvent } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface DashboardTabSettingsProps {
    event: EventDetails
    onUpdate: () => void
}

export function DashboardTabSettings({ event, onUpdate }: DashboardTabSettingsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        title: event.title,
        description: event.description || '',
        venue_remark: event.venue_remark || '',
        max_participant: event.max_participant || 0,
        start_datetime: event.start_datetime.slice(0, 16), // Format for datetime-local
        end_datetime: event.end_datetime.slice(0, 16),
    })

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await updateEvent(event.id, {
                ...form,
                max_participant: form.max_participant > 0 ? form.max_participant : null,
                start_datetime: new Date(form.start_datetime).toISOString(),
                end_datetime: new Date(form.end_datetime).toISOString(),
            })
            toast.success('Event settings updated')
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update event')
        } finally {
            setLoading(false)
        }
    }

    const toggleRegistration = async () => {
        setLoading(true)
        try {
            if (event.registration_status === 'opened') {
                await closeRegistration(event.id)
                toast.success('Registration closed')
            } else {
                await openRegistration(event.id)
                toast.success('Registration opened')
            }
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update registration status')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return
        setLoading(true)
        try {
            await deleteEvent(event.id)
            toast.success('Event deleted')
            router.push('/dashboard')
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete event')
            setLoading(false)
        }
    }

    return (
        <div className="space-y-12 animate-fadeIn max-w-4xl mx-auto">

            {/* General Settings */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-zinc-900">General Settings</h3>
                        <p className="text-zinc-500 font-medium">Update your event's basic information.</p>
                    </div>
                </div>

                <form onSubmit={handleUpdate} className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Event Title</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 font-bold text-zinc-900"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                            <textarea
                                rows={4}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Venue / Location</label>
                            <input
                                type="text"
                                value={form.venue_remark}
                                onChange={(e) => setForm({ ...form, venue_remark: e.target.value })}
                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Max Participants</label>
                            <input
                                type="number"
                                min="0"
                                value={form.max_participant}
                                onChange={(e) => setForm({ ...form, max_participant: parseInt(e.target.value) || 0 })}
                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1 font-medium">Set to 0 for unlimited.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Start Date & Time</label>
                            <input
                                type="datetime-local"
                                value={form.start_datetime}
                                onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">End Date & Time</label>
                            <input
                                type="datetime-local"
                                value={form.end_datetime}
                                onChange={(e) => setForm({ ...form, end_datetime: e.target.value })}
                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold shadow-lg hover:bg-zinc-800 transition-all hover:-translate-y-1 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </section>

            {/* Registration Controls */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-zinc-900">Registration</h3>
                        <p className="text-zinc-500 font-medium">Control who can join your event.</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-900 mb-1">
                            Registration is currently {event.registration_status === 'opened' ? (
                                <span className="text-green-500">OPEN</span>
                            ) : (
                                <span className="text-red-500">CLOSED</span>
                            )}
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            {event.registration_status === 'opened'
                                ? 'Participants can register for this event.'
                                : 'No new registrations are accepted.'}
                        </p>
                    </div>
                    <button
                        onClick={toggleRegistration}
                        disabled={loading}
                        className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${event.registration_status === 'opened'
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                            }`}
                    >
                        {event.registration_status === 'opened' ? 'Close Registration' : 'Open Registration'}
                    </button>
                </div>
            </section>

            {/* Danger Zone */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-red-500">Danger Zone</h3>
                        <p className="text-zinc-500 font-medium">Irreversible actions.</p>
                    </div>
                </div>

                <div className="bg-red-50 rounded-[2rem] border border-red-100 p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-bold text-red-900 mb-1">Delete Event</h4>
                            <p className="text-red-700/80 text-sm font-medium">
                                Once deleted, this event cannot be restored.
                            </p>
                        </div>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="px-6 py-3 bg-white text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-50 transition-all shadow-sm"
                        >
                            Delete Event
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}
