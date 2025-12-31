'use client'

import { useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { updateEventCover, updateEventLogo } from '@/services/api'
import { EventRegistrationType } from '@/services/api.types'
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete'
import { UserSearchSelect } from '@/components/admin/UserSearchSelect'

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
        max_participant: 100, // Default to 100
        type: 'physical', // Default
        format: 'seminar', // Default (valid: panel_discussion, workshop, webinar, seminar, club_event, other)
        visibility: 'public', // Default
        registration_type: 'free' as EventRegistrationType,
        price: 0,
        owner_id: '', // For transferring ownership
        auto_publish: false
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

            // 1. Create Event (as Admin)
            const createdEvent = await adminService.createEvent({
                title: formData.title,
                description: formData.description,
                start_datetime: start.toISOString(),
                end_datetime: end.toISOString(),
                venue_place_id: formData.venue_place_id || undefined,
                venue_remark: formData.venue_remark || undefined,
                max_participant: formData.max_participant,
                type: formData.type as any,
                format: formData.format as any,
                visibility: formData.visibility as any,
                registration_type: formData.registration_type,
                price: formData.price
            })

            // 2. Transfer Ownership if owner_id provided
            if (formData.owner_id) {
                try {
                    await adminService.updateEvent(createdEvent.id, { organizer_id: formData.owner_id })
                } catch (e) {
                    console.error('Failed to transfer ownership', e)
                    toast.error('Failed to transfer ownership (Event created under your name)')
                }
            }

            // 3. Upload Files if any
            const uploadPromises = []
            if (files.cover) {
                uploadPromises.push(updateEventCover(createdEvent.id, files.cover)
                    .catch((e: any) => { console.error('Cover upload failed', e); toast.error('Cover upload failed'); }))
            }
            if (files.logo) {
                uploadPromises.push(updateEventLogo(createdEvent.id, files.logo)
                    .catch((e: any) => { console.error('Logo upload failed', e); toast.error('Logo upload failed'); }))
            }

            // 4. Auto Publish
            if (formData.auto_publish) {
                uploadPromises.push(adminService.publishEvent(createdEvent.id)
                    .catch((e: any) => { console.error('Publish failed', e); toast.error('Publish failed'); }))
            }

            await Promise.all(uploadPromises)

            toast.success('Event created successfully')
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
                registration_type: 'free',
                price: 0,
                owner_id: '',
                auto_publish: false
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
                        <Dialog.Title className="text-xl font-bold text-gray-900">Create Event</Dialog.Title>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                required
                                placeholder="Event Title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                placeholder="Describe the event..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.start_datetime}
                                    onChange={e => setFormData({ ...formData, start_datetime: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.end_datetime}
                                    onChange={e => setFormData({ ...formData, end_datetime: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                                <select
                                    value={formData.format}
                                    onChange={e => setFormData({ ...formData, format: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="panel_discussion">Panel Discussion</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="webinar">Webinar</option>
                                    <option value="seminar">Seminar</option>
                                    <option value="club_event">Club Event</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="physical">Physical</option>
                                    <option value="online">Online</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        <div>

                            {formData.type !== 'online' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                                    <PlacesAutocomplete
                                        onPlaceSelect={(place) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                venue_place_id: place.value.place_id,
                                                venue_remark: place.label
                                            }))
                                        }}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration</label>
                                    <select
                                        value={formData.registration_type}
                                        onChange={e => setFormData({ ...formData, registration_type: e.target.value as any })}
                                        className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="free">Free</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                                {formData.registration_type === 'paid' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (MYR)</label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                            className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <UserSearchSelect
                                    label="Organizer (Transfer Ownership) - Optional"
                                    placeholder="Search user to assign as organizer..."
                                    onSelect={(user) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            owner_id: user ? user.id : ''
                                        }))
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave empty to organize yourself.</p>
                            </div>

                            <div className="flex items-center pt-2 gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={formData.auto_publish}
                                            onChange={e => setFormData({ ...formData, auto_publish: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Auto-Publish</span>
                                </label>

                                <div className="flex-1"></div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
                                >
                                    {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {isLoading ? 'Creating...' : 'Create Event'}
                                </button>
                            </div>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
