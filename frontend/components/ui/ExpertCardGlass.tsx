"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileResponse } from '@/services/api.types'
import { BookExpertModal } from '@/components/event/BookExpertModal'
import { useUser } from '@/hooks/useUser'
import { ProfileBadge, IntentType } from '@/components/profile/ProfileBadge'

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

    // Get primary intent for badge
    const primaryIntent = expert.intents?.[0] as IntentType | undefined

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
                <div className="avatar-wrapper" style={{ position: 'relative' }}>
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

                    {/* Intent Badge Overlay */}
                    {primaryIntent && (
                        <div style={{ position: 'absolute', bottom: '-8px', right: '-8px' }}>
                            <ProfileBadge intent={primaryIntent} size="sm" />
                        </div>
                    )}

                    {/* Verified checkmark */}
                    <div className="verified-badge">
                        <i className="fas fa-check"></i>
                    </div>
                </div>

                <div className="e-name">{expert.full_name}</div>
                <div className="e-role">{expert.title || 'Expert Member'}</div>

                <div className="e-tags">
                    {/* Show skills first, limit to 3 total */}
                    {expert.skills && expert.skills.slice(0, 3).map(skill => (
                        <span key={skill.id} className="e-tag">{skill.name}</span>
                    ))}
                    {/* If no skills, show tags (max 3) */}
                    {(!expert.skills || expert.skills.length === 0) && expert.tags && expert.tags.slice(0, 3).map(tag => (
                        <span key={tag.id} className="e-tag">{tag.name}</span>
                    ))}
                    {/* Fallback if neither exists */}
                    {(!expert.skills || expert.skills.length === 0) && (!expert.tags || expert.tags.length === 0) && (
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
