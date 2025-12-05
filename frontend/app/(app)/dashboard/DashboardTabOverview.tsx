import React, { useState } from 'react'
import { EventDetails } from '@/services/api.types'
import { updateEvent, openRegistration, closeRegistration, deleteEvent } from '@/services/api'
import { toast } from 'react-hot-toast'
import { Switch } from '@headlessui/react'
import { useRouter } from 'next/navigation'

interface DashboardTabOverviewProps {
    event: EventDetails
    onUpdate: () => void
}

export function DashboardTabOverview({ event, onUpdate }: DashboardTabOverviewProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form State
    const [form, setForm] = useState({
        title: event.title,
        description: event.description || '',
        venue_remark: event.venue_remark || '',
        max_participant: event.max_participant || 0,
        start_datetime: event.start_datetime.slice(0, 16),
        end_datetime: event.end_datetime.slice(0, 16),
    })

    // Toggles State (Derived or separate?)
    // We use the event's actual state for initial rendering, but local state for optimistic UI updates? 
    // Usually easier to trigger API calls directly on toggle.

    const handleUpdate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
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

    const toggleVisibility = async () => {
        setLoading(true)
        const newVisibility = event.visibility === 'public' ? 'private' : 'public'
        try {
            await updateEvent(event.id, { visibility: newVisibility })
            toast.success(`Event is now ${newVisibility}`)
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to change visibility')
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
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-8">

            {/* Quick Toggles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Visibility Toggle */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-zinc-900">Visibility</h4>
                        <p className="text-xs text-zinc-500 font-medium">
                            {event.visibility === 'public' ? 'Visible to everyone' : 'Only you can see this'}
                        </p>
                    </div>
                    <Switch
                        checked={event.visibility === 'public'}
                        onChange={toggleVisibility}
                        className={`${event.visibility === 'public' ? 'bg-yellow-400' : 'bg-zinc-200'
                            } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2`}
                    >
                        <span className={`${event.visibility === 'public' ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-5 w-5 transform rounded-full bg-white transition-transform`} />
                    </Switch>
                </div>

                {/* Registration Toggle */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-zinc-900">Registration</h4>
                        <p className="text-xs text-zinc-500 font-medium">
                            {event.registration_status === 'opened' ? 'Open for signup' : 'Closed for now'}
                        </p>
                    </div>
                    <Switch
                        checked={event.registration_status === 'opened'}
                        onChange={toggleRegistration}
                        className={`${event.registration_status === 'opened' ? 'bg-green-500' : 'bg-zinc-200'
                            } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2`}
                    >
                        <span className={`${event.registration_status === 'opened' ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-5 w-5 transform rounded-full bg-white transition-transform`} />
                    </Switch>
                </div>

                {/* Capacity Toggle (Fake toggle for UI, usually just unlimited input) */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-zinc-900">Capacity</h4>
                        <p className="text-xs text-zinc-500 font-medium">
                            {event.max_participant ? `${event.max_participant} seats` : 'Unlimited seats'}
                        </p>
                    </div>
                    <div className="text-xs font-bold text-zinc-400 bg-zinc-100 px-3 py-1 rounded-full">
                        {event.max_participant ? 'LIMITED' : 'UNLIMITED'}
                    </div>
                </div>

            </div>

            {/* Event Details Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleUpdate} className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-black text-zinc-900">Event Details</h3>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
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
                </div>

                {/* Right Column: Danger Zone & Other Info */}
                <div className="space-y-6">
                    <div className="bg-red-50 rounded-[2rem] border border-red-100 p-8">
                        <h4 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h4>
                        <p className="text-red-700/80 text-sm font-medium mb-6">
                            Deleting this event will remove all data, including participants and proposals. This cannot be undone.
                        </p>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-50 transition-all shadow-sm"
                        >
                            Delete Event
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
