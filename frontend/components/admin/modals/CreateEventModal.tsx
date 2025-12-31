'use client'

import { useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon, ImageIcon } from '@radix-ui/react-icons'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { updateEventCover, updateEventLogo } from '@/services/api'
import { UserSearchSelect } from '@/components/admin/UserSearchSelect'
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete'

interface CreateEventModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        venue_place_id: '',
        venue_remark: '',
        max_participant: 100,
        type: 'physical',
        format: 'seminar', // Default to seminar
        visibility: 'public',
        owner_id: '',
        registration_type: 'free',
        status: 'draft'
    })

    const [files, setFiles] = useState<{ cover: File | null; logo: File | null }>({ cover: null, logo: null })
    const coverRef = useRef<HTMLInputElement>(null)
    const logoRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
        }
    }

    const handleClearFile = (type: 'cover' | 'logo') => {
        setFiles(prev => ({ ...prev, [type]: null }))
        if (type === 'cover' && coverRef.current) coverRef.current.value = ''
        if (type === 'logo' && logoRef.current) logoRef.current.value = ''
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            // Validate dates
            const start = new Date(formData.start_datetime)
            const end = new Date(formData.end_datetime)
            if (end <= start) {
                toast.error('End date must be after start date')
                setIsLoading(false)
                return
            }

            // Create Event (as current admin)
            const createdEvent = await adminService.createEvent({
                title: formData.title,
                description: formData.description,
                start_datetime: start.toISOString(),
                end_datetime: end.toISOString(),
                venue_place_id: formData.venue_place_id,
                venue_remark: formData.venue_remark,
                max_participant: formData.max_participant,
                type: formData.type,
                format: formData.format,
                visibility: formData.visibility,
                registration_type: formData.registration_type,
                status: formData.status
            })

            // If owner_id specified, transfer ownership immediately
            if (formData.owner_id) {
                await adminService.updateEvent(createdEvent.id, {
                    organizer_id: formData.owner_id
                })
            }

            // Upload Files if any
            const uploadPromises = []
            if (files.cover) {
                uploadPromises.push(updateEventCover(createdEvent.id, files.cover))
            }
            if (files.logo) {
                uploadPromises.push(updateEventLogo(createdEvent.id, files.logo))
            }

            if (uploadPromises.length > 0) {
                await Promise.all(uploadPromises).catch(() => {
                    toast.error('Some uploads failed, but event was created')
                })
            }

            toast.success('Event created and assigned successfully')
            onSuccess()
            onClose()

            // Reset form
            setFormData({
                title: '',
                description: '',
                start_datetime: '',
                end_datetime: '',
                venue_place_id: '',
                venue_remark: '',
                max_participant: 100,
                type: 'physical',
                format: 'seminar',
                visibility: 'public',
                owner_id: '',
                registration_type: 'free',
                status: 'draft'
            })
            setFiles({ cover: null, logo: null })
        } catch (error) {
            toast.error('Failed to create event')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-lg outline-none max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-gray-900">Create New Event</Dialog.Title>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Section: Basic Info */}
                        <div className="space-y-4 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Event Title</label>
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                                    required
                                    placeholder="e.g. Annual Tech Symposium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                    placeholder="Provide a compelling description..."
                                />
                            </div>
                        </div>

                        {/* Section: Organizer & Settings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Event Organizer (Owner)</label>
                                <UserSearchSelect
                                    onSelect={(u) => setFormData({ ...formData, owner_id: u?.id || '' })}
                                    placeholder="Search user to assign as organizer..."
                                />
                            </div>
                        </div>

                        {/* Section: Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.start_datetime}
                                    onChange={e => setFormData({ ...formData, start_datetime: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.end_datetime}
                                    onChange={e => setFormData({ ...formData, end_datetime: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Section: Venue */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Venue (Local or Online)</label>
                            <PlacesAutocomplete
                                onPlaceSelect={(place: any) => setFormData({
                                    ...formData,
                                    venue_remark: place.label,
                                    venue_place_id: place.value?.place_id || ''
                                })}
                                defaultValue={formData.venue_remark}
                            />
                        </div>

                        {/* Section: Format & Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Format</label>
                                <select
                                    value={formData.format}
                                    onChange={e => setFormData({ ...formData, format: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="seminar">Seminar</option>
                                    <option value="conference">Conference</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="webinar">Webinar</option>
                                    <option value="networking">Networking</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="physical">Physical</option>
                                    <option value="online">Online</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        {/* Section: Status & Registration Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Initial Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Registration Type</label>
                                <select
                                    value={formData.registration_type}
                                    onChange={e => setFormData({ ...formData, registration_type: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="free">Free</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>

                        {/* Section: Images */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Cover
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={coverRef}
                                    onChange={e => handleFileChange(e, 'cover')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Logo
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={logoRef}
                                    onChange={e => handleFileChange(e, 'logo')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
                            >
                                {isLoading ? 'Creating Event...' : 'Create & Assign Event'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
