// Utility functions for formatting intent values for display

/**
 * Format intent enum value to human-readable label
 * @param intent - Backend enum value (e.g., "open_to_speaker")
 * @returns Human-readable label (e.g., "Open to Speaking")
 */
export function formatIntentLabel(intent: string): string {
    const intentLabels: Record<string, string> = {
        'open_to_speak': 'Open to Speak',
        'open_to_sponsor': 'Open to Sponsor',
        'looking_for_sponsor': 'Looking for Sponsor',
        'looking_for_speaker': 'Looking for Speaker',
        'hiring_talent': 'Hiring Talent',
        'open_to_job': 'Open to Job',
    }

    return intentLabels[intent] || intent
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Get intent icon emoji
 * @param intent - Backend enum value
 * @returns Emoji representing the intent
 */
export function getIntentIcon(intent: string): string {
    const intentIcons: Record<string, string> = {
        'open_to_speak': '🎤',
        'open_to_sponsor': '💰',
        'looking_for_sponsor': '🔍',
        'looking_for_speaker': '📢',
        'hiring_talent': '👔',
        'open_to_job': '💼',
    }

    return intentIcons[intent] || '🏷️'
}

/**
 * Get intent badge color classes
 * @param intent - Backend enum value
 * @returns Tailwind CSS classes for badge styling
 */
export function getIntentBadgeClass(intent: string): string {
    const intentColors: Record<string, string> = {
        'open_to_speak': 'bg-purple-50 text-purple-700 border-purple-200',
        'open_to_sponsor': 'bg-yellow-50 text-yellow-700 border-yellow-200',
        'looking_for_sponsor': 'bg-orange-50 text-orange-700 border-orange-200',
        'looking_for_speaker': 'bg-blue-50 text-blue-700 border-blue-200',
        'hiring_talent': 'bg-green-50 text-green-700 border-green-200',
        'open_to_job': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }

    return intentColors[intent] || 'bg-zinc-50 text-zinc-700 border-zinc-200'
}
