'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPublicEvents } from '@/services/api'
import { EventDetails } from '@/services/api.types'

export default function EventsPage() {
    const [events, setEvents] = useState<EventDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadEvents()
    }, [])

    const loadEvents = async () => {
        try {
            setError(null)
            const data = await getPublicEvents()
            setEvents(data)
        } catch (err: unknown) {
            console.error('Failed to load events', err)
            setError('Failed to load events. Please try again later.')
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = events
        .filter((event) => event.registration_status === 'opened')
        .filter((event) => event.title.toLowerCase().includes(searchTerm.toLowerCase()))

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        })
    }

    return (
        <div>
            <div className="mb-10 text-center sm:text-left">
                <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-3">Explore Events</h1>
                <p className="text-lg text-zinc-600 max-w-2xl">
                    Discover workshops, seminars, and club events happening around you. Join the fun!
                </p>
            </div>

            {/* Search and Filter */}
            <div className="mb-10">
                <div className="relative max-w-xl">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                            className="h-5 w-5 text-zinc-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-4 bg-white border-transparent rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white shadow-sm transition-all duration-200 font-medium"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-50 rounded-[2.5rem] shadow-sm border border-red-100">
                    <p className="text-red-600 text-xl font-bold">{error}</p>
                    <button
                        onClick={() => loadEvents()}
                        className="mt-4 px-6 py-2 bg-white border border-red-200 text-red-600 rounded-full font-bold hover:bg-red-50 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                    <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <p className="text-zinc-900 text-xl font-bold">No events found matching your search.</p>
                    <p className="text-zinc-500 mt-2">Try adjusting your search terms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEvents.map((event) => (
                        <Link key={event.id} href={`/events/${event.id}`} className="group">
                            <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 border border-zinc-100 group-hover:-translate-y-2">
                                <div className="h-56 bg-zinc-100 relative overflow-hidden">
                                    {event.cover_url ? (
                                        <img
                                            src={event.cover_url}
                                            alt={event.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                                            <span className="text-zinc-900 text-6xl font-black opacity-20 select-none">
                                                {event.title.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-900 shadow-sm uppercase tracking-wide">
                                        {event.format.replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="flex-1 p-8 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full uppercase tracking-wide">
                                                {event.type}
                                            </span>
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                {event.registration_type}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-zinc-900 group-hover:text-yellow-500 transition-colors mb-3 leading-tight">
                                            {event.title}
                                        </h3>
                                        <p className="text-zinc-500 text-sm line-clamp-3 font-medium leading-relaxed">
                                            {event.description || 'No description provided.'}
                                        </p>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-zinc-50 flex items-center text-sm font-bold text-zinc-600">
                                        <svg
                                            className="flex-shrink-0 mr-2 h-5 w-5 text-yellow-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        {formatDate(event.start_datetime)}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
