import api from './api'
import {
    UserResponse,
    OrganizationResponse,
    OrganizationVisibility,
    OrganizationType,
    AuditLog,
    EventDetails,
    BroadcastNotificationRequest
} from './api.types'

export interface AdminStats {
    total_users: number
    total_organizations: number
    total_audit_logs: number
    pending_approvals: number
}

export const adminService = {
    // --- Stats ---
    getStats: async (): Promise<AdminStats> => {
        // Try dynamic roles; fallback to defaults if endpoint not available
        let pendingRoles: string[] = []
        try {
            const pr = await api.get<string[]>('/admin/pending-roles')
            pendingRoles = pr.data || []
        } catch {
            pendingRoles = [
                'expert_pending',
                'organizer_pending',
                'sponsor_pending',
                'committee_pending',
                'student_pending',
                'customer_support_pending',
                'content_moderator_pending'
            ]
        }

        const [users, orgs, logs, pendingCounts] = await Promise.all([
            api.get<{ total_count: number }>('/users/search/count'),
            api.get<{ total_count: number }>('/organizations/count'),
            api.get<{ total_count: number }>('/admin/audit-logs/count'),
            Promise.all(
                pendingRoles.map((role) =>
                    api.get<{ total_count: number }>('/users/search/count', { params: { role } })
                )
            )
        ])

        const pending_approvals = pendingCounts.reduce((sum, res) => sum + (res.data.total_count || 0), 0)

        return {
            total_users: users.data.total_count,
            total_organizations: orgs.data.total_count,
            total_audit_logs: logs.data.total_count,
            pending_approvals
        }
    },

    // --- Onboarding Settings ---
    getOnboardingSettings: async () => {
        const response = await api.get<{ enabled_fields: string[]; required_fields: string[] }>(
            '/profiles/onboarding/settings'
        )
        return response.data
    },
    updateOnboardingSettings: async (data: { enabled_fields: string[]; required_fields: string[] }) => {
        const response = await api.put<{ enabled_fields: string[]; required_fields: string[] }>(
            '/profiles/onboarding/settings',
            data
        )
        return response.data
    },

    // --- Users ---
    getUsers: async (params?: {
        page?: number
        page_size?: number
        email?: string
        name?: string
        status?: string
        role?: string
        is_verified?: boolean
    }) => {
        const response = await api.get<UserResponse[]>('/users', { params })
        return response.data.map(u => ({
            ...u,
            roles: Array.isArray(u.roles)
                ? u.roles.map(r => typeof r === 'string' ? r : r.name)
                : []
        }))
    },

    getUser: async (userId: string) => {
        const response = await api.get<UserResponse>(`/users/${userId}`)
        return response.data
    },

    updateUser: async (userId: string, data: {
        email?: string
        is_verified?: boolean
        status?: string
    }) => {
        const response = await api.put<UserResponse>(`/users/${userId}`, data)
        return response.data
    },

    suspendUser: async (userId: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/suspend`)
        return response.data
    },

    activateUser: async (userId: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/activate`)
        return response.data
    },

    verifyExpert: async (userId: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/expert/verify`)
        return response.data
    },

    revokeExpert: async (userId: string) => {
        const response = await api.delete<UserResponse>(`/users/${userId}/expert/verify`)
        return response.data
    },

    assignRole: async (userId: string, roleName: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/roles/${roleName}`)
        return response.data
    },

    removeRole: async (userId: string, roleName: string) => {
        const response = await api.delete<UserResponse>(`/users/${userId}/roles/${roleName}`)
        return response.data
    },

    // --- Pending Roles (Onboarding) ---
    approvePendingRoles: async (userId: string) => {
        // Backend overview: POST /api/v1/admin/users/{user_id}/roles/approve
        const response = await api.post<UserResponse>(`/admin/users/${userId}/roles/approve`)
        return response.data
    },

    rejectPendingRoles: async (userId: string) => {
        // Backend overview: POST /api/v1/admin/users/{user_id}/roles/reject
        const response = await api.post<UserResponse>(`/admin/users/${userId}/roles/reject`)
        return response.data
    },

    // --- Organizations ---
    getOrganizations: async (params?: {
        page?: number
        page_size?: number
        name?: string
        visibility?: OrganizationVisibility
        type?: OrganizationType
    }) => {
        const response = await api.get<OrganizationResponse[]>('/organizations', { params })
        return response.data
    },

    getOrganization: async (orgId: string) => {
        const response = await api.get<OrganizationResponse>(`/organizations/${orgId}`)
        return response.data
    },

    deleteOrganization: async (orgId: string) => {
        const response = await api.delete(`/organizations/${orgId}`)
        return response.data
    },

    // --- Audit Logs ---
    getAuditLogs: async (params?: {
        page?: number
        page_size?: number
        action?: string
        actor_user_id?: string
        target_type?: string
        target_id?: string
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<AuditLog[]>('/admin/audit-logs', { params })
        return response.data
    },

    // --- Events ---
    getEvents: async (params?: {
        page?: number
        page_size?: number
        q_text?: string
        status?: string
        type?: string
        organizer_id?: string
        include_all_visibility?: boolean
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<EventDetails[]>('/events', { params })
        return response.data
    },

    deleteEvent: async (eventId: string) => {
        const response = await api.delete(`/events/${eventId}`)
        return response.data
    },

    publishEvent: async (eventId: string) => {
        const response = await api.put<EventDetails>(`/events/${eventId}/publish`)
        return response.data
    },

    unpublishEvent: async (eventId: string) => {
        const response = await api.put<EventDetails>(`/events/${eventId}/unpublish`)
        return response.data
    },

    // --- Notifications ---
    broadcastNotification: async (data: BroadcastNotificationRequest) => {
        const response = await api.post<{ count: number }>('/admin/notifications/broadcast', data)
        return response.data
    },

    broadcastEmailTemplate: async (data: import('./api.types').BroadcastEmailTemplateRequest) => {
        const response = await api.post<{ count: number }>('/admin/email-templates/broadcast', data)
        return response.data
    },

    // --- Counts ---
    getUsersCount: async (params?: {
        email?: string
        name?: string
        status?: string
        role?: string
        is_verified?: boolean
    }) => {
        const response = await api.get<{ total_count: number }>('/users/search/count', { params })
        return response.data.total_count
    },

    getOrganizationsCount: async (params?: {
        name?: string
        visibility?: OrganizationVisibility
        type?: OrganizationType
    }) => {
        const response = await api.get<{ total_count: number }>('/organizations/count', { params })
        return response.data.total_count
    },

    getEventsCount: async (params?: {
        q_text?: string
        status?: string
        type?: string
        organizer_id?: string
        include_all_visibility?: boolean
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<{ total_count: number }>('/events/count', { params })
        return response.data.total_count
    },

    getAuditLogsCount: async (params?: {
        action?: string
        actor_user_id?: string
        target_type?: string
        target_id?: string
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<{ total_count: number }>('/admin/audit-logs/count', { params })
        return response.data.total_count
    },

    // --- Email Templates ---
    getEmailTemplates: async () => {
        const response = await api.get<import('./api.types').EmailTemplate[]>('/admin/email-templates')
        return response.data
    },

    createEmailTemplate: async (data: Partial<import('./api.types').EmailTemplate>) => {
        const response = await api.post<import('./api.types').EmailTemplate>('/admin/email-templates', data)
        return response.data
    },

    updateEmailTemplate: async (id: string, data: Partial<import('./api.types').EmailTemplate>) => {
        const response = await api.put<import('./api.types').EmailTemplate>(`/admin/email-templates/${id}`, data)
        return response.data
    },

    deleteEmailTemplate: async (id: string) => {
        const response = await api.delete<void>(`/admin/email-templates/${id}`)
        return response.data
    },

    testSendEmailTemplate: async (id: string, email: string, variables: Record<string, string>) => {
        const response = await api.post<void>(`/admin/email-templates/${id}/test-send`, { to_email: email, variables })
        return response.data
    },

    // --- Reviews ---
    getReviews: async (params?: {
        reviewer_email?: string
        reviewee_email?: string
        event_id?: string
        min_rating?: number
        max_rating?: number
        start_after?: string
        end_before?: string
        page?: number
        page_size?: number
    }) => {
        const response = await api.get<import('./api.types').ReviewResponse[]>(`/reviews`, { params })
        return response.data
    },

    getReviewsCount: async (params?: {
        reviewer_email?: string
        reviewee_email?: string
        event_id?: string
        min_rating?: number
        max_rating?: number
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<{ total_count: number }>(`/reviews/count`, { params })
        return response.data.total_count
    },

    deleteReview: async (reviewId: string, reason?: string) => {
        const response = await api.delete<import('./api.types').ReviewResponse>(`/reviews/${reviewId}`, { data: { reason } })
        return response.data
    }
}
