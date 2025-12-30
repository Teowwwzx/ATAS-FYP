'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { EventDetails } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import PlacesAutocomplete, { geocodeByAddress } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'

const libraries: ("places")[] = ["places"]

interface EditEventModalProps {
    isOpen: boolean
    onClose: () => void
    event: EventDetails
    onSuccess: () => void
}

export function EditEventModal({ isOpen, onClose, event, onSuccess }: EditEventModalProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        venue_remark: '',
        venue_place_id: '',
        max_participant: 0
    })

    useEffect(() => {
        if (isOpen && event) {
            setFormData({
                title: event.title || '',
                description: event.description || '',
                start_datetime: event.start_datetime ? new Date(event.start_datetime).toISOString().slice(0, 16) : '',
                end_datetime: event.end_datetime ? new Date(event.end_datetime).toISOString().slice(0, 16) : '',
                venue_remark: event.venue_remark || '',
                venue_place_id: event.venue_place_id || '',
                max_participant: event.max_participant || 0
            })
        }
    }, [isOpen, event])

    const [files, setFiles] = useState<{ cover: File | null; logo: File | null }>({ cover: null, logo: null })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await adminService.updateEvent(event.id, {
                title: formData.title,
                description: formData.description,
                start_datetime: new Date(formData.start_datetime).toISOString(),
                end_datetime: new Date(formData.end_datetime).toISOString(),
                venue_remark: formData.venue_remark,
                venue_place_id: formData.venue_place_id,
                max_participant: formData.max_participant,
            })

            if (files.cover) {
                try {
                    // Check api.ts for updateEventCover - it expects (eventId, file)
                    // The file shows `adminService` does NOT have `updateEventCover` exposed explicitly in `admin.service.ts` but `api.ts` does.
                    // I should use `api` directly or add it to `admin.service.ts`.
                    // For now, I'll use the one I found in `api.ts`.
                    // Importing `updateEventCover` from `@/services/api`
                    await import('@/services/api').then(m => m.updateEventCover(event.id, files.cover!))
                } catch (e) { console.error('Cover upload failed', e); toast.error('Cover upload failed') }
            }
            if (files.logo) {
                try {
                    await import('@/services/api').then(m => m.updateEventLogo(event.id, files.logo!))
                } catch (e) { console.error('Logo upload failed', e); toast.error('Logo upload failed') }
            }
            toast.success('Event updated successfully')
            onSuccess()
            onClose()
        } catch (error) {
            toast.error('Failed to update event')
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
                        <Dialog.Title className="text-xl font-bold text-gray-900">Edit Event</Dialog.Title>
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
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-32 resize-none"
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

                        <div className="relative z-20">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                            {isLoaded ? (
                                <PlacesAutocomplete
                                    value={formData.venue_remark || ''}
                                    onChange={(address) => setFormData(prev => ({ ...prev, venue_remark: address }))}
                                    onSelect={async (address) => {
                                        // Update address immediately
                                        setFormData(prev => ({ ...prev, venue_remark: address }))
                                        try {
                                            const results = await geocodeByAddress(address)
                                            if (results && results[0]) {
                                                const placeId = results[0].place_id
                                                // We need to update formData with place_id too, but formData structure doesn't include it yet. 
                                                // I need to update the state and the submit function.
                                                // Let's assume I'll update the state definition next.
                                                // But for now, I'll cheat and cast it if needed or rely on 'venue_place_id' being separate.
                                                // Wait, I should add venue_place_id to formData in next step.
                                                // For now, let's update it in a way assuming it exists or adding it.
                                                setFormData(prev => ({ ...prev, venue_remark: address, venue_place_id: placeId }))
                                            }
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
                                                    className: "w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                })}
                                            />
                                            {suggestions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                                                    {loading && <div className="p-2 text-xs text-gray-500">Loading...</div>}
                                                    {suggestions.map((suggestion) => {
                                                        const className = suggestion.active
                                                            ? 'px-3 py-2 bg-gray-50 cursor-pointer'
                                                            : 'px-3 py-2 bg-white cursor-pointer hover:bg-gray-50';

                                                        const { key, ...optionProps } = getSuggestionItemProps(suggestion, { className });

                                                        return (
                                                            <div key={suggestion.placeId} {...optionProps}>
                                                                <div className="font-medium text-gray-900 text-sm">{suggestion.formattedSuggestion.mainText}</div>
                                                                <div className="text-xs text-gray-500">{suggestion.formattedSuggestion.secondaryText}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </PlacesAutocomplete>
                            ) : (
                                <input
                                    value={formData.venue_remark}
                                    onChange={e => setFormData({ ...formData, venue_remark: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Loading Maps..."
                                    disabled
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                            <input
                                type="number"
                                value={formData.max_participant}
                                onChange={e => setFormData({ ...formData, max_participant: parseInt(e.target.value) })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Update Cover Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleFileChange(e, 'cover')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Update Logo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleFileChange(e, 'logo')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
