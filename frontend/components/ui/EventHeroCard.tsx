import { EventDetails } from '@/services/api.types'
import { format } from 'date-fns'
import { useState } from 'react'
import { ImagePreviewModal } from './ImagePreviewModal'

interface EventHeroCardProps {
    event: EventDetails
    enableImagePreview?: boolean
}

export function EventHeroCard({ event, enableImagePreview = false }: EventHeroCardProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const startDate = new Date(event.start_datetime)

    return (
        <>
            <div
                className={`relative w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden shadow-2xl group ${enableImagePreview ? 'cursor-pointer' : ''}`}
                onClick={() => enableImagePreview && event.cover_url && setPreviewImage(event.cover_url)}
            >
                {/* Background Image */}
                <img
                    src={event.cover_url || '/placeholder-event.jpg'}
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 space-y-4">
                    {/* Badge */}
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-yellow-400/20">
                            {event.format}
                        </span>
                        {event.category && (
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/30">
                                {event.category.name}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight truncate">
                        {event.title}
                    </h2>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-6 text-zinc-200 font-medium text-lg pt-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

            {enableImagePreview && (
                <ImagePreviewModal
                    isOpen={!!previewImage}
                    imageUrl={previewImage}
                    onClose={() => setPreviewImage(null)}
                />
            )}
        </>
    )
}
