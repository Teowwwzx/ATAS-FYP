'use client'

import { useState, useEffect } from 'react'
import { adminService } from '@/services/admin.service'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { PaperPlaneIcon } from '@radix-ui/react-icons'

export default function AdminNotificationsPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_role: '',
        link_url: ''
    })
    const [history, setHistory] = useState<any[]>([])
    const { data: templates } = useSWR('admin-email-templates', () => adminService.getEmailTemplates())
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
    const [templateVars, setTemplateVars] = useState<string>('')
    const [sendBoth, setSendBoth] = useState<boolean>(false)

    const fetchHistory = async () => {
        try {
            const logs = await adminService.getAuditLogs({
                action: 'broadcast_notification',
                page_size: 10
            })
            setHistory(logs)
        } catch (error) {
            console.error('Failed to fetch history', error)
        }
    }

    // Fetch history on mount
    useEffect(() => {
        fetchHistory()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTemplateId) {
            if (!formData.title || !formData.content) {
                toast.error('Title and content are required')
                return
            }
        }

        setIsLoading(true)
        try {
            if (selectedTemplateId) {
                let vars: Record<string, string> = {}
                try { vars = JSON.parse(templateVars || '{}') } catch {}
                const res = await adminService.broadcastEmailTemplate({
                    template_id: selectedTemplateId,
                    variables: vars,
                    target_role: formData.target_role || undefined,
                })
                toast.success(`Email broadcast queued to ${res.count} users`)
                setSelectedTemplateId('')
                setTemplateVars('')
                if (sendBoth) {
                    const res2 = await adminService.broadcastNotification({
                        title: formData.title || 'Notification',
                        content: formData.content || 'You have a new email message. Please check your inbox.',
                        target_role: formData.target_role || undefined,
                        link_url: formData.link_url || undefined
                    })
                    toast.success(`Notification sent to ${res2.count} users`)
                }
                setFormData(prev => ({ ...prev, title: '', content: '' }))
            } else {
                const res = await adminService.broadcastNotification({
                    title: formData.title,
                    content: formData.content,
                    target_role: formData.target_role || undefined,
                    link_url: formData.link_url || undefined
                })
                toast.success(`Notification sent to ${res.count} users`)
                setFormData({ title: '', content: '', target_role: '', link_url: '' })
            }
            fetchHistory()
        } catch (error) {
            toast.error('Failed to send')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
                <p className="text-gray-500 mt-1">Broadcast system-wide notifications to users</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Send Broadcast</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors"
                                    placeholder="e.g., System Maintenance"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message Content
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors h-32 resize-none"
                                    placeholder="Type your message here..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Or choose an Email Template
                                </label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors"
                                >
                                    <option value="">None</option>
                                    {(templates || []).map(t => (
                                        <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                                    ))}
                                </select>
                                {selectedTemplateId && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Template Variables (JSON)</label>
                                        <textarea
                                            value={templateVars}
                                            onChange={(e) => setTemplateVars(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors h-24 font-mono text-xs"
                                            placeholder='{"user_name":"Alice","verification_link":"https://..."}'
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Target Role (Optional)
                                    </label>
                                    <select
                                        value={formData.target_role}
                                        onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors"
                                    >
                                        <option value="">All Users</option>
                                        <option value="student">Students</option>
                                        <option value="teacher">Teachers</option>
                                        <option value="organizer">Organizers</option>
                                        <option value="admin">Admins</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Link URL (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.link_url}
                                        onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors"
                                        placeholder="/dashboard"
                                    />
                                    <div className="mt-3 flex items-center gap-2">
                                        <input id="sendBoth" type="checkbox" checked={sendBoth} onChange={(e)=>setSendBoth(e.target.checked)} />
                                        <label htmlFor="sendBoth" className="text-sm text-gray-700">Also send in-app notification</label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        'Sending...'
                                    ) : (
                                        <>
                                            <PaperPlaneIcon className="w-4 h-4 mr-2" />
                                            Send Broadcast
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Recent History</h2>
                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <p className="text-gray-500 text-sm">No recent broadcasts found.</p>
                        ) : (
                            history.map((log) => {
                                let details: any = {}
                                try {
                                    details = log.details ? JSON.parse(log.details) : {}
                                } catch (e) {
                                    details = {}
                                }

                                return (
                                    <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm">
                                        <div className="font-medium text-gray-900 mb-1">{details.title || 'Untitled Broadcast'}</div>
                                        <p className="text-gray-600 line-clamp-2 mb-2">{details.content || 'No content'}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-400">
                                            <span>
                                                Target: <span className="font-medium text-gray-600 capitalize">{details.target_role || 'All Users'}</span>
                                            </span>
                                            <span>
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {details.recipient_count !== undefined && (
                                            <div className="mt-2 text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">
                                                Sent to {details.recipient_count} users
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
