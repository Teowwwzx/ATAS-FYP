import React, { useState } from 'react'
import { EventDetails } from '@/services/api.types'
import { updateEvent, openRegistration, closeRegistration, deleteEvent, uploadEventPaymentQR } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { DeleteEventModal } from '@/components/modals/DeleteEventModal'
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'

const libraries: ("places")[] = ["places"]

interface DashboardTabSettingsProps {
    event: EventDetails
    onUpdate: () => void
    onDelete: () => void
}

export function DashboardTabSettings({ event, onUpdate, onDelete }: DashboardTabSettingsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [qrFile, setQrFile] = useState<File | null>(null)
    const [isUploadingQR, setIsUploadingQR] = useState(false)

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })

    // Configuration Form State
    const [configForm, setConfigForm] = useState({
        start_datetime: event.start_datetime.slice(0, 16),
        end_datetime: event.end_datetime.slice(0, 16),
        venue_remark: event.venue_remark || '',
        venue_place_id: event.venue_place_id || '',
        max_participant: event.max_participant || 0,
        registration_type: event.registration_type || 'free',
        format: event.format || 'workshop',
        type: event.type || 'offline',
    })

    const handleConfigUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await updateEvent(event.id, {
                ...configForm,
                max_participant: configForm.max_participant > 0 ? configForm.max_participant : null,
                start_datetime: new Date(configForm.start_datetime).toISOString(),
                end_datetime: new Date(configForm.end_datetime).toISOString(),
            })
            toast.success('Event configuration updated')
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update configuration')
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

    const handleUploadQR = async () => {
        if (!qrFile) return
        setIsUploadingQR(true)
        try {
            await uploadEventPaymentQR(event.id, qrFile)
            toast.success('Payment QR uploaded')
            setQrFile(null)
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to upload payment QR')
        } finally {
            setIsUploadingQR(false)
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
        setIsDeleting(true)
        try {
            await deleteEvent(event.id)
            toast.success('Event deleted')
            setShowDeleteModal(false)
            onDelete() // Use callback instead of router.push
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete event')
        } finally {
            setIsDeleting(false)
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

            {/* Logistics & Configuration */}
            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm">
                    <div className="mb-8">
                        <h4 className="text-xl font-bold text-zinc-900 mb-2">Event Configuration</h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            Manage critical logistics. Changing these may affect existing registrations.
                        </p>
                    </div>

                    <form onSubmit={handleConfigUpdate} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Start Date</label>
                                <input
                                    type="datetime-local"
                                    value={configForm.start_datetime}
                                    onChange={(e) => setConfigForm({ ...configForm, start_datetime: e.target.value })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">End Date</label>
                                <input
                                    type="datetime-local"
                                    value={configForm.end_datetime}
                                    onChange={(e) => setConfigForm({ ...configForm, end_datetime: e.target.value })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Venue</label>
                            {isLoaded ? (
                                <PlacesAutocomplete
                                    value={configForm.venue_remark}
                                    onChange={(address) => setConfigForm({ ...configForm, venue_remark: address })}
                                    onSelect={async (address) => {
                                        setConfigForm(prev => ({ ...prev, venue_remark: address }))
                                        try {
                                            const results = await geocodeByAddress(address)
                                            const placeId = results[0].place_id
                                            setConfigForm(prev => ({ ...prev, venue_place_id: placeId }))
                                        } catch (error) {
                                            console.error('Error selecting place', error)
                                        }
                                    }}
                                >
                                    {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                                        <div className="relative">
                                            <input
                                                {...getInputProps({
                                                    placeholder: 'Search for a location...',
                                                    className: "block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                                                })}
                                            />
                                            {suggestions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden">
                                                    {loading && <div className="p-3 text-sm text-zinc-500">Loading...</div>}
                                                    {suggestions.map((suggestion) => {
                                                        const className = suggestion.active
                                                            ? 'px-4 py-3 bg-yellow-50 cursor-pointer'
                                                            : 'px-4 py-3 bg-white cursor-pointer hover:bg-gray-50';
                                                        const { key, ...optionProps } = getSuggestionItemProps(suggestion, { className });
                                                        return (
                                                            <div key={suggestion.placeId} {...optionProps}>
                                                                <div className="font-bold text-zinc-900 text-sm">{suggestion.formattedSuggestion.mainText}</div>
                                                                <div className="text-xs text-zinc-500">{suggestion.formattedSuggestion.secondaryText}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </PlacesAutocomplete>
                            ) : (
                                <div className="block w-full rounded-2xl border-zinc-200 bg-zinc-100 py-3 px-4 text-zinc-400">Loading Maps...</div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Max Participants</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={configForm.max_participant}
                                    onChange={(e) => setConfigForm({ ...configForm, max_participant: parseInt(e.target.value) || 0 })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                                />
                                <p className="text-[10px] text-zinc-400 mt-2 font-medium">Set to 0 for unlimited.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Registration Type</label>
                                <select
                                    value={configForm.registration_type}
                                    onChange={(e) => setConfigForm({ ...configForm, registration_type: e.target.value as any })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900"
                                >
                                    <option value="free">Free</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Event Format</label>
                                <select
                                    value={configForm.format}
                                    onChange={(e) => setConfigForm({ ...configForm, format: e.target.value as any })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:border-yellow-400 py-3 px-4 text-zinc-900 capitalize"
                                >
                                    <option value="workshop">Workshop</option>
                                    <option value="seminar">Seminar</option>
                                    <option value="webinar">Webinar</option>
                                    <option value="panel_discussion">Panel Discussion</option>
                                    <option value="club_event">Club Event</option>
                                    <option value="conference">Conference</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Event Type</label>
                                <select
                                    value={configForm.type}
                                    onChange={(e) => setConfigForm({ ...configForm, type: e.target.value as any })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:border-yellow-400 py-3 px-4 text-zinc-900 capitalize"
                                >
                                    <option value="offline">Offline (Physical)</option>
                                    <option value="online">Online</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold shadow-lg hover:bg-zinc-800 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Update Configuration'}
                            </button>
                        </div>
                    </form>
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

            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <h4 className="text-lg font-bold text-zinc-900 mb-1">Payment QR</h4>
                            <p className="text-zinc-500 text-sm font-medium">Upload a bank transfer/DuitNow QR for paid events. Visible only to joined participants.</p>
                            {event.payment_qr_url && (
                                <div className="mt-4">
                                    <img src={event.payment_qr_url} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl border border-zinc-200" />
                                </div>
                            )}
                        </div>
                        <div className="w-full max-w-sm">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-zinc-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-zinc-900 hover:file:bg-yellow-300"
                            />
                            <button
                                onClick={handleUploadQR}
                                disabled={!qrFile || isUploadingQR}
                                className="mt-3 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                            >
                                {isUploadingQR ? 'Uploading...' : 'Upload QR'}
                            </button>
                        </div>
                    </div>
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
                            onClick={() => setShowDeleteModal(true)}
                            disabled={loading}
                            className="px-6 py-3 bg-white text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-50 transition-all shadow-sm"
                        >
                            Delete Event
                        </button>
                    </div>
                </div>
            </section>

            {/* Delete Confirmation Modal */}
            <DeleteEventModal
                isOpen={showDeleteModal}
                eventTitle={event.title}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </div >
    )
}
