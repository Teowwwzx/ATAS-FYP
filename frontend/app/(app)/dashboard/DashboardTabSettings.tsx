import React, { useState } from 'react'
import { EventDetails } from '@/services/api.types'
import { updateEvent, openRegistration, closeRegistration, deleteEvent, uploadEventPaymentQR } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { DeleteEventModal } from '@/components/modals/DeleteEventModal'

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
        </div>
    )
}
