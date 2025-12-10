'use client'

import { useMemo, useState } from 'react'
import { EventDetails } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { getProfileByUserId } from '@/services/api'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { toastError } from '@/lib/utils'
import {
    TrashIcon,
    CheckIcon,
    Cross2Icon,
    ChevronDownIcon,
    ChevronUpIcon,
    ImageIcon
} from '@radix-ui/react-icons'
import { format } from 'date-fns'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { getMe } from '@/services/api'

interface EventsTableProps {
    events: EventDetails[]
    onRefresh: () => void
}

export function EventsTable({ events, onRefresh }: EventsTableProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
    const [moderationTargetId, setModerationTargetId] = useState<string | null>(null)
    const [moderationType, setModerationType] = useState<'unpublish' | 'delete' | null>(null)
    const [moderationReason, setModerationReason] = useState<string>('')
    const { data: me } = useSWR('/users/me', () => getMe(), { revalidateOnFocus: false, dedupingInterval: 60000 })
    const roles = useMemo(() => (me?.roles || []), [me])
    const isSuperAdmin = useMemo(() => roles.includes('super_admin'), [roles])

    const notifyOrganizer = async (event: EventDetails, action: 'unpublish' | 'delete', reason?: string) => {
        const title = action === 'unpublish' ? 'Event Unpublished' : 'Event Removed'
        const base = action === 'unpublish'
            ? `Your event "${event.title}" has been unpublished by an administrator for review. Please update content or contact support.`
            : `Your event "${event.title}" has been removed by a super administrator due to policy violations. If you believe this is a mistake, contact support.`
        const content = reason ? `${base}\n\nReason: ${reason}` : base
        try {
            const res = await adminService.broadcastEmailTemplate({
                template_id: 'moderation_notice',
                variables: { event_title: event.title, reason: reason || '' },
                target_user_id: event.organizer_id,
            })
            if (!res || typeof res.count !== 'number' || res.count === 0) {
                await adminService.broadcastNotification({ title, content, target_user_id: event.organizer_id })
            }
        } catch {
            // no-op
        }
    }

    const handleDelete = async (eventId: string, reason?: string) => {
        setIsLoading(eventId)
        try {
            const ev = events.find(e => e.id === eventId)
            if (!ev) throw new Error('Event not found')
            if (ev.status === 'published') {
                toast.error('Unpublish the event before deleting')
                return
            }
            await adminService.deleteEvent(eventId)
            toast.success('Event deleted')
            await notifyOrganizer(ev, 'delete', reason)
            onRefresh()
        } catch (error) {
            toastError(error, undefined, 'Failed to delete event')
        } finally {
            setIsLoading(null)
        }
    }

    const handlePublish = async (eventId: string) => {
        setIsLoading(eventId)
        try {
            await adminService.publishEvent(eventId)
            toast.success('Event published')
            onRefresh()
        } catch (error) {
            toastError(error, undefined, 'Failed to publish event')
        } finally {
            setIsLoading(null)
        }
    }

    const handleUnpublish = async (eventId: string, reason?: string) => {
        setIsLoading(eventId)
        try {
            await adminService.unpublishEvent(eventId)
            toast.success('Event unpublished')
            const ev = events.find(e => e.id === eventId)
            if (ev) await notifyOrganizer(ev, 'unpublish', reason)
            onRefresh()
        } catch (error) {
            toastError(error, undefined, 'Failed to unpublish event')
        } finally {
            setIsLoading(null)
        }
    }

    const toggleExpand = (eventId: string) => {
        setExpandedEventId(expandedEventId === eventId ? null : eventId)
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-10"></th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Event</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Organizer</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {events.map((event) => (
                                <片 key={event.id}>
                                    <tr
                                        onClick={() => toggleExpand(event.id)}
                                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedEventId === event.id ? 'bg-gray-50' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(event.id); }}
                                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                            >
                                                {expandedEventId === event.id ? (
                                                    <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {event.cover_url ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(event.cover_url || null); }}
                                                        className="relative group"
                                                    >
                                                        <Image
                                                            src={event.cover_url}
                                                            alt=""
                                                            width={40}
                                                            height={40}
                                                            unoptimized
                                                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 group-hover:opacity-80 transition-opacity"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ImageIcon className="w-4 h-4 text-white drop-shadow-md" />
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">{event.title}</div>
                                                    <div className="text-xs text-gray-500">{event.type} • {event.format}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <OrganizerName userId={event.organizer_id} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${event.status === 'published' ? 'bg-green-100 text-green-800' :
                                                    event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-red-100 text-red-800'}`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {event.status === 'draft' ? (
                                                    <button
                                                        onClick={() => handlePublish(event.id)}
                                                        disabled={isLoading === event.id}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Publish"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => { setModerationTargetId(event.id); setModerationType('unpublish'); setModerationReason(''); }}
                                                        disabled={isLoading === event.id}
                                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                        title="Unpublish"
                                                    >
                                                        <Cross2Icon className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {isSuperAdmin ? (
                                                    event.status === 'published' ? (
                                                        <button
                                                            disabled
                                                            className="p-2 text-gray-300 rounded-lg cursor-not-allowed"
                                                            title="Unpublish first to delete"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setModerationTargetId(event.id); setModerationType('delete'); setModerationReason('') }}
                                                            disabled={isLoading === event.id}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedEventId === event.id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="grid grid-cols-2 gap-6 text-sm">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                                                        <p className="text-gray-600 whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 mb-1">Location</h4>
                                                            <p className="text-gray-600">{event.venue_remark || 'TBD'}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 mb-1">Visibility</h4>
                                                            <p className="text-gray-600 capitalize">{event.visibility}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 mb-1">Full ID</h4>
                                                            <p className="font-mono text-xs text-gray-500">{event.id}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </片>
                            ))}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No events found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog.Root open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-2xl z-50 max-w-3xl max-h-[90vh] w-full outline-none">
                        <Dialog.Title className="sr-only">Event Cover Preview</Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Full size preview of the event cover image
                        </Dialog.Description>
                        {previewImage && (
                            <Image
                                src={previewImage}
                                alt="Event Cover"
                                width={1200}
                                height={800}
                                unoptimized
                                className="w-full h-full object-contain rounded-lg"
                            />
                        )}
                        <Dialog.Close className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-900" />
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete reason modal */}
            <Dialog.Root open={!!moderationTargetId && moderationType === 'delete'} onOpenChange={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-lg outline-none">
                        <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Delete Event (Super Admin)</Dialog.Title>
                        <p className="text-sm text-gray-700 mb-4">Only unpublished events can be deleted. The organizer will be notified. Please provide a reason.</p>
                        <textarea value={moderationReason} onChange={(e) => setModerationReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-28 text-sm" placeholder="Reason (required)" />
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button className="px-3 py-2 border border-gray-300 rounded-lg" onClick={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Cancel</button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700" disabled={!moderationReason.trim()} onClick={() => { if (moderationTargetId) handleDelete(moderationTargetId, moderationReason.trim()); setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Delete</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={!!moderationTargetId && moderationType === 'unpublish'} onOpenChange={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-lg outline-none">
                        <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Unpublish Event</Dialog.Title>
                        <p className="text-sm text-gray-700 mb-4">Provide a reason for unpublishing. The organizer will be notified.</p>
                        <textarea value={moderationReason} onChange={(e) => setModerationReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-28 text-sm" placeholder="Reason (required)" />
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button className="px-3 py-2 border border-gray-300 rounded-lg" onClick={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Cancel</button>
                            <button className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-lg font-bold hover:bg-yellow-300" disabled={!moderationReason.trim()} onClick={() => { if (moderationTargetId) handleUnpublish(moderationTargetId, moderationReason.trim()); setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Unpublish</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    )
}

function OrganizerName({ userId }: { userId: string }) {
    const { data } = useSWR(['/profiles', userId], () => getProfileByUserId(userId), {
        revalidateOnFocus: false,
        dedupingInterval: 300000,
    })
    if (!data) {
        return (
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {userId.slice(0, 8)}...
            </span>
        )
    }
    return <span className="text-gray-700 font-medium">{data.full_name || userId.slice(0, 8) + '...'}</span>
}

// Helper component to avoid React fragment key warning with map
const 片 = ({ children }: { children: React.ReactNode }) => <>{children}</>
