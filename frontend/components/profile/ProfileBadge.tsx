import React from 'react'

export type IntentType =
    | 'open_to_speak'
    | 'hiring_talent'
    | 'looking_for_sponsor'
    | 'open_to_collaborate'
    | 'seeking_mentorship'
    | 'offering_mentorship'

interface IntentConfig {
    label: string
    icon: React.ReactNode
    color: string
    bgColor: string
}

export const INTENT_CONFIG: Record<IntentType, IntentConfig> = {
    open_to_speak: {
        label: 'Speaker',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        ),
    },
    hiring_talent: {
        label: 'Hiring',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
    },
    looking_for_sponsor: {
        label: 'Seeking Sponsor',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    open_to_collaborate: {
        label: 'Collaborate',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    seeking_mentorship: {
        label: 'Seeking Mentor',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        ),
    },
    offering_mentorship: {
        label: 'Offering Mentorship',
        color: 'text-teal-700',
        bgColor: 'bg-teal-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
    },
}

interface ProfileBadgeProps {
    intent: IntentType
    position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
    size?: 'sm' | 'md'
}

export function ProfileBadge({ intent, position = 'top-right', size = 'sm' }: ProfileBadgeProps) {
    const config = INTENT_CONFIG[intent]

    const positionClasses = {
        'top-right': 'top-0 right-0',
        'bottom-right': 'bottom-0 right-0',
        'top-left': 'top-0 left-0',
        'bottom-left': 'bottom-0 left-0',
    }

    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2 py-1 text-[10px]',
    }

    return (
        <div
            className={`absolute ${positionClasses[position]} flex items-center gap-0.5 ${config.bgColor} ${config.color} rounded-full font-bold ${sizeClasses[size]} border border-white shadow-sm`}
            title={config.label}
        >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
        </div>
    )
}

interface ProfileIntentBadgesProps {
    intents: IntentType[]
    size?: 'sm' | 'md'
}

export function ProfileIntentBadges({ intents, size = 'sm' }: ProfileIntentBadgesProps) {
    if (!intents || intents.length === 0) return null

    // Display up to 2 badges, prioritizing top-right and bottom-right positions
    const positions: Array<'top-right' | 'bottom-right'> = ['top-right', 'bottom-right']

    return (
        <>
            {intents.slice(0, 2).map((intent, index) => (
                <ProfileBadge
                    key={intent}
                    intent={intent}
                    position={positions[index]}
                    size={size}
                />
            ))}
        </>
    )
}
