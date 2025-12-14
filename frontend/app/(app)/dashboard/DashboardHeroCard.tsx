'use client'

import React, { useRef, useState } from 'react'
import { EventDetails, MyEventItem } from '@/services/api.types'
import { format } from 'date-fns'
import { updateEventCover } from '@/services/api'
import { toast } from 'react-hot-toast'
import { EventPhase, canEditCoreDetails } from '@/lib/eventPhases'

interface DashboardHeroCardProps {
    event: EventDetails | MyEventItem
    onPreview?: () => void
    canEditCover?: boolean
    phase?: EventPhase // Make optional for public views
    onCoverUpdated?: () => void
    minimal?: boolean
}

export function DashboardHeroCard({ event, onPreview, canEditCover, phase = EventPhase.PRE_EVENT, onCoverUpdated, minimal = false }: DashboardHeroCardProps) {
    // Handle different ID fields between EventDetails (id) and MyEventItem (event_id)
    const eventId = 'id' in event ? event.id : event.event_id

    const allowedHosts = new Set(['res.cloudinary.com', 'ui-avatars.com', 'picsum.photos'])
    const pickCover = () => {
        const url = event.cover_url || ''
        try {
            const u = new URL(url)
            if (allowedHosts.has(u.hostname)) return url
        } catch { }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(event.title)}&background=random&size=800`
    }
    const coverUrl = pickCover()
    const fileRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        setUploading(true)
        const tid = toast.loading('Updating cover...')
        try {
            await updateEventCover(eventId, file)
            toast.success('Cover updated', { id: tid })
            onCoverUpdated && onCoverUpdated()
        } catch {
            toast.error('Failed to update cover', { id: tid })
        } finally {
            setUploading(false)
        }
    }

    if (minimal) {
        return (
            <div className="w-full">
                <div
                    onClick={onPreview}
                    className="w-full relative h-[400px] rounded-t-[2.5rem] overflow-hidden cursor-pointer"
                >
                    <img
                        src={coverUrl}
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </div>
                <div className="w-full bg-white border border-zinc-200 rounded-t-[2.5rem] mt-4">
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2">
                                <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight leading-tight">
                                    {event.title}
                                </h2>
                                <div className="flex flex-col gap-1 text-zinc-700 font-medium">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {(() => {
                                            const start = new Date(event.start_datetime)
                                            const end = new Date(event.end_datetime)
                                            const isSame = start.toDateString() === end.toDateString()
                                            return (
                                                <span>
                                                    {isSame
                                                        ? `${format(start, 'EEEE, MMMM d, yyyy')}`
                                                        : `${format(start, 'EEE, MMM d, yyyy')} - ${format(end, 'EEE, MMM d, yyyy')}`
                                                    }
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {(() => {
                                            const start = new Date(event.start_datetime)
                                            const end = new Date(event.end_datetime)
                                            const diffMs = end.getTime() - start.getTime()
                                            const diffMins = Math.floor(diffMs / 60000)
                                            const hours = Math.floor(diffMins / 60)
                                            const mins = diffMins % 60
                                            const durationStr = `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''}`.trim()
                                            return (
                                                <span>
                                                    {`${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`}
                                                    {durationStr && <span className="opacity-70 ml-2">({durationStr})</span>}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="truncate max-w-[320px]">{event.venue_remark || 'No venue set'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {event.format && (
                                    <span className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-sm font-bold border border-zinc-200 capitalize">
                                        {event.format.replace('_', ' ')}
                                    </span>
                                )}
                                <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${event.type === 'online' ? 'bg-blue-50 text-blue-700 border-blue-200' : event.type === 'offline' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}>
                                    {event.type}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            onClick={onPreview}
            className="w-full relative h-[400px] rounded-t-[2.5rem] overflow-hidden group cursor-pointer"
        >
            <img
                src={coverUrl}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
            <div className="absolute top-8 right-8 z-20 flex gap-3">
                {event.format && (
                    <span className="px-4 py-1.5 rounded-full bg-zinc-900/40 text-white text-sm font-bold backdrop-blur-md border border-white/20 shadow-lg capitalize">
                        {event.format.replace('_', ' ')}
                    </span>
                )}
                <span className={`px-4 py-1.5 rounded-full text-white text-sm font-bold backdrop-blur-md border border-white/20 shadow-lg uppercase ${event.type === 'online' ? 'bg-blue-500/60' : event.type === 'offline' ? 'bg-green-500/60' : 'bg-purple-500/60'
                    }`}>
                    {event.type}
                </span>
                {canEditCover && canEditCoreDetails(phase) && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                            className="px-3 py-1.5 bg-white/20 text-white font-bold text-sm rounded-xl hover:bg-white/30 border border-white/30"
                        >
                            {uploading ? 'Updating...' : 'Change Cover'}
                        </button>
                        <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFile} />
                    </>
                )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                <div className="space-y-4 max-w-4xl">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight truncate">
                        {event.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-6 text-zinc-200 font-medium text-lg pt-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {(() => {
                                const start = new Date(event.start_datetime)
                                const end = new Date(event.end_datetime)
                                const isSame = start.toDateString() === end.toDateString()
                                const diffMs = end.getTime() - start.getTime()
                                const diffMins = Math.floor(diffMs / 60000)
                                const hours = Math.floor(diffMins / 60)
                                const mins = diffMins % 60
                                const durationStr = `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''}`.trim()
                                return (
                                    <span>
                                        {isSame
                                            ? `${format(start, 'EEEE, MMMM d, yyyy • h:mm a')} - ${format(end, 'h:mm a')}`
                                            : `${format(start, 'EEE, MMMM d • h:mm a')} - ${format(end, 'EEE, MMMM d • h:mm a')}`
                                        }
                                        {durationStr && <span className="opacity-70 ml-2">({durationStr})</span>}
                                    </span>
                                )
                            })()}
                        </div>
                        {event.venue_remark && (
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate max-w-[250px]">{event.venue_remark}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
