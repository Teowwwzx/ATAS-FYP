import React from 'react'
import { MyEventItem, ProfileResponse } from '@/services/api.types'
import Link from 'next/link'

interface DashboardEventListProps {
    events: MyEventItem[]
    user: ProfileResponse | null
    onSelect: (event: MyEventItem) => void
    onCreate: () => void
}

export function DashboardEventList({ events, user, onSelect, onCreate }: DashboardEventListProps) {
    const organizedEvents = events.filter(e => e.my_role === 'organizer')

    const EventCard = ({ event }: { event: MyEventItem }) => (
        <div
            onClick={() => onSelect(event)}
            className="group bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-yellow-400`}></div>
            <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${event.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                        {event.status}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 uppercase">{event.type}</span>
                </div>
                <h3 className="text-lg font-black text-zinc-900 mb-1 group-hover:text-yellow-600 transition-colors line-clamp-1">{event.title}</h3>
                <p className="text-sm text-zinc-500 font-medium mb-4">
                    {new Date(event.start_datetime).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-bold text-zinc-400">
                        You are Organizing
                    </span>
                    <svg className="w-5 h-5 text-zinc-300 group-hover:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    onClick={onCreate}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {organizedEvents.map(event => (
                            <EventCard key={event.event_id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-zinc-50 rounded-2xl p-8 text-center border border-dashed border-zinc-200">
                        <p className="text-zinc-500 font-medium mb-2">No organized events yet.</p>
                        <button onClick={onCreate} className="text-yellow-600 font-bold hover:underline">Create your first event</button>
                    </div>
                )}
            </section>
        </div>
    )
}
