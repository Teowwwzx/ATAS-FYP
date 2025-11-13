// frontend/services/api.ts
import axios from 'axios'
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
} from './api.types' // We'll create this types file next

// 1. Create an Axios instance
const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1', // Your FastAPI backend (fixed to 8000 per project rules)
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

// 5. --- API Interceptor (Future-proofing) ---
// This code will automatically add the JWT token to *every*
// API request after the user logs in.

api.interceptors.request.use(
    (config) => {
        // We'll store the token in localStorage after login
        const token = localStorage.getItem('atas_token')
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
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

export default api