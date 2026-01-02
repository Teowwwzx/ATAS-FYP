"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileResponse } from '@/services/api.types'
import { BookExpertModal } from '@/components/event/BookExpertModal'
import { useUser } from '@/hooks/useUser'

interface ExpertCardGlassProps {
    expert: ProfileResponse
    variant?: 'grid' | 'spotlight'
    style?: React.CSSProperties
    className?: string
}

export function ExpertCardGlass({ expert, variant = 'grid', style, className }: ExpertCardGlassProps) {
    const router = useRouter()
    const { user } = useUser()
    const [isBookingOpen, setIsBookingOpen] = useState(false)

    const handleBookClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!user) {
            router.push('/login?redirect=/experts')
        } else {
            setIsBookingOpen(true)
        }
    }

    // Spotlight Variant (Horizontal)
    if (variant === 'spotlight') {
        return (
            <>
                <div
                    className={`spotlight-card ${className || ''}`}
                    style={style}
                    onClick={handleBookClick}
                >
                    {expert.cover_url || expert.avatar_url ? (
                        <img
                            src={expert.cover_url || expert.avatar_url}
                            className="spotlight-img"
                            alt={expert.full_name}
                        />
                    ) : (
                        <div className="spotlight-img bg-gray-800" />
                    )}

                    <div className="spotlight-overlay">
                        <div className="expert-role">{expert.title || 'Industry Expert'}</div>
                        <div className="expert-name-lg">{expert.full_name}</div>
                        <div className="expert-company">
                            <i className="fas fa-building"></i> {expert.origin_country || 'Global'}
                        </div>
                    </div>
                </div>

                <BookExpertModal
                    isOpen={isBookingOpen}
                    onClose={() => setIsBookingOpen(false)}
                    expert={expert}
                    onSuccess={() => setIsBookingOpen(false)}
                />
            </>
        )
    }

    // Grid Variant (Vertical)
    return (
        <>
            <div
                className={`expert-card-glass ${className || ''}`}
                style={style}
            >
                <div className="avatar-wrapper">
                    {expert.avatar_url ? (
                        <img
                            src={expert.avatar_url}
                            className="expert-avatar"
                            alt={expert.full_name}
                        />
                    ) : (
                        <div className="expert-avatar bg-gray-700 flex items-center justify-center text-2xl text-white font-bold">
                            {expert.full_name.charAt(0)}
                        </div>
                    )}
                    <div className="verified-badge">
                        <i className="fas fa-check"></i>
                    </div>
                </div>

                <div className="e-name">{expert.full_name}</div>
                <div className="e-role">{expert.title || 'Expert Member'}</div>

                <div className="e-tags">
                    {expert.tags && expert.tags.slice(0, 3).map(tag => (
                        <span key={tag.id} className="e-tag">{tag.name}</span>
                    ))}
                    {(!expert.tags || expert.tags.length === 0) && (
                        <span className="e-tag">Mentor</span>
                    )}
                </div>

                <button
                    onClick={handleBookClick}
                    className="btn-view"
                >
                    Book Session
                </button>
            </div>

            <BookExpertModal
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
                expert={expert}
                onSuccess={() => setIsBookingOpen(false)}
            />
        </>
    )
}
