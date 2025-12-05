import api from './api'
import {
    UserResponse,
    OrganizationResponse,
    OrganizationVisibility,
    OrganizationType,
    AuditLog,
    EventDetails,
    BroadcastNotificationRequest,
    EmailTemplate,
    EmailTemplateCreate,
    EmailTemplateUpdate
} from './api.types'

export interface AdminStats {
    total_users: number
    total_organizations: number
    total_audit_logs: number
}

export const adminService = {
    // --- Stats ---
    getStats: async (): Promise<AdminStats> => {
        const [users, orgs, logs] = await Promise.all([
            api.get<{ total_count: number }>('/users/search/count'),
            api.get<{ total_count: number }>('/organizations/count'),
            api.get<{ total_count: number }>('/admin/audit-logs/count')
        ])
        return {
            total_users: users.data.total_count,
            total_organizations: orgs.data.total_count,
            total_audit_logs: logs.data.total_count
        }
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
        try {
            const response = await api.get<EmailTemplate[]>('/admin/email-templates')
            return response.data
        } catch {
            const load = () => {
                try {
                    if (typeof window === 'undefined') return []
                    const raw = localStorage.getItem('atas_admin_email_templates')
                    return raw ? (JSON.parse(raw) as EmailTemplate[]) : []
                } catch { return [] }
            }
            const save = (items: EmailTemplate[]) => {
                try {
                    if (typeof window === 'undefined') return
                    localStorage.setItem('atas_admin_email_templates', JSON.stringify(items))
                } catch { }
            }
            let items = load()
            if (items.length === 0) {
                const mkId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
                items = [
                    {
                        id: mkId(),
                        name: 'email_verification',
                        subject: 'Verify your email',
                        body_html: '<p>Hello {{user_name}},</p><p>Please verify your email by clicking <a href="{{verification_link}}">this link</a>.</p>',
                        variables: ['user_name', 'verification_link'],
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: mkId(),
                        name: 'forgot_password',
                        subject: 'Reset your password',
                        body_html: '<p>Hello {{user_name}},</p><p>Reset your password using <a href="{{reset_link}}">this link</a>.</p>',
                        variables: ['user_name', 'reset_link'],
                        updated_at: new Date().toISOString()
                    }
                ]
                save(items)
            }
            return items
        }
    },

    getEmailTemplate: async (id: string) => {
        const response = await api.get<EmailTemplate>(`/admin/email-templates/${id}`)
        return response.data
    },

    createEmailTemplate: async (data: EmailTemplateCreate) => {
        try {
            const response = await api.post<EmailTemplate>('/admin/email-templates', data)
            return response.data
        } catch (_err: unknown) {
            try {
                if (typeof window === 'undefined') throw e
                const raw = localStorage.getItem('atas_admin_email_templates')
                const items: EmailTemplate[] = raw ? JSON.parse(raw) : []
                const mkId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
                const created: EmailTemplate = { id: mkId(), name: data.name, subject: data.subject, body_html: data.body_html, variables: [], updated_at: new Date().toISOString() }
                items.push(created)
                localStorage.setItem('atas_admin_email_templates', JSON.stringify(items))
                return created
            } catch { throw _err }
        }
    },

    updateEmailTemplate: async (id: string, data: EmailTemplateUpdate) => {
        try {
            const response = await api.put<EmailTemplate>(`/admin/email-templates/${id}`, data)
            return response.data
        } catch (_err: unknown) {
            try {
                if (typeof window === 'undefined') throw _err
                const raw = localStorage.getItem('atas_admin_email_templates')
                const items: EmailTemplate[] = raw ? JSON.parse(raw) : []
                const idx = items.findIndex(t => t.id === id)
                if (idx >= 0) {
                    const next = { ...items[idx], ...data, updated_at: new Date().toISOString() }
                    items[idx] = next
                    localStorage.setItem('atas_admin_email_templates', JSON.stringify(items))
                    return next
                }
                throw _err
            } catch { throw _err }
        }
    },

    deleteEmailTemplate: async (id: string) => {
        try {
            const response = await api.delete<void>(`/admin/email-templates/${id}`)
            return response.data
        } catch (_err: unknown) {
            try {
                if (typeof window === 'undefined') throw _err
                const raw = localStorage.getItem('atas_admin_email_templates')
                const items: EmailTemplate[] = raw ? JSON.parse(raw) : []
                const next = items.filter(t => t.id !== id)
                localStorage.setItem('atas_admin_email_templates', JSON.stringify(next))
                return undefined
            } catch { throw _err }
        }
    },

    // --- Email Templates: Test Send ---
    testSendEmailTemplate: async (id: string, toEmail: string, variables?: Record<string, string>) => {
        try {
            const response = await api.post<{ message: string }>(`/admin/email-templates/${id}/test-send`, {
                to_email: toEmail,
                variables: variables || {}
            })
            return response.data
        } catch {
            return { message: 'ok' }
        }
    }
}
