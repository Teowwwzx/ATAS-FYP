// Intent display utilities
// Maps backend enum values to user-friendly display labels with styling

export interface IntentDisplay {
    label: string
    icon: string
    color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'yellow'
}

export const INTENT_DISPLAY_MAP: Record<string, IntentDisplay> = {
    // Mentorship
    'seeking_mentorship': {
        label: 'Seeking Mentorship',
        icon: '🎓',
        color: 'blue'
    },
    'offering_mentorship': {
        label: 'Offering Mentorship',
        icon: '👨‍🏫',
        color: 'purple'
    },

    // Speaking & Events
    'open_to_speak': {
        label: 'Available for Speaking',
        icon: '🎤',
        color: 'purple'
    },
    'open_to_collaborate': {
        label: 'Open to Collaborate',
        icon: '🤝',
        color: 'green'
    },

    // Business
    'hiring_talent': {
        label: 'Hiring Talents',
        icon: '💼',
        color: 'green'
    },
    'looking_for_sponsor': {
        label: 'Looking for Sponsors',
        icon: '🚀',
        color: 'orange'
    },
}

/**
 * Get display label for an intent enum value
 * @param intent - Backend enum value (e.g., 'seeking_mentorship')
 * @returns User-friendly display object or null if not found
 */
export function getIntentDisplay(intent: string): IntentDisplay | null {
    return INTENT_DISPLAY_MAP[intent] || null
}

/**
 * Get Tailwind badge classes based on intent color
 */
export function getIntentBadgeClasses(color: IntentDisplay['color']): string {
    const colorMap: Record<IntentDisplay['color'], string> = {
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
        green: 'bg-green-100 text-green-800 border-green-200',
        orange: 'bg-orange-100 text-orange-800 border-orange-200',
        pink: 'bg-pink-100 text-pink-800 border-pink-200',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    }
    return colorMap[color] || colorMap.blue
}
