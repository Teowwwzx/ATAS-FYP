'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyEvents, logout, pingApi, getEventChecklist, getMyEventHistory, runMyDueReminders, deleteEvent } from '@/services/api'
import { toast } from 'react-hot-toast'
import { isTokenExpired } from '@/lib/auth'
import { MyEventItem, EventChecklistItemResponse, EventDetails, EventType, EventFormat } from '@/services/api.types'
import { DashboardStats } from './DashboardStats'
import { EventListItem } from './EventListItem'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'upcoming' | 'archived' | 'history'>('upcoming')
    const [eventSearch, setEventSearch] = useState('')
    const [history, setHistory] = useState<EventDetails[]>([])
    const [historyRole, setHistoryRole] = useState<'organized' | 'participant' | 'speaker' | 'sponsor' | undefined>(undefined)

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [eventToDelete, setEventToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

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

    const confirmDelete = (id: string) => {
        setEventToDelete(id)
        setDeleteModalOpen(true)
    }

    const handleDelete = async () => {
        if (!eventToDelete) return
        setIsDeleting(true)
        try {
            await deleteEvent(eventToDelete)
            toast.success('Event deleted successfully')
            setEvents(events.filter(e => e.event_id !== eventToDelete))
            setDeleteModalOpen(false)
        } catch (error) {
            toast.error('Failed to delete event')
            console.error(error)
        } finally {
            setIsDeleting(false)
            setEventToDelete(null)
        }
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

    const displayedEvents = showHistory ? history : (showArchived ? archived : upcoming)

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-black leading-7 text-zinc-900 sm:text-4xl sm:truncate tracking-tight">
                        Dashboard
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500">
                        Manage your events, proposals, and schedule.
                    </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <Link
                        href="/events/create"
                        className="ml-3 inline-flex items-center px-6 py-3 border border-transparent rounded-full shadow-lg text-sm font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                    >
                        + Create New Event
                    </Link>
                </div>
            </div>

            {/* Stats */}
            {!loading && <DashboardStats events={events} />}

            {/* Toolbar */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* View Tabs */}
                <div className="flex space-x-1 bg-zinc-100 p-1 rounded-xl w-full md:w-auto">
                    {(['upcoming', 'archived', 'history'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => mode === 'history' ? loadHistory() : setViewMode(mode)}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 capitalize ${viewMode === mode ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            className="block w-full pl-10 pr-4 py-2 bg-zinc-50 border-transparent rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all duration-200 text-sm font-medium border border-zinc-200"
                            placeholder="Search events..."
                            value={eventSearch}
                            onChange={(e) => setEventSearch(e.target.value)}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`w-full md:w-auto px-4 py-2 rounded-xl font-bold border border-zinc-200 text-sm transition-all duration-200 flex items-center justify-center gap-2 ${showFilters ? 'bg-yellow-50 text-zinc-900 border-yellow-200' : 'bg-white text-zinc-600 hover:bg-zinc-50'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Filters
                        </button>

                        {/* Filter Dropdown */}
                        {showFilters && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-zinc-100 p-4 z-50">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Format</label>
                                        <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value as EventFormat)} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none">
                                            <option value="">All Formats</option>
                                            <option value="workshop">Workshop</option>
                                            <option value="seminar">Seminar</option>
                                            <option value="webinar">Webinar</option>
                                            <option value="panel_discussion">Panel Discussion</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Type</label>
                                        <select value={filterType} onChange={(e) => setFilterType(e.target.value as EventType)} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none">
                                            <option value="">All Types</option>
                                            <option value="online">Online</option>
                                            <option value="offline">Offline</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => { setFilterFormat(''); setFilterType(''); setShowFilters(false) }}
                                        className="w-full py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    <Skeleton height="80px" variant="rectangular" />
                    <Skeleton height="80px" variant="rectangular" />
                    <Skeleton height="80px" variant="rectangular" />
                </div>
            ) : displayedEvents.length === 0 ? (
                <EmptyState
                    title="No events found"
                    description={
                        viewMode === 'upcoming'
                            ? "You don't have any upcoming events scheduled. Create one to get started!"
                            : "No events match your current filters."
                    }
                    actionLabel={viewMode === 'upcoming' ? "Create Event" : undefined}
                    onAction={viewMode === 'upcoming' ? () => window.location.href = '/events/create' : undefined}
                />
            ) : (
                <div className="space-y-4">
                    {displayedEvents.map((event) => {
                        const eventId = (event as any).event_id || (event as any).id
                        return (
                            <EventListItem
                                key={eventId}
                                event={event as MyEventItem}
                                onDelete={confirmDelete}
                            />
                        )
                    })}
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Event"
                message="Are you sure you want to delete this event? This action cannot be undone."
                variant="danger"
                confirmText="Delete"
                isLoading={isDeleting}
            />
        </div>
    )
}
