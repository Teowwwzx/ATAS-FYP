// frontend/services/api.ts
import axios from 'axios'
import { isTokenExpired, logout as clientLogout } from '@/lib/auth'
import {
    AuthLogin,
    AuthRegister,
    LoginSuccessResponse,
    RegisterSuccessResponse,
    VerifyEmailSuccessResponse,
    OnboardingData,
    ProfileResponse,
    EventCreate,
    EventDetails,
    EventParticipantDetails,
    EventParticipantBulkCreate,
    AttendanceQRResponse,
    AttendanceScanRequest,
    EventReminderCreate,
    EventReminderResponse,
    MyEventItem,
    EventProposalCreate,
    EventProposalResponse,
    EventProposalCommentCreate,
    EventProposalCommentResponse,
    EventChecklistItemCreate,
    EventChecklistItemUpdate,
    EventChecklistItemResponse,
    UserMeResponse,
} from './api.types' // We'll create this types file next

// 1. Create an Axios instance
const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/v1', // Your FastAPI backend (fixed to 8000 per project rules)
    headers: {
        'Content-Type': 'application/json',
    },
})

// 2. --- Authentication Service ---

/**
 * Logs in a user.
 * Note: Uses form-data ('application/x-www-form-urlencoded')
 * as required by your backend's OAuth2PasswordRequestForm.
 */
export const login = async ({ email, password }: AuthLogin) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)

    const response = await api.post<LoginSuccessResponse>(
        '/auth/login',
        params,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        },
    )
    return response.data
}

/**
 * Registers a new user.
 * Note: Uses JSON ('application/json') as required by your
 * Pydantic 'UserCreate' schema.
 */
export const register = async ({ email, password }: AuthRegister) => {
    const response = await api.post<RegisterSuccessResponse>('/auth/register', {
        email,
        password,
    })
    return response.data
}

/**
 * Verifies a user's email using the token from the URL.
 */
export const verifyEmail = async (token: string) => {
    const response = await api.get<VerifyEmailSuccessResponse>(
        `/auth/verify/${token}`,
    )
    return response.data
}

/**
 * Sends a password reset email.
 */
export const forgotPassword = async (email: string) => {
    const response = await api.post<{ message: string }>('/email/forgot-password', { email })
    return response.data
}

/**
 * Resets the user's password using the token.
 */
export const resetPassword = async (data: import('./api.types').PasswordReset) => {
    // The backend expects 'token' as a query param and 'password' in the body
    // Based on: def reset_password(token: str, request: PasswordReset, ...)
    const response = await api.post<{ message: string }>(
        `/email/reset-password?token=${encodeURIComponent(data.token)}`,
        { password: data.password }
    )
    return response.data
}

// 4. --- Onboarding Service (New Function) ---

/**
 * Completes the user's first-time onboarding.
 * Sends the full name and selected role.
 */
export const completeOnboarding = async (data: OnboardingData) => {
    // This uses the PUT /me/onboarding endpoint you just created
    const response = await api.put<ProfileResponse>('/profiles/me/onboarding', data)
    return response.data
}

export const getMyProfile = async () => {
    const response = await api.get<ProfileResponse>('/profiles/me')
    return response.data
}

export const updateProfile = async (data: import('./api.types').ProfileUpdate) => {
    const response = await api.put<ProfileResponse>('/profiles/me', data)
    return response.data
}

export const updateAvatar = async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.put<ProfileResponse>('/profiles/me/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
    return response.data
}

export const updateCoverPicture = async (file: File) => {
    const formData = new FormData()
    formData.append('cover_picture', file)
    const response = await api.put<ProfileResponse>('/profiles/me/cover_picture', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
    return response.data
}

// 5. --- API Interceptor (Future-proofing) ---
// This code will automatically add the JWT token to *every*
// API request after the user logs in.

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('atas_token')
        if (token) {
            if (isTokenExpired(token)) {
                clientLogout()
            } else {
                config.headers['Authorization'] = `Bearer ${token}`
            }
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    },
)

// --- Events Service ---

export const createEvent = async (data: EventCreate) => {
    const response = await api.post<EventDetails>('/events', data)
    return response.data
}

export const getPublicEvents = async () => {
    const response = await api.get<EventDetails[]>('/events')
    return response.data
}

export const getEventById = async (id: string) => {
    const response = await api.get<EventDetails>(`/events/${id}`)
    return response.data
}

export const getEventParticipants = async (id: string) => {
    const response = await api.get<EventParticipantDetails[]>(`/events/${id}/participants`)
    return response.data
}

export const bulkInviteEventParticipants = async (id: string, body: EventParticipantBulkCreate) => {
    const response = await api.post<EventParticipantDetails[]>(`/events/${id}/participants/bulk`, body)
    return response.data
}

export const getMyEventHistory = async (
    roleFilter?: 'organized' | 'participant' | 'speaker' | 'sponsor',
) => {
    const url = roleFilter
        ? `/events/me/history?role_filter=${encodeURIComponent(roleFilter)}`
        : `/events/me/history`
    const response = await api.get<EventDetails[]>(url)
    return response.data
}

export const joinPublicEvent = async (eventId: string) => {
    const response = await api.post<EventParticipantDetails>(`/events/${eventId}/join`)
    return response.data
}

export const leaveEvent = async (eventId: string) => {
    const response = await api.delete<void>(`/events/${eventId}/participants/me`)
    return response.data
}

// --- Attendance Service ---

export const generateAttendanceQR = async (eventId: string) => {
    const response = await api.post<AttendanceQRResponse>(`/events/${eventId}/attendance/qr`)
    return response.data
}

export const scanAttendance = async (data: AttendanceScanRequest) => {
    const response = await api.post<EventParticipantDetails>(`/events/attendance/scan`, data)
    return response.data
}

export const getAttendanceQRPNG = async (eventId: string, minutesValid?: number) => {
    const url = minutesValid
        ? `/events/${eventId}/attendance/qr.png?minutes_valid=${encodeURIComponent(minutesValid)}`
        : `/events/${eventId}/attendance/qr.png`
    const response = await api.get<Blob>(url, { responseType: 'blob' })
    return response.data
}

// --- Reminder Service ---

export const setEventReminder = async (eventId: string, body: EventReminderCreate) => {
    const response = await api.post<EventReminderResponse>(`/events/${eventId}/reminders`, body)
    return response.data
}

export const getMyEvents = async () => {
    const response = await api.get<MyEventItem[]>(`/events/mine`)
    return response.data
}

export const getMe = async () => {
    const response = await api.get<UserMeResponse>(`/users/me`)
    return response.data
}

// --- Profiles Search ---

export const findProfiles = async (params: { email?: string; name?: string }) => {
    const response = await api.get<import('./api.types').ProfileResponse[]>(`/profiles/find`, { params })
    return response.data
}

// --- Proposals ---

export const getEventProposals = async (eventId: string) => {
    const response = await api.get<EventProposalResponse[]>(`/events/${eventId}/proposals`)
    return response.data
}

export const createEventProposal = async (eventId: string, data: EventProposalCreate) => {
    const response = await api.post<EventProposalResponse>(`/events/${eventId}/proposals`, data)
    return response.data
}

export const getEventProposalComments = async (eventId: string, proposalId: string) => {
    const response = await api.get<EventProposalCommentResponse[]>(`/events/${eventId}/proposals/${proposalId}/comments`)
    return response.data
}

export const createEventProposalComment = async (eventId: string, proposalId: string, data: EventProposalCommentCreate) => {
    const response = await api.post<EventProposalCommentResponse>(`/events/${eventId}/proposals/${proposalId}/comments`, data)
    return response.data
}

// --- Checklist ---

export const getEventChecklist = async (eventId: string) => {
    const response = await api.get<EventChecklistItemResponse[]>(`/events/${eventId}/checklist`)
    return response.data
}

export const createEventChecklistItem = async (eventId: string, data: EventChecklistItemCreate) => {
    const response = await api.post<EventChecklistItemResponse>(`/events/${eventId}/checklist`, data)
    return response.data
}

export const updateEventChecklistItem = async (eventId: string, itemId: string, data: EventChecklistItemUpdate) => {
    const response = await api.put<EventChecklistItemResponse>(`/events/${eventId}/checklist/${itemId}`, data)
    return response.data
}

export const deleteEventChecklistItem = async (eventId: string, itemId: string) => {
    const response = await api.delete<void>(`/events/${eventId}/checklist/${itemId}`)
    return response.data
}

export default api

export const logout = clientLogout
