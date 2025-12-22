'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent, pingApi } from '@/services/api'
import { FormInput } from '@/components/auth/FormInput'
import { EventCreate, EventType } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'

const libraries: ("places")[] = ["places"]

export default function CreateEventPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })

    const [formData, setFormData] = useState<EventCreate>({
        title: '',
        description: '',
        format: 'workshop',
        type: 'offline',
        start_datetime: '',
        end_datetime: '',
        registration_type: 'free',
        visibility: 'public',
        venue_remark: 'Asia Pacific University',
        venue_place_id: '',
    })

    const handleSelect = async (address: string) => {
        setFormData(prev => ({ ...prev, venue_remark: address }))
        try {
            const results = await geocodeByAddress(address)
            const placeId = results[0].place_id
            setFormData(prev => ({ ...prev, venue_place_id: placeId }))
        } catch (error) {
            console.error('Error selecting place', error)
        }
    }

    const toLocalInputValue = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0')
        const year = d.getFullYear()
        const month = pad(d.getMonth() + 1)
        const day = pad(d.getDate())
        const hours = pad(d.getHours())
        const minutes = pad(d.getMinutes())
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const minStart = toLocalInputValue(new Date())
    const minEnd = formData.start_datetime || minStart

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
                toast.error('End date must be after start date')
                setLoading(false)
                return
            }

            await pingApi()
            const newEvent = await createEvent(formData)
            toast.success('Event created successfully')
            router.push(`/events/${newEvent.id}`)
        } catch (err: any) {
            console.error(err)
            if (err.response?.status === 401) {
                localStorage.removeItem('atas_token')
                router.push('/login')
                return
            }
            if (err.response?.data?.detail) {
                toast.error(err.response.data.detail)
            } else if (err.message) {
                toast.error(err.message)
            } else {
                toast.error('Failed to create event')
            }
        }
        finally {
            setLoading(false)
        }
    }

    // Auto-matching logic
    useEffect(() => {
        if (formData.format === 'webinar') {
            setFormData(prev => ({ ...prev, type: 'online', venue_remark: 'Zoom / Google Meet' }))
        } else if (formData.format === 'panel_discussion') {
            setFormData(prev => ({ ...prev, type: 'offline' }))
            if (!formData.venue_remark) {
                setFormData(prev => ({ ...prev, venue_remark: 'Asia Pacific University' }))
            }
        }
    }, [formData.format])

    // Fix: Auto-fetch Place ID for default venue
    useEffect(() => {
        const fetchDefaultPlaceId = async () => {
            if (formData.venue_remark === 'Asia Pacific University' && !formData.venue_place_id && isLoaded) {
                try {
                    const results = await geocodeByAddress('Asia Pacific University of Technology & Innovation (APU)')
                    if (results && results[0]) {
                        setFormData(prev => ({ ...prev, venue_place_id: results[0].place_id, venue_remark: results[0].formatted_address }))
                    }
                } catch (error) {
                    console.error('Failed to fetch default place ID', error)
                }
            }
        }
        fetchDefaultPlaceId()
    }, [isLoaded, formData.venue_remark])

    return (
        <div className="max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-sm border border-yellow-100">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Create New Event</h1>
                <p className="text-zinc-500 mt-2 font-medium">Fill in the details to host your awesome event.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <FormInput
                    id="title"
                    label="Event Title"
                    placeholder="e.g. Intro to React Workshop"
                    value={formData.title}
                    onChange={handleChange}
                />

                <div>
                    <label htmlFor="description" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                        Description
                    </label>
                    <div className="mt-1">
                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                            placeholder="Describe your event..."
                            value={formData.description || ''}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="start_datetime" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Start Date & Time
                        </label>
                        <div className="mt-1">
                            <input
                                type="datetime-local"
                                name="start_datetime"
                                id="start_datetime"
                                required
                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                min={minStart}
                                value={formData.start_datetime}
                                onChange={(e) => {
                                    const v = e.target.value
                                    const clamped = v && v < minStart ? minStart : v
                                    setFormData(prev => ({ ...prev, start_datetime: clamped }))
                                    if (formData.end_datetime && clamped && formData.end_datetime < clamped) {
                                        setFormData(prev => ({ ...prev, end_datetime: clamped }))
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="end_datetime" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            End Date & Time
                        </label>
                        <div className="mt-1">
                            <input
                                type="datetime-local"
                                name="end_datetime"
                                id="end_datetime"
                                required
                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                min={minEnd}
                                value={formData.end_datetime}
                                onChange={(e) => {
                                    const v = e.target.value
                                    const minV = minEnd
                                    const clamped = v && v < minV ? minV : v
                                    setFormData(prev => ({ ...prev, end_datetime: clamped }))
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="format" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Format
                        </label>
                        <select
                            id="format"
                            name="format"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.format}
                            onChange={handleChange}
                        >
                            <option value="workshop">Workshop</option>
                            <option value="seminar">Seminar</option>
                            <option value="webinar">Webinar</option>
                            <option value="panel_discussion">Panel Discussion</option>
                            <option value="club_event">Club Event</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Type
                        </label>
                        <select
                            id="type"
                            name="type"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.type}
                            onChange={handleChange}
                        >
                            <option value="offline">Offline (Physical)</option>
                            <option value="online">Online</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="registration_type" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Registration
                        </label>
                        <select
                            id="registration_type"
                            name="registration_type"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.registration_type}
                            onChange={handleChange}
                        >
                            <option value="free">Free</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="visibility" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Visibility
                        </label>
                        <select
                            id="visibility"
                            name="visibility"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.visibility}
                            onChange={handleChange}
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                </div>

                <div className="relative z-20">
                    <label htmlFor="venue_remark" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                        Venue / Location
                    </label>
                    {isLoaded ? (
                        <PlacesAutocomplete
                            value={formData.venue_remark || ''}
                            onChange={(address) => setFormData(prev => ({ ...prev, venue_remark: address }))}
                            onSelect={handleSelect}
                        >
                            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                                <div className="relative">
                                    <input
                                        {...getInputProps({
                                            placeholder: 'Search for a location...',
                                            className: "block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                        })}
                                    />
                                    {suggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden">
                                            {loading && <div className="p-3 text-sm text-zinc-500">Loading...</div>}
                                            {suggestions.map((suggestion) => {
                                                const className = suggestion.active
                                                    ? 'px-4 py-3 bg-yellow-50 cursor-pointer'
                                                    : 'px-4 py-3 bg-white cursor-pointer hover:bg-gray-50';

                                                // Create a div wrapper to hold props and content to avoid duplicate key issues or spread issues
                                                const { key, ...optionProps } = getSuggestionItemProps(suggestion, { className });

                                                return (
                                                    <div
                                                        key={suggestion.placeId}
                                                        {...optionProps}
                                                    >
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
                        <div className="w-full px-5 py-4 bg-zinc-100 rounded-2xl text-zinc-500 font-medium">
                            Loading Maps...
                        </div>
                    )}
                </div>

                {error && (
                    <div className="rounded-2xl bg-red-50 p-4 border border-red-100">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-bold text-red-800">Error</h3>
                                <div className="mt-1 text-sm text-red-700 font-medium">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 bg-white text-zinc-900 rounded-full font-bold shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-yellow-400 text-zinc-900 rounded-full shadow-lg font-bold hover:bg-yellow-300 hover:scale-105 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Event'}
                    </button>
                </div>
            </form>
        </div>
    )
}
