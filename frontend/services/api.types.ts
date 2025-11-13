// frontend/services/api.types.ts

// --- Auth Schemas ---

export interface AuthLogin {
    email: string
    password: string
}

export interface AuthRegister {
    email: string
    password: string
}

// --- Auth Responses ---

export interface LoginSuccessResponse {
    access_token: string
    token_type: 'bearer'
}

// Based on your user_schema.py -> UserResponse
export interface RegisterSuccessResponse {
    id: string // uuid
    email: string
    is_verified: boolean
    status: 'active' | 'inactive' | 'frozen' | 'suspended'
}

export interface VerifyEmailSuccessResponse {
    message: string
}

export interface OnboardingData {
    full_name: string
    role: 'student' | 'expert' // Based on your onboarding Q&A
}

// Based on your profile_schema.py -> ProfileResponse
export interface ProfileResponse {
    id: string
    user_id: string
    full_name: string
    bio?: string
    avatar_url?: string
    cover_url?: string
    linkedin_url?: string
    github_url?: string
    instagram_url?: string
    twitter_url?: string
    website_url?: string
    visibility: 'public' | 'private'
}

// --- Generic Error Response ---
// This is what FastAPI returns for HTTPExceptions
export interface ApiErrorResponse {
    detail: string
}

// --- Event Types ---

export type EventFormat =
    | 'panel_discussion'
    | 'workshop'
    | 'webinar'
    | 'seminar'
    | 'club_event'
    | 'other'

export type EventType = 'online' | 'offline' | 'hybrid'
export type EventRegistrationType = 'free' | 'paid'
export type EventStatus = 'draft' | 'opened' | 'closed' | 'declined' | 'completed'
export type EventVisibility = 'public' | 'private'

export interface EventCreate {
    title: string
    description?: string
    logo_url?: string
    cover_url?: string
    format: EventFormat
    type: EventType
    start_datetime: string // ISO string
    end_datetime: string // ISO string
    registration_type: EventRegistrationType
    visibility: EventVisibility
    max_participant?: number | null
    venue_place_id?: string | null
    venue_remark?: string | null
    remark?: string | null
}

export interface EventDetails extends EventCreate {
    id: string
    organizer_id: string
    status: EventStatus
    created_at: string
    updated_at?: string | null
}

// --- Participant Types ---

export type EventParticipantRole =
    | 'organizer'
    | 'committee'
    | 'speaker'
    | 'sponsor'
    | 'audience'
    | 'student'
    | 'teacher'

export type EventParticipantStatus =
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'attended'
    | 'absent'

export interface EventParticipantDetails {
    id: string
    event_id: string
    user_id: string
    role: EventParticipantRole
    description?: string | null
    join_method?: string | null
    status: EventParticipantStatus
    created_at: string
    updated_at?: string | null
}

export interface EventParticipantCreate {
    user_id: string
    role: EventParticipantRole
    description?: string | null
}

export interface EventParticipantBulkCreate {
    items: EventParticipantCreate[]
}

// --- Attendance Types ---

export interface AttendanceQRResponse {
    token: string
    expires_at: string // ISO string
}

export interface AttendanceScanRequest {
    token: string
    email?: string // If not signed in, provide the registration email
    walk_in?: boolean // If physical event and not pre-joined, mark as walk-in attendance
}

// --- Reminder Types ---

export type EventReminderOption = 'one_week' | 'three_days' | 'one_day'

export interface EventReminderCreate {
    option: EventReminderOption
}

export interface EventReminderResponse {
    id: string
    event_id: string
    user_id: string
    option: EventReminderOption
    remind_at: string
    is_sent: boolean
    sent_at?: string | null
}

// --- My Events (Dashboard) ---

export interface MyEventItem {
    event_id: string
    title: string
    start_datetime: string
    end_datetime: string
    type: EventType
    status: EventStatus
    my_role?: EventParticipantRole | null
}