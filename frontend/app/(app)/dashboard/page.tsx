'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyEvents, logout, pingApi, getEventChecklist, getMyEventHistory, runMyDueReminders } from '@/services/api'
import { toast } from 'react-hot-toast'
import { isTokenExpired } from '@/lib/auth'
import { MyEventItem, EventChecklistItemResponse, EventDetails, EventType, EventFormat } from '@/services/api.types'

export default function DashboardPage() {
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [loading, setLoading] = useState(true)
    const [committeeItems, setCommitteeItems] = useState<Record<string, EventChecklistItemResponse[]>>({})
    const [viewMode, setViewMode] = useState<'upcoming' | 'archived' | 'history'>('upcoming')
    const [eventSearch, setEventSearch] = useState('')
    const [history, setHistory] = useState<EventDetails[]>([])
    const [historyRole, setHistoryRole] = useState<'organized' | 'participant' | 'speaker' | 'sponsor' | undefined>(undefined)

    // Filters
    const [showFilters, setShowFilters] = useState(false)
    const [filterType, setFilterType] = useState<EventType | ''>('')
    const [filterFormat, setFilterFormat] = useState<EventFormat | ''>('')
    const [filterStartDate, setFilterStartDate] = useState('')
    const [filterEndDate, setFilterEndDate] = useState('')

    useEffect(() => {
        loadEvents()
    }, [])

    const loadEvents = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('atas_token') : null
        if (!token || isTokenExpired(token)) {
            logout()
            window.location.href = '/login'
            return
        }
        try {
            await pingApi()
            const data = await getMyEvents()
            setEvents(data)
            const committees = data.filter(d => d.my_role === 'committee')
            const items: Record<string, EventChecklistItemResponse[]> = {}
            for (const e of committees) {
                try {
                    const list = await getEventChecklist(e.event_id)
                    items[e.event_id] = list
                } catch { }
            }
            setCommitteeItems(items)
        } catch (error: any) {
            if (error?.response?.status === 401) {
                logout()
                window.location.href = '/login'
                return
            }
            if (error?.message === 'Network Error' || error?.response?.status === 0) {
                toast.error('Cannot reach server. Please try again later.')
                return
            }
            console.error('Failed to load events', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800 border border-green-200'
            case 'ended':
                return 'bg-zinc-100 text-zinc-800 border border-zinc-200'
            case 'draft':
                return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-200'
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
            </div>
        )
    }

    const isPast = (e: MyEventItem) => {
        try {
            return new Date(e.end_datetime).getTime() < Date.now() || e.status === 'ended'
        } catch {
            return false
        }
    }

    const titleMatch = (t: string) => t.toLowerCase().includes(eventSearch.toLowerCase())

    const applyFilters = (e: MyEventItem) => {
        if (filterType && e.type !== filterType) return false
        if (filterFormat && e.format !== filterFormat) return false
        if (filterStartDate && new Date(e.start_datetime) < new Date(filterStartDate)) return false
        if (filterEndDate && new Date(e.end_datetime) > new Date(filterEndDate)) return false
        return true
    }

    const upcoming = events.filter(e => !isPast(e) && titleMatch(e.title) && applyFilters(e))
    const archived = events.filter(e => isPast(e) && titleMatch(e.title) && applyFilters(e))

    const showHistory = viewMode === 'history'
    const showArchived = viewMode === 'archived'

    const loadHistory = async () => {
        setViewMode('history')
        try {
            const list = await getMyEventHistory(historyRole)
            setHistory(list)
        } catch {
            setHistory([])
        }
    }

    const runReminders = async () => {
        try {
            const res = await runMyDueReminders(50)
            const count = Array.isArray(res) ? res.length : 0
            toast.success(`Processed ${count} reminders`)
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } }
            toast.error(err?.response?.data?.detail || 'Failed to run reminders')
        }
    }

    return (
        <div>
            <div className="md:flex md:items-center md:justify-between mb-8 pt-6">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-black leading-7 text-zinc-900 sm:text-4xl sm:truncate tracking-tight">
                        My Events
                    </h2>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <Link
                        href="/events/create"
                        className="ml-3 inline-flex items-center px-6 py-3 border border-transparent rounded-full shadow-lg text-sm font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                    >
                        Create New Event
                    </Link>
                </div>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                    <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                        <svg
                            className="h-12 w-12 text-yellow-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-zinc-900">No events yet!</h3>
                    <p className="mt-1 text-zinc-500 max-w-sm mx-auto">
                        Get started by creating a new event or joining one to see them here.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <Link
                            href="/events/create"
                            className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-bold rounded-full text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200"
                        >
                            Create Event
                        </Link>
                        <Link
                            href="/events"
                            className="inline-flex items-center px-6 py-3 border-2 border-zinc-100 shadow-sm text-sm font-bold rounded-full text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-200 transition-all duration-200"
                        >
                            Browse Events
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                        <div className="flex space-x-1 bg-zinc-100 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('upcoming')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${viewMode === 'upcoming' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                Upcoming
                            </button>
                            <button
                                onClick={() => setViewMode('archived')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${viewMode === 'archived' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                Archived
                            </button>
                            <button
                                onClick={loadHistory}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${viewMode === 'history' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                History
                            </button>
                        </div>

                        {viewMode === 'history' && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select value={historyRole || ''} onChange={(e) => setHistoryRole((e.target.value || undefined) as 'organized' | 'participant' | 'speaker' | 'sponsor' | undefined)} className="px-3 py-2 border rounded-lg text-sm w-full sm:w-auto bg-white">
                                    <option value="">All Attended</option>
                                    <option value="organized">Organized</option>
                                    <option value="participant">Participant</option>
                                    <option value="speaker">Speaker</option>
                                    <option value="sponsor">Sponsor</option>
                                </select>
                                <button onClick={loadHistory} className="px-3 py-2 rounded-lg border bg-white text-sm hover:bg-zinc-50 font-medium">Apply</button>
                                <button onClick={runReminders} className="px-3 py-2 rounded-lg border bg-white text-sm hover:bg-zinc-50 font-medium whitespace-nowrap">Run Reminders</button>
                            </div>
                        )}
                    </div>

                    <div className="mb-6 flex flex-col md:flex-row gap-4 relative">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-3 bg-white border-transparent rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white shadow-sm transition-all duration-200 font-medium border border-zinc-100"
                                placeholder="Search my events by title"
                                value={eventSearch}
                                onChange={(e) => setEventSearch(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-6 py-3 rounded-2xl font-bold shadow-sm border border-zinc-100 transition-all duration-200 flex items-center gap-2 ${showFilters ? 'bg-yellow-400 text-zinc-900' : 'bg-white text-zinc-700 hover:bg-zinc-50'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Filters
                            </button>
                            {showFilters && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-100 p-5 z-50">
                                    <h4 className="font-bold text-zinc-900 mb-3">Filter Events</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-900 uppercase mb-1 block">Format</label>
                                            <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value as EventFormat)} className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none">
                                                <option value="">All Formats</option>
                                                <option value="workshop">Workshop</option>
                                                <option value="seminar">Seminar</option>
                                                <option value="webinar">Webinar</option>
                                                <option value="panel_discussion">Panel Discussion</option>
                                                <option value="club_event">Club Event</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-900 uppercase mb-1 block">Venue Type</label>
                                            <select value={filterType} onChange={(e) => setFilterType(e.target.value as EventType)} className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none">
                                                <option value="">All Types</option>
                                                <option value="online">Online</option>
                                                <option value="offline">Offline</option>
                                                <option value="hybrid">Hybrid</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-900 uppercase mb-1 block">Start Date (After)</label>
                                            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-900 uppercase mb-1 block">End Date (Before)</label>
                                            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none" />
                                        </div>
                                        <button onClick={() => { setFilterFormat(''); setFilterType(''); setFilterStartDate(''); setFilterEndDate('') }} className="w-full py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900">Reset Filters</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!showHistory ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {(showArchived ? archived : upcoming).map((event) => (
                                <Link
                                    key={event.event_id}
                                    href={`/events/${event.event_id}`}
                                    className="block group"
                                >
                                    <div className="bg-white overflow-hidden shadow-sm rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-zinc-100 group-hover:-translate-y-1 h-full flex flex-col">
                                        <div className="h-48 bg-zinc-100 relative overflow-hidden">
                                            {event.cover_url ? (
                                                <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                                                    <h3 className="text-4xl font-black text-zinc-900 opacity-10 select-none">{event.title.charAt(0)}</h3>
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${getStatusColor(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="px-6 py-6 flex-1 flex flex-col">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                    {event.type}
                                                </span>
                                                {event.format && <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">{event.format.replace('_', ' ')}</span>}
                                            </div>
                                            <h3 className="text-xl font-black text-zinc-900 truncate group-hover:text-yellow-600 transition-colors mb-2">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center text-sm text-zinc-500 mb-4">
                                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {formatDate(event.start_datetime)}
                                            </div>
                                            <div className="mt-auto pt-4 border-t border-zinc-50 flex items-center justify-between">
                                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-600">
                                                    {event.my_role || 'Participant'}
                                                </span>
                                                <span className="text-yellow-500 group-hover:translate-x-1 transition-transform">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {history.map((event) => (
                                <Link key={event.id} href={`/events/${event.id}`} className="block group">
                                    <div className="bg-white overflow-hidden shadow-sm rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-zinc-100 group-hover:-translate-y-1 h-full flex flex-col">
                                        <div className="h-48 bg-zinc-100 relative overflow-hidden">
                                            {event.cover_url ? (
                                                <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                                                    <h3 className="text-4xl font-black text-zinc-900 opacity-10 select-none">{event.title.charAt(0)}</h3>
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-zinc-100 text-zinc-800 border border-zinc-200 shadow-sm">ended</span>
                                            </div>
                                        </div>
                                        <div className="px-6 py-6 flex-1 flex flex-col">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{event.type}</span>
                                                <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">{event.format.replace('_', ' ')}</span>
                                            </div>
                                            <h3 className="text-xl font-black text-zinc-900 truncate group-hover:text-yellow-600 transition-colors mb-2">{event.title}</h3>
                                            <div className="flex items-center text-sm text-zinc-500 mb-4">
                                                {new Date(event.end_datetime).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}

            {Object.keys(committeeItems).length > 0 && (
                <div className="mt-10">
                    <h3 className="text-2xl font-black text-zinc-900 mb-4">My Committee Checklists</h3>
                    <div className="space-y-6">
                        {events.filter(e => committeeItems[e.event_id]?.length).map(e => (
                            <div key={e.event_id} className="bg-white rounded-[2rem] shadow-sm border border-zinc-100">
                                <div className="px-6 py-4 border-b">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-lg font-bold text-zinc-900">{e.title}</h4>
                                        <Link href={`/events/${e.event_id}`} className="text-yellow-600 font-bold">Open</Link>
                                    </div>
                                </div>
                                <div className="px-6 py-4">
                                    <ul className="space-y-2">
                                        {committeeItems[e.event_id].map(item => (
                                            <li key={item.id} className="flex items-center justify-between text-sm">
                                                <span>{item.title}</span>
                                                <span className={`px-2 py-1 rounded text-xs ${item.is_completed ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'}`}>{item.is_completed ? 'Done' : 'Pending'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
