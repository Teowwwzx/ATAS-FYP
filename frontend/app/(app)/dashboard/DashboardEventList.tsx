import React from 'react'
import { MyEventItem, ProfileResponse, UserMeResponse } from '@/services/api.types'
import Link from 'next/link'
import { DashboardProModal } from '@/components/dashboard/DashboardProModal'

interface DashboardEventListProps {
    events: MyEventItem[]
    user: ProfileResponse | null
    me: UserMeResponse | null
    onSelect: (event: MyEventItem) => void
    onCreate: () => void
    onProUpgrade: () => void
}

export function DashboardEventList({ events, user, me, onSelect, onCreate, onProUpgrade }: DashboardEventListProps) {
    const [showProModal, setShowProModal] = React.useState(false)
    const organizedEvents = events.filter(e => e.my_role === 'organizer')

    const handleCreateClick = () => {
        // Check if user needs Dashboard Pro
        if (!me?.is_dashboard_pro && organizedEvents.length >= 1) {
            setShowProModal(true)
        } else {
            onCreate()
        }
    }

    // Compact card for grid view (2+ events)
    const CompactEventCard = ({ event }: { event: MyEventItem }) => (
        <div
            onClick={() => onSelect(event)}
            className="group bg-white rounded-xl border border-zinc-200 p-4 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-1 h-full bg-yellow-400`}></div>
            <div className="pl-2">
                <div className="flex justify-between items-start mb-1.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${event.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                        {event.status}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{event.type}</span>
                </div>
                <h3 className="text-base font-black text-zinc-900 mb-1 group-hover:text-yellow-600 transition-colors line-clamp-1">{event.title}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-3">
                    {new Date(event.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold text-zinc-400">
                        Organizing
                    </span>
                    <svg className="w-4 h-4 text-zinc-300 group-hover:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
            </div>
        </div>
    )

    // Dotted "Create More" hint card
    const CreateMoreCard = () => (
        <div
            onClick={handleCreateClick}
            className="group bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-300 p-4 hover:border-yellow-400 hover:bg-yellow-50 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
        >
            <svg className="w-8 h-8 text-zinc-400 group-hover:text-yellow-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-bold text-zinc-600 group-hover:text-zinc-900">Create Event</span>
            <span className="text-xs text-zinc-400 mt-1">Add another event</span>
        </div>
    )

    // Full-width detailed card for single event view
    const DetailedEventCard = ({ event }: { event: MyEventItem }) => (
        <div
            onClick={() => onSelect(event)}
            className="group bg-white rounded-[2.5rem] border-2 border-zinc-200 p-8 shadow-lg hover:shadow-xl hover:border-yellow-400 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-2 h-full bg-yellow-400`}></div>
            <div className="pl-6 flex flex-col md:flex-row gap-6">
                {/* Left: Event Details */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${event.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                            }`}>
                            {event.status}
                        </span>
                        <span className="text-sm font-bold text-zinc-400 uppercase">{event.type}</span>
                        <span className="text-sm font-bold text-zinc-400 uppercase">• {event.format}</span>
                    </div>

                    <h3 className="text-3xl font-black text-zinc-900 group-hover:text-yellow-600 transition-colors">
                        {event.title}
                    </h3>

                    <div className="flex flex-wrap gap-4 text-sm font-medium text-zinc-600">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(event.start_datetime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(event.start_datetime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {event.description && (
                        <p className="text-zinc-600 font-medium line-clamp-2">
                            {event.description}
                        </p>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-sm font-bold text-zinc-700">{event.participant_count || 0} Participants</span>
                        </div>
                        <div className="text-sm font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                            You are Organizing
                        </div>
                    </div>
                </div>

                {/* Right: Action Arrow */}
                <div className="flex items-center justify-center md:justify-end">
                    <svg className="w-12 h-12 text-zinc-300 group-hover:text-yellow-500 group-hover:translate-x-2 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
            </div>
        </div>
    )

    return (
        <div className="w-full max-w-6xl mx-auto space-y-12 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">
                        My Events
                    </h1>
                    <p className="text-zinc-500 font-medium">
                        Manage your organized events.
                    </p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="px-6 py-2.5 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Event
                </button>
            </div>

            {/* Organized Section */}
            <section className="space-y-6">
                {organizedEvents.length > 0 ? (
                    organizedEvents.length === 1 ? (
                        // Single event: show detailed card
                        <DetailedEventCard event={organizedEvents[0]} />
                    ) : (
                        // Multiple events: show grid layout
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {organizedEvents.map(event => (
                                <CompactEventCard key={event.event_id} event={event} />
                            ))}
                            {/* Dotted create more card */}
                            <CreateMoreCard />
                        </div>
                    )
                ) : (
                    <div className="bg-zinc-50 rounded-2xl p-8 text-center border border-dashed border-zinc-200">
                        <p className="text-zinc-500 font-medium mb-2">No organized events yet.</p>
                        <button onClick={onCreate} className="text-yellow-600 font-bold hover:underline">Create your first event</button>
                    </div>
                )}
            </section>

            {/* Dashboard Pro Modal */}
            <DashboardProModal
                isOpen={showProModal}
                onClose={() => setShowProModal(false)}
                onSuccess={() => {
                    setShowProModal(false)
                    onProUpgrade()
                }}
            />
        </div>
    )
}
