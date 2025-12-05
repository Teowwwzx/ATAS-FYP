'use client'

import React from 'react'
import Image from 'next/image'
import { EventDetails } from '@/services/api.types'
import { format } from 'date-fns'

interface DashboardHeroCardProps {
    event: EventDetails
    onPreview?: () => void
}

export function DashboardHeroCard({ event, onPreview }: DashboardHeroCardProps) {
    const startDate = new Date(event.start_datetime)
    const coverUrl = event.cover_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.title)}&background=random&size=800`

    return (
        <div
            onClick={onPreview}
            className="w-full relative h-[400px] rounded-t-[2.5rem] overflow-hidden group cursor-pointer"
        >
            {/* Background Image */}
            <Image
                src={coverUrl}
                alt={event.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

            {/* Badges - Top Right */}
            {/* Badges - Top Right */}
            <div className="absolute top-8 right-8 z-20 flex gap-3">
                <span className="px-4 py-1.5 rounded-full bg-zinc-900/40 text-white text-sm font-bold backdrop-blur-md border border-white/20 shadow-lg capitalize">
                    {event.format.replace('_', ' ')}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-white text-sm font-bold backdrop-blur-md border border-white/20 shadow-lg uppercase ${event.type === 'online' ? 'bg-blue-500/60' : event.type === 'offline' ? 'bg-green-500/60' : 'bg-purple-500/60'
                    }`}>
                    {event.type}
                </span>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                <div className="space-y-4 max-w-4xl">

                    {/* Title */}
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight truncate">
                        {event.title}
                    </h2>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-6 text-zinc-200 font-medium text-lg pt-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {format(startDate, 'EEEE, MMMM d, yyyy • h:mm a')}
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
