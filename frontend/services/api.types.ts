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

export interface ApiErrorResponse {
    detail: string
}

export interface PasswordResetRequest {
    email: string
}

export interface PasswordReset {
    password: string
    token: string
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

export type RoleItem = string | { id: string; name: string }

export interface UserResponse {
    id: string
    email: string
    is_verified: boolean
    status: 'active' | 'inactive' | 'frozen' | 'suspended'
    roles: RoleItem[]
    created_at: string
}

export interface VerifyEmailSuccessResponse {
    message: string
}

export interface OnboardingData {
    full_name: string
    role: 'student' | 'expert' | 'sponsor'
    bio?: string
    linkedin_url?: string
    github_url?: string
    instagram_url?: string
    twitter_url?: string
    website_url?: string
}

// Based on your profile_schema.py -> ProfileResponse
export interface EducationCreate {
    org_id?: string
    qualification?: string
    field_of_study?: string
    start_datetime?: string
    end_datetime?: string
    resume_url?: string
    remark?: string
}

export interface JobExperienceCreate {
    org_id?: string
    title: string
    description?: string
    start_datetime?: string
    end_datetime?: string
}

export interface EducationResponse {
    id: string
    user_id: string
    org_id?: string
    qualification?: string // Degree
    field_of_study?: string // Major / School
    start_datetime?: string
    end_datetime?: string
    resume_url?: string
    remark?: string
}

export interface JobExperienceResponse {
    id: string
    user_id: string
    org_id?: string
    title: string
    description?: string
    start_datetime?: string
    end_datetime?: string
}

export interface ProfileResponse {
    id: string
    user_id: string
    full_name: string
    email?: string
    bio?: string
    avatar_url?: string
    cover_url?: string
    linkedin_url?: string
    github_url?: string
    instagram_url?: string
    twitter_url?: string
    website_url?: string
    visibility: 'public' | 'private'
    tags?: { id: string; name: string }[]
    educations?: EducationResponse[]
    job_experiences?: JobExperienceResponse[]
    average_rating?: number
    reviews_count?: number
    title?: string // e.g. "Senior Engineer"
    availability?: string // e.g. "Weekdays after 6pm"
}

export interface ProfileUpdate {
    full_name?: string
    bio?: string
    linkedin_url?: string
    github_url?: string
    instagram_url?: string
    twitter_url?: string
    website_url?: string
    visibility?: 'public' | 'private'
    title?: string
    availability?: string
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
export type EventStatus = 'draft' | 'published' | 'declined' | 'ended'
export type EventRegistrationStatus = 'opened' | 'closed'
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
    registration_status?: EventRegistrationStatus
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
    | 'interviewing'

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

export interface EventParticipantResponseUpdate {
    status: Extract<EventParticipantStatus, 'accepted' | 'rejected'>
}

export interface EventParticipantRoleUpdate {
    role: EventParticipantRole
}

export interface EventCategoryAttach {
    category_ids: string[]
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

export interface EventAttendanceStats {
    event_id: string
    total_audience: number
    attended_audience: number
    absent_audience: number
    total_participants: number
    attended_total: number
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
    my_status?: EventParticipantStatus | null
    cover_url?: string | null
    venue_remark?: string | null
    format?: EventFormat | null
    description?: string | null
    participant_count?: number | null
}

export interface EventProposalCreate {
    title?: string | null
    description?: string | null
    file_url?: string | null
}

export interface EventProposalResponse {
    id: string
    event_id: string
    created_by_user_id: string
    title?: string | null
    description?: string | null
    file_url?: string | null
    created_at: string
    updated_at?: string | null
}

export interface EventProposalCommentCreate {
    content: string
}

export interface EventProposalCommentResponse {
    id: string
    proposal_id: string
    user_id: string
    content: string
    created_at: string
    updated_at?: string | null
}

export interface CategoryCreate {
    name: string
}

export interface CategoryResponse {
    id: string
    name: string
    created_at?: string
}

// --- Checklist Types ---

export interface EventChecklistItemCreate {
    title: string
    description?: string | null
    assigned_user_id?: string | null
    due_datetime?: string | null
}

export interface EventChecklistItemUpdate {
    title?: string | null
    description?: string | null
    is_completed?: boolean | null
    assigned_user_id?: string | null
    sort_order?: number | null
    due_datetime?: string | null
}

// --- Review Types ---

export interface ReviewCreate {
    event_id: string
    reviewee_id: string
    rating: number
    comment?: string | null
}

export interface ReviewResponse {
    id: string
    event_id: string
    org_id?: string | null
    reviewer_id: string
    reviewee_id: string
    rating: number
    comment?: string | null
    created_at: string
    updated_at?: string | null
}

export interface EventChecklistItemResponse {
    id: string
    event_id: string
    title: string
    description?: string | null
    is_completed: boolean
    assigned_user_id?: string | null
    sort_order: number
    due_datetime?: string | null
    created_by_user_id: string
    created_at: string
    updated_at?: string | null
}
export interface UserMeResponse {
    id: string
    email: string
    roles: string[]
    is_dashboard_pro: boolean
}

// --- Organization Types ---

export type OrganizationVisibility = 'public' | 'private'
export type OrganizationType = 'company' | 'university' | 'community' | 'nonprofit' | 'government'

export interface OrganizationResponse {
    id: string
    owner_id: string
    name: string
    logo_url?: string
    cover_url?: string
    description?: string
    type: OrganizationType
    website_url?: string
    location?: string
    visibility: OrganizationVisibility
}

// --- Audit Log Types ---

export interface AuditLog {
    id: string
    actor_user_id?: string | null
    action: string
    target_type: string
    target_id?: string | null
    details?: string | null
    created_at: string
}

export interface AuditLogListResponse {
    items: AuditLog[]
    total: number
}

export interface BroadcastNotificationRequest {
    title: string
    content: string
    target_role?: string
    target_user_id?: string
    link_url?: string
}

export interface BroadcastEmailTemplateRequest {
    template_id: string
    variables: Record<string, string>
    target_role?: string
}

export interface EmailTemplate {
    id: string
    name: string
    subject: string
    body_html: string
    variables: string[]
    created_at?: string
    updated_at?: string
}

// --- AI Proposal Types ---

export interface ProposalSuggestRequest {
    tone?: string
    length_hint?: string
    audience_level?: string
    language?: string
    sections?: string[]
    expert_id?: string
}

export interface ProposalSuggestResponse {
    title: string
    short_intro: string
    value_points: string[]
    logistics: string
    closing: string
    email_subjects: string[]
    raw_text: string
}
