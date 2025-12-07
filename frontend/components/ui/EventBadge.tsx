import React from 'react'

export type EventBadgeType = 'status' | 'type' | 'format'
export type EventBadgeVariant = 'default' | 'hero'

interface EventBadgeProps {
    type: EventBadgeType
    value: string
    variant?: EventBadgeVariant
    className?: string
}

export function EventBadge({ type, value, variant = 'default', className = '' }: EventBadgeProps) {
    // Base styles - Pill shape, uppercase, bold
    const baseStyles = "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5"

    // Dynamic styles based on type and value
    let colorStyles = "bg-zinc-100 text-zinc-500" // Default grey

    if (variant === 'hero') {
        colorStyles = "bg-zinc-900/40 text-white backdrop-blur-md border border-white/20 shadow-lg"
        if (type === 'type') {
            if (value.toLowerCase() === 'online') colorStyles = "bg-blue-500/60 text-white backdrop-blur-md border border-white/20 shadow-lg"
            else if (value.toLowerCase() === 'offline') colorStyles = "bg-green-500/60 text-white backdrop-blur-md border border-white/20 shadow-lg"
            else colorStyles = "bg-purple-500/60 text-white backdrop-blur-md border border-white/20 shadow-lg"
        }
    } else {
        if (type === 'status') {
            const status = value.toLowerCase()
            if (status === 'published') colorStyles = "bg-green-100 text-green-700"
            else if (status === 'draft') colorStyles = "bg-yellow-100 text-yellow-700"
            else if (status === 'past') colorStyles = "bg-zinc-100 text-zinc-500"
        } else if (type === 'type' || type === 'format') {
            // Keep it simple/consistent for non-hero
            colorStyles = "bg-zinc-100 text-zinc-600 border border-zinc-200"
        }
    }

    return (
        <span className={`${baseStyles} ${colorStyles} ${className}`}>
            {/* Optional Icon logic could go here if needed */}
            {value.replace('_', ' ')}
        </span>
    )
}
