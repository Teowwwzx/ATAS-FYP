'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { getPublicEvents, getPublicOrganizations, findProfiles, getMyEvents } from '@/services/api'
import { EventDetails, OrganizationResponse, ProfileResponse, EventType, EventRegistrationType, EventRegistrationStatus, MyEventItem } from '@/services/api.types'
import { toast } from 'react-hot-toast'
// @ts-ignore
import { debounce } from 'lodash'
import { EventCard } from '@/components/ui/EventCard'

export default function DiscoverPage() {
    const [activeTab, setActiveTab] = useState<'events' | 'organizations' | 'people'>('events')

    // Events State
    const [events, setEvents] = useState<EventDetails[]>([])
    const [myEvents, setMyEvents] = useState<MyEventItem[]>([])
    const [eventsLoading, setEventsLoading] = useState(true)
    const [eventSearch, setEventSearch] = useState('')
    const [eventError, setEventError] = useState<string | null>(null)

    // Event Categories State
    const [incomingEvents, setIncomingEvents] = useState<EventDetails[]>([])
    const [fintechEvents, setFintechEvents] = useState<EventDetails[]>([])
    const [aiEvents, setAiEvents] = useState<EventDetails[]>([])
    const [careerEvents, setCareerEvents] = useState<EventDetails[]>([])

    // Event Filters State
    const [eventFiltersOpen, setEventFiltersOpen] = useState(false)
    const [filterRegType, setFilterRegType] = useState<EventRegistrationType | ''>('')
    const [filterRegStatus, setFilterRegStatus] = useState<EventRegistrationStatus | ''>('')
    const [filterEventType, setFilterEventType] = useState<EventType | ''>('')

    // Organizations State
    const [orgs, setOrgs] = useState<OrganizationResponse[]>([])
    const [orgsLoading, setOrgsLoading] = useState(true)
    const [orgSearch, setOrgSearch] = useState('')

    // People State
    const [people, setPeople] = useState<ProfileResponse[]>([])
    const [peopleLoading, setPeopleLoading] = useState(false)
    const [peopleSearch, setPeopleSearch] = useState('')
    const [peopleRole, setPeopleRole] = useState('')
    const [peopleSkill, setPeopleSkill] = useState('')
    const [peopleFiltersOpen, setPeopleFiltersOpen] = useState(false)
    const [debouncedPeopleSearch, setDebouncedPeopleSearch] = useState('')
    const [debouncedEventSearch, setDebouncedEventSearch] = useState('')

    const incomingRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        loadAllEventSections()
        loadOrgs()
    }, [])

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedEventSearch(eventSearch)
        }, 500)
        return () => clearTimeout(handler)
    }, [eventSearch])

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedPeopleSearch(peopleSearch)
        }, 500)
        return () => clearTimeout(handler)
    }, [peopleSearch])

    useEffect(() => {
        if (activeTab === 'events' && (debouncedEventSearch || filterRegType || filterRegStatus || filterEventType)) {
            loadFilteredEvents()
        }
    }, [debouncedEventSearch, filterRegType, filterRegStatus, filterEventType, activeTab])

    useEffect(() => {
        if (activeTab === 'people') {
            loadPeople()
        }
    }, [activeTab, debouncedPeopleSearch, peopleRole, peopleSkill])


    const loadAllEventSections = async () => {
        try {
            setEventsLoading(true)
            const [incoming, fintech, ai, career, myData] = await Promise.all([
                getPublicEvents({ upcoming: true }),
                getPublicEvents({ category_name: 'Fintech' }),
                getPublicEvents({ category_name: 'AI' }),
                getPublicEvents({ category_name: 'Future Career' }),
                getMyEvents().catch(() => []) // Silently fail if not logged in
            ])
            setIncomingEvents(incoming)
            setFintechEvents(fintech)
            setAiEvents(ai)
            setCareerEvents(career)

            // Filter for events joined (not organized)
            const joinedEvents = myData.filter(e => e.my_role !== 'organizer')
            setMyEvents(joinedEvents)

            // Also load initial "all" events
            loadFilteredEvents()
        } catch (err) {
            console.error('Failed to load event sections', err)
        } finally {
            setEventsLoading(false)
        }
    }

    const loadFilteredEvents = async () => {
        try {
            setEventsLoading(true)
            setEventError(null)
            const data = await getPublicEvents({
                q_text: debouncedEventSearch,
                registration_type: filterRegType || undefined,
                registration_status: filterRegStatus || undefined,
                type: filterEventType || undefined,
            })
            setEvents(data)
        } catch (err) {
            console.error('Failed to load events', err)
            setEventError('Failed to load events')
        } finally {
            setEventsLoading(false)
        }
    }

    const loadOrgs = async () => {
        try {
            const data = await getPublicOrganizations()
            setOrgs(data)
        } catch (err: any) {
            console.error(err)
            toast.error(err?.response?.data?.detail || 'Failed to load organizations')
        } finally {
            setOrgsLoading(false)
        }
    }

    const loadPeople = async () => {
        try {
            setPeopleLoading(true)
            // Just reusing findProfiles logic
            const profiles = await findProfiles({ name: debouncedPeopleSearch })
            // Client side filter for Role/Skill if API doesn't support
            let filtered = profiles
            if (peopleRole) {
                // This is approximate as we don't have role field on profile response explicitly mapped sometimes
                // But let's assume implementation details or skip complex filtering for now
            }
            setPeople(filtered)
        } catch (err) {
            console.error(err)
        } finally {
            setPeopleLoading(false)
        }
    }

    const filteredOrgs = orgs.filter(o => o.name.toLowerCase().includes(orgSearch.toLowerCase()))


    return (
        <div>
            <div className="mb-10 text-center sm:text-left">
                <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-3">Discover</h1>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 mb-8 border-b border-zinc-100 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('events')}
                    className={`pb-4 text-lg font-bold transition-colors relative whitespace-nowrap ${activeTab === 'events' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    Events
                    {activeTab === 'events' && (
                        <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('organizations')}
                    className={`pb-4 text-lg font-bold transition-colors relative whitespace-nowrap ${activeTab === 'organizations' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    Organizations
                    {activeTab === 'organizations' && (
                        <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('people')}
                    className={`pb-4 text-lg font-bold transition-colors relative whitespace-nowrap ${activeTab === 'people' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    People
                    {activeTab === 'people' && (
                        <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full"></span>
                    )}
                </button>
            </div>

            {activeTab === 'events' && (
                <div className="animate-fadeIn space-y-12">
                    {/* Search & Filter */}
                    <div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-11 pr-4 py-4 bg-white border-transparent rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white shadow-sm transition-all duration-200 font-medium"
                                    placeholder="Search events..."
                                    value={eventSearch}
                                    onChange={(e) => setEventSearch(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setEventFiltersOpen(!eventFiltersOpen)}
                                className={`px-6 py-4 rounded-2xl font-bold shadow-sm border border-zinc-100 transition-all duration-200 flex items-center gap-2 ${eventFiltersOpen ? 'bg-yellow-400 text-zinc-900' : 'bg-white text-zinc-700 hover:bg-zinc-50'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Filters
                            </button>
                        </div>

                        {eventFiltersOpen && (
                            <div className="mt-4 p-6 bg-white rounded-3xl shadow-sm border border-zinc-100 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-900 uppercase mb-2 block">Registration Status</label>
                                        <select
                                            value={filterRegStatus}
                                            onChange={(e) => setFilterRegStatus(e.target.value as EventRegistrationStatus)}
                                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">All Status</option>
                                            <option value="opened">Open to Register</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-900 uppercase mb-2 block">Cost</label>
                                        <select
                                            value={filterRegType}
                                            onChange={(e) => setFilterRegType(e.target.value as EventRegistrationType)}
                                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">Any Cost</option>
                                            <option value="free">Free</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-900 uppercase mb-2 block">Venue Type</label>
                                        <select
                                            value={filterEventType}
                                            onChange={(e) => setFilterEventType(e.target.value as EventType)}
                                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">All Types</option>
                                            <option value="online">Online</option>
                                            <option value="offline">Physical</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => { setFilterRegStatus(''); setFilterRegType(''); setFilterEventType('') }}
                                        className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Only show categories if NOT searching/filtering */}
                    {!eventSearch && !filterRegStatus && !filterRegType && !filterEventType && (
                        <>
                            {/* YOUR SCHEDULE - JOINED EVENTS */}
                            {myEvents.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-black text-zinc-900">Your Schedule</h2>
                                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full uppercase tracking-wider">
                                                Attending
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                        {myEvents.map((event) => {
                                            // Map MyEventItem to EventDetails-ish structure for EventCard
                                            const mappedEvent: any = {
                                                ...event,
                                                id: event.event_id,
                                                organizer_id: '', // Not available in MyEventItem
                                                created_at: '',
                                                registration_type: 'free', // Default or fetch if needed
                                                visibility: 'public',
                                                format: event.format || 'other'
                                            }
                                            return (
                                                <div key={event.event_id} className="snap-center shrink-0 w-[85vw] sm:w-[320px]">
                                                    {/* Use standardized EventCard */}
                                                    <EventCard event={mappedEvent} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Incoming Events Carousel */}
                            {incomingEvents.length > 0 && (
                                <div className="relative group">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-black text-zinc-900">Incoming Events</h2>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    incomingRef.current?.scrollBy({ left: -320, behavior: 'smooth' })
                                                }}
                                                className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-200 transition-colors shadow-sm"
                                            >
                                                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    incomingRef.current?.scrollBy({ left: 320, behavior: 'smooth' })
                                                }}
                                                className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-200 transition-colors shadow-sm"
                                            >
                                                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        ref={incomingRef}
                                        className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                                    >
                                        {incomingEvents.map((event) => (
                                            <div key={event.id} className="snap-center shrink-0 w-[85vw] sm:w-[320px]">
                                                <EventCard event={event} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Categories */}
                            {[
                                { title: 'IT in Fintech', data: fintechEvents },
                                { title: 'AI', data: aiEvents },
                                { title: 'Future Career', data: careerEvents }
                            ].map((cat) => cat.data.length > 0 && (
                                <div key={cat.title}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-black text-zinc-900">{cat.title}</h2>
                                        <button
                                            onClick={() => {
                                                setEventSearch(cat.title)
                                                window.scrollTo({ top: 0, behavior: 'smooth' })
                                            }}
                                            className="text-sm font-bold text-yellow-600 hover:text-yellow-700"
                                        >
                                            See More
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {cat.data.slice(0, 4).map((event) => (
                                            <EventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* All Events Grid */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-zinc-900">
                                {eventSearch || filterRegStatus || filterRegType || filterEventType ? 'Search Results' : 'All Events'}
                            </h2>
                        </div>

                        {eventsLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                                <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                                    <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className="text-zinc-900 text-xl font-bold">No events found matching your search.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                {events.map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'organizations' && (
                <div className="animate-fadeIn">
                    <div className="mb-10">
                        <div className="relative max-w-xl">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-4 bg-white border-transparent rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white shadow-sm transition-all duration-200 font-medium"
                                placeholder="Search organizations..."
                                value={orgSearch}
                                onChange={(e) => setOrgSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {orgsLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                        </div>
                    ) : filteredOrgs.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                            <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                                <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <p className="text-zinc-900 text-xl font-bold">No organizations found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredOrgs.map((org) => (
                                <Link key={org.id} href={`/main/organizations/${org.id}`} className="block group">
                                    <div className="bg-white overflow-hidden shadow-sm rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-zinc-100 group-hover:-translate-y-1">
                                        <div className="h-3 bg-yellow-400"></div>
                                        <div className="px-6 py-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                {org.logo_url ? (
                                                    <img src={org.logo_url} alt="logo" className="h-10 w-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">
                                                        {org.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-black text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">{org.name}</h3>
                                                    {org.type && <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{org.type}</span>}
                                                </div>
                                            </div>
                                            {org.description && (
                                                <p className="text-sm text-zinc-700 line-clamp-3">{org.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'people' && (
                <div className="animate-fadeIn">
                    <div className="mb-10">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-11 pr-4 py-4 bg-white border-transparent rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white shadow-sm transition-all duration-200 font-medium"
                                    placeholder="Search people by name..."
                                    value={peopleSearch}
                                    onChange={(e) => setPeopleSearch(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setPeopleFiltersOpen(!peopleFiltersOpen)}
                                className={`px-6 py-4 rounded-2xl font-bold shadow-sm border border-zinc-100 transition-all duration-200 flex items-center gap-2 ${peopleFiltersOpen ? 'bg-yellow-400 text-zinc-900' : 'bg-white text-zinc-700 hover:bg-zinc-50'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Filters
                            </button>
                        </div>

                        {peopleFiltersOpen && (
                            <div className="mt-4 p-6 bg-white rounded-3xl shadow-sm border border-zinc-100 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-900 uppercase mb-2 block">Role</label>
                                        <select
                                            value={peopleRole}
                                            onChange={(e) => setPeopleRole(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">All Roles</option>
                                            <option value="expert">Expert</option>
                                            <option value="student">Student</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-900 uppercase mb-2 block">Skill / Specialism</label>
                                        <input
                                            type="text"
                                            value={peopleSkill}
                                            onChange={(e) => setPeopleSkill(e.target.value)}
                                            placeholder="e.g. Python, Design, Marketing"
                                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => { setPeopleRole(''); setPeopleSkill('') }}
                                        className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {peopleLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                        </div>
                    ) : people.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                            <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                                <svg className="h-10 w-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="text-zinc-900 text-xl font-bold">No people found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {people.map((profile) => (
                                <Link key={profile.id} href={`/main/profile/${profile.user_id}`} className="block group">
                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-zinc-100 group-hover:-translate-y-1 flex items-center gap-4">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover ring-4 ring-yellow-50 group-hover:ring-yellow-100 transition-all" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-xl ring-4 ring-yellow-50 group-hover:ring-yellow-100 transition-all">
                                                {profile.full_name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-black text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">{profile.full_name}</h3>
                                            {profile.bio && (
                                                <p className="text-sm text-zinc-500 truncate">{profile.bio}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
