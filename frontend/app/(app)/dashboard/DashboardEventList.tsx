import React, { useState } from 'react'
import { MyEventItem, ProfileResponse, UserMeResponse } from '@/services/api.types'
import Link from 'next/link'
import { DashboardProModal } from '@/components/dashboard/DashboardProModal'
import { EventBadge } from '@/components/ui/EventBadge'
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal'

interface DashboardEventListProps {
    events: MyEventItem[]
    user: ProfileResponse | null
    me: UserMeResponse | null
    onSelect: (event: MyEventItem) => void
    onCreate: () => void
    onProUpgrade: () => void
}

export function DashboardEventList({ events, user, me, onSelect, onCreate, onProUpgrade }: DashboardEventListProps) {
    const [showProModal, setShowProModal] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const organizedEvents = events.filter(e => e.my_role === 'organizer')
    const joinedEvents = events.filter(e => e.my_role !== 'organizer' && e.my_status === 'accepted')

    const handleCreateClick = () => {
        // Check if user needs Dashboard Pro
        if (!me?.is_dashboard_pro && organizedEvents.length >= 1) {
            setShowProModal(true)
        } else {
            onCreate()
        }
    }

    const handleImageClick = (e: React.MouseEvent, url: string) => {
        e.stopPropagation()
        setPreviewImage(url)
    }

    // Helper components defined outside to avoid re-creation on render
    interface CardProps {
        event: MyEventItem
        onSelect: (event: MyEventItem) => void
        handleImageClick: (e: React.MouseEvent, url: string) => void
    }

    const CompactEventCard = ({ event, onSelect, handleImageClick }: CardProps) => (
        <div
            onClick={() => onSelect(event)}
            className="group bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
        >
            {/* Cover Image */}
            <div className="h-32 w-full bg-zinc-100 flex-shrink-0 relative overflow-hidden">
                {event.cover_url ? (
                    <img
                        src={event.cover_url}
                        alt={event.title}
                        onClick={(e) => handleImageClick(e, event.cover_url!)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-yellow-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                {/* Status Badge overlay */}
                <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                    <EventBadge type="status" value={event.status} />
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="flex gap-2 mb-2 flex-wrap">
                    <EventBadge type="type" value={event.type} className="!bg-zinc-100 !text-zinc-500 !border-0" />
                </div>

                <h3 className="text-base font-black text-zinc-900 mb-1 group-hover:text-yellow-600 transition-colors line-clamp-2">{event.title}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-3">
                    {new Date(event.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-50">
                    <span className="text-[10px] font-bold text-zinc-400">
                        {event.my_role === 'organizer' ? 'Organizing' : event.my_role || 'Participant'}
                    </span>
                    <svg className="w-4 h-4 text-zinc-300 group-hover:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
            </div>
        </div>
    )

    const CreateMoreCard = ({ onClick }: { onClick: () => void }) => (
        <div
            onClick={onClick}
            className="group bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 p-4 hover:border-yellow-400 hover:bg-yellow-50 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
        >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-zinc-400 group-hover:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <span className="text-sm font-bold text-zinc-600 group-hover:text-zinc-900">Create Event</span>
            <span className="text-xs text-zinc-400 mt-1">Add another event</span>
        </div>
    )

    const DetailedEventCard = ({ event, onSelect, handleImageClick }: CardProps) => (
        <div
            onClick={() => onSelect(event)}
            className="group bg-white rounded-2xl border border-zinc-200 p-0 shadow-lg hover:shadow-xl hover:border-yellow-400 transition-all cursor-pointer relative overflow-hidden flex flex-col md:flex-row h-72"
        >
            {/* Cover Image Half */}
            <div className="w-full md:w-2/5 h-48 md:h-full relative overflow-hidden bg-zinc-100">
                {event.cover_url ? (
                    <img
                        src={event.cover_url}
                        alt={event.title}
                        onClick={(e) => handleImageClick(e, event.cover_url!)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
                        <svg className="w-12 h-12 text-yellow-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                {/* Floating Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
                    <EventBadge type="status" value={event.status} />
                </div>
            </div>

            <div className="p-8 flex flex-col justify-center flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                    <EventBadge type="type" value={event.type} className="!bg-zinc-100 !text-zinc-500 !border-0" />
                    {event.format && (
                        <EventBadge type="format" value={event.format} className="!bg-zinc-100 !text-zinc-500 !border-0" />
                    )}
                </div>

                <h3 className="text-3xl font-black text-zinc-900 mb-2 group-hover:text-yellow-600 transition-colors line-clamp-2">
                    {event.title}
                </h3>

                <div className="flex flex-wrap gap-4 text-sm font-medium text-zinc-600 mb-6">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

                <div className="flex items-center gap-4 mt-auto">
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
            <div className="hidden md:flex items-center justify-center p-6 border-l border-zinc-50 w-24">
                <svg className="w-8 h-8 text-zinc-300 group-hover:text-yellow-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
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

            {/* Joined Events Section - "Upcoming Gigs" */}
            {joinedEvents.length > 0 && (
                <section className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 mb-2">Upcoming Gigs</h2>
                        <p className="text-sm text-zinc-500">Events you've confirmed to participate in</p>
                    </div>
                    {joinedEvents.length === 1 ? (
                        <CompactEventCard
                            event={joinedEvents[0]}
                            onSelect={onSelect}
                            handleImageClick={handleImageClick}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {joinedEvents.map(event => (
                                <CompactEventCard
                                    key={event.event_id}
                                    event={event}
                                    onSelect={onSelect}
                                    handleImageClick={handleImageClick}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Organized Section */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 mb-2">
                        {joinedEvents.length > 0 ? 'Organized Events' : 'My Events'}
                    </h2>
                    <p className="text-sm text-zinc-500">Events you created and are managing</p>
                </div>
                {organizedEvents.length > 0 ? (
                    organizedEvents.length === 1 ? (
                        // Single event: show detailed card
                        <DetailedEventCard
                            event={organizedEvents[0]}
                            onSelect={onSelect}
                            handleImageClick={handleImageClick}
                        />
                    ) : (
                        // Multiple events: show grid layout
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {organizedEvents.map(event => (
                                <CompactEventCard
                                    key={event.event_id}
                                    event={event}
                                    onSelect={onSelect}
                                    handleImageClick={handleImageClick}
                                />
                            ))}
                            {/* Dotted create more card */}
                            <CreateMoreCard onClick={handleCreateClick} />
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

            {/* Image Preview Modal */}
            <ImagePreviewModal
                isOpen={!!previewImage}
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </div>
    )
}
