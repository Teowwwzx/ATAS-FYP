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


    // We can remove form state for title/desc if this tab no longer edits them.
    // Keeping simple state for toggles or direct API calls.

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
        <div className="space-y-12 animate-fadeIn max-w-6xl mx-auto">

            {/* Visibility Settings */}
            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-900 mb-1">
                            Visibility
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            {event.visibility === 'public'
                                ? 'Your event is visible to everyone.'
                                : 'Only you can see this event.'}
                        </p>
                    </div>

                    <button
                        onClick={toggleVisibility}
                        disabled={loading}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${event.visibility === 'public' ? 'bg-yellow-400' : 'bg-zinc-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${event.visibility === 'public' ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </section>

            {/* Capacity Settings (Read-only logic for now based on previous impl, or we can move the input here if requested, but user said 'Overview should editing those event information') 
               Wait, "setting is like setting registration, visibility and publishment". Capacity fits in "Event Details" usually, but sometimes limits are settings.
               User said: "Overview should editing those event information" -> Title, Desc, Date, Venue, Capacity. 
               Settings -> Registration Status, Visibility, Publish/Unpublish (Danger/Actions).
               
               I will NOT put Capacity input here. I will leave Capacity editing in Overview (Event Info form).
            */}

            {/* Registration Controls */}
            {/* Registration Controls */}
            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-900 mb-1">
                            Registration Status
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            {event.registration_status === 'opened'
                                ? 'Participants are currently allowed to register.'
                                : 'Registration is closed. No new participants can join.'}
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={toggleRegistration}
                        disabled={loading}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${event.registration_status === 'opened' ? 'bg-green-500' : 'bg-zinc-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${event.registration_status === 'opened' ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </section>

            {/* Danger Zone */}
            <section>
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
