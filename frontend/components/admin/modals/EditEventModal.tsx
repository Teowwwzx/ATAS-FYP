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
import api from '@/services/api'
import { UserResponse } from '@/services/api.types'

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
    const [venueSearch, setVenueSearch] = useState('')
    const [ownerSearch, setOwnerSearch] = useState('')
    const [ownerSearchResults, setOwnerSearchResults] = useState<UserResponse[]>([])
    const [selectedNewOwner, setSelectedNewOwner] = useState<UserResponse | null>(null)
    const [formData, setFormData] = useState({
        organizer_id: '',
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        venue_remark: '',
        venue_place_id: '',
        max_participant: 0,
        meeting_url: ''
    })

    useEffect(() => {
        if (isOpen && event) {
            setFormData({
                organizer_id: event.organizer_id || '',
                title: event.title || '',
                description: event.description || '',
                start_datetime: event.start_datetime ? new Date(event.start_datetime).toISOString().slice(0, 16) : '',
                end_datetime: event.end_datetime ? new Date(event.end_datetime).toISOString().slice(0, 16) : '',
                venue_remark: event.venue_remark || '',
                venue_place_id: event.venue_place_id || '',
                max_participant: event.max_participant || 0,
                meeting_url: event.meeting_url || '', // Initializing meeting_url from event data
            })
            if (event.venue_place_id && isLoaded && window.google) {
                const svc = new window.google.maps.places.PlacesService(document.createElement('div'))
                svc.getDetails({ placeId: event.venue_place_id, fields: ['name', 'formatted_address'] }, (res) => {
                    if (res) {
                        setVenueSearch(res.name && res.formatted_address ? `${res.name}, ${res.formatted_address}` : res.name || res.formatted_address || '')
                    }
                })
            } else {
                setVenueSearch('')
            }
        }
    }, [isOpen, event, isLoaded])

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
                organizer_id: formData.organizer_id, // Send updated organizer_id
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
                    await adminService.updateEventCover(event.id, files.cover)
                } catch (e) { console.error('Cover upload failed', e); toast.error('Cover upload failed') }
            }
            if (files.logo) {
                try {
                    await adminService.updateEventLogo(event.id, files.logo)
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

    const [activeTab, setActiveTab] = useState<'details' | 'location' | 'settings' | 'media'>('details')

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-0 rounded-2xl shadow-2xl z-50 w-full max-w-2xl outline-none max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                        <div>
                            <Dialog.Title className="text-xl font-bold text-gray-900">Edit Event</Dialog.Title>
                            <p className="text-xs text-gray-500 mt-1">
                                {event.type === 'online' ? 'Online Event' : 'Physical Event'} • {event.format}
                            </p>
                        </div>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('location')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'location' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {event.type === 'online' ? 'Meeting Link' : 'Venue'}
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Settings & Owner
                        </button>
                        <button
                            onClick={() => setActiveTab('media')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'media' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Media
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="edit-event-form" onSubmit={handleSubmit} className="space-y-6">
                            {activeTab === 'details' && (
                                <div className="space-y-4 animate-fadeIn">
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
                                            className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-40 resize-none"
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
                                </div>
                            )}

                            {activeTab === 'location' && (
                                <div className="space-y-4 animate-fadeIn">
                                    {event.type === 'online' ? (
                                        <div>
                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                                                <p className="text-sm text-blue-800 font-medium">This is an Online Event</p>
                                                <p className="text-xs text-blue-600 mt-1">Participants will see this link 30 minutes before the event starts.</p>
                                            </div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting URL</label>
                                            <input
                                                type="url"
                                                value={formData.meeting_url || ''}
                                                onChange={e => setFormData({ ...formData, meeting_url: e.target.value })}
                                                placeholder="https://zoom.us/..."
                                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative z-20">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Search (Google Maps)</label>
                                                {isLoaded ? (
                                                    <PlacesAutocomplete
                                                        value={venueSearch}
                                                        onChange={(address) => setVenueSearch(address)}
                                                        onSelect={async (address) => {
                                                            setVenueSearch(address)
                                                            try {
                                                                const results = await geocodeByAddress(address)
                                                                if (results && results[0]) {
                                                                    const placeId = results[0].place_id
                                                                    setFormData(prev => ({ ...prev, venue_place_id: placeId }))
                                                                    toast.success("Venue location selected")
                                                                }
                                                            } catch (error) {
                                                                console.error('Error selecting place', error)
                                                                toast.error("Failed to select location")
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
                                                        value={venueSearch}
                                                        disabled
                                                        className="w-full text-gray-900 bg-gray-100 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        placeholder="Maps loading..."
                                                    />
                                                )}
                                                {formData.venue_place_id && <div className="text-xs text-green-600 mt-1">✓ Location set (ID: {formData.venue_place_id})</div>}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Remark</label>
                                                <input
                                                    value={formData.venue_remark}
                                                    onChange={e => setFormData({ ...formData, venue_remark: e.target.value })}
                                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    placeholder="E.g. Level 2, Room 101, Gate B..."
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Participation Capacity</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                value={formData.max_participant}
                                                onChange={e => setFormData({ ...formData, max_participant: parseInt(e.target.value) })}
                                                className="w-32 text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                min={0}
                                            />
                                            <span className="text-xs text-gray-500">Set to 0 for unlimited</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Organizer (Transfer Ownership)</label>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                                                    {(selectedNewOwner?.full_name || 'C').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-sm font-bold text-gray-900 truncate">
                                                        {selectedNewOwner ? (selectedNewOwner.full_name || selectedNewOwner.email) : 'Current Organizer (No Change)'}
                                                        {selectedNewOwner && <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">New</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {selectedNewOwner ? selectedNewOwner.email : `ID: ${event.organizer_id}`}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <input
                                                    value={ownerSearch}
                                                    onChange={e => setOwnerSearch(e.target.value)}
                                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                                    placeholder="Search user by name or email..."
                                                />
                                                {ownerSearchResults.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
                                                        {ownerSearchResults.map(user => (
                                                            <div
                                                                key={user.id}
                                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                                                                onClick={() => {
                                                                    setSelectedNewOwner(user)
                                                                    setFormData(prev => ({ ...prev, organizer_id: user.id }))
                                                                    setOwnerSearch('')
                                                                    setOwnerSearchResults([])
                                                                }}
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                                                                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900">{user.full_name || 'No Name'}</div>
                                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">
                                                Warning: Transferring ownership will remove the current organizer's control over the event.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'media' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                                        <div className="flex items-start gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                            {event.cover_url && !files.cover && (
                                                <img src={event.cover_url} className="w-24 h-16 object-cover rounded-lg bg-gray-100" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleFileChange(e, 'cover')}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Logo</label>
                                        <div className="flex items-start gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                            {event.logo_url && !files.logo && (
                                                <img src={event.logo_url} className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleFileChange(e, 'logo')}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </form>
                    </div>

                    {/* Footer - Always Visible */}
                    <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center z-10">
                        <div className="text-xs text-gray-400">
                            ID: {event.id.slice(0, 8)}...
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-event-form"
                                disabled={isLoading}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving Changes...' : 'Save Updates'}
                            </button>
                        </div>
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root >
    )
}
