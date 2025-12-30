'use client'

import { useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { updateEventCover, updateEventLogo } from '@/services/api' // Using direct API for now as per EditModal pattern

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
        venue_name: '',
        max_participant: 100, // Default to 100
        type: 'offline', // Default
        format: 'conference', // Default
        visibility: 'public' // Default
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

            // Create Event
            const createdEvent = await adminService.createEvent({
                ...formData,
                start_datetime: start.toISOString(),
                end_datetime: end.toISOString(),
                registration_type: 'paid', // Defaulting for now, or maybe 'free'? Let's assume free or user can edit later
            })

            // Upload Files if any
            const uploadPromises = []
            if (files.cover) {
                uploadPromises.push(updateEventCover(createdEvent.id, files.cover)
                    .catch((e: any) => { console.error('Cover upload failed', e); toast.error('Cover upload failed'); }))
            }
            if (files.logo) {
                uploadPromises.push(updateEventLogo(createdEvent.id, files.logo)
                    .catch((e: any) => { console.error('Logo upload failed', e); toast.error('Logo upload failed'); }))
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
                venue_name: '',
                max_participant: 100,
                type: 'offline',
                format: 'conference',
                visibility: 'public'
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
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-32 resize-none"
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                            <input
                                value={formData.venue_name}
                                onChange={e => setFormData({ ...formData, venue_name: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. Grand Hall"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                <input
                                    type="number"
                                    value={formData.max_participant}
                                    onChange={e => setFormData({ ...formData, max_participant: parseInt(e.target.value) })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                                <select
                                    value={formData.visibility}
                                    onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                    <option value="unlisted">Unlisted</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={coverRef}
                                        onChange={e => handleFileChange(e, 'cover')}
                                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {files.cover && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearFile('cover')}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove file"
                                        >
                                            <Cross2Icon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={logoRef}
                                        onChange={e => handleFileChange(e, 'logo')}
                                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {files.logo && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearFile('logo')}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove file"
                                        >
                                            <Cross2Icon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                            >
                                {isLoading ? 'Creating...' : 'Create Event'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
