'use client'

import { useState } from 'react'
import { EventDetails } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import {
    TrashIcon,
    CheckIcon,
    Cross2Icon,
    ChevronDownIcon,
    ChevronUpIcon,
    ImageIcon
} from '@radix-ui/react-icons'
import { format } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'

interface EventsTableProps {
    events: EventDetails[]
    onRefresh: () => void
}

export function EventsTable({ events, onRefresh }: EventsTableProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const handleDelete = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return
        setIsLoading(eventId)
        try {
            await adminService.deleteEvent(eventId)
            toast.success('Event deleted')
            onRefresh()
        } catch (error) {
            toast.error('Failed to delete event')
            console.error(error)
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
            toast.error('Failed to publish event')
        } finally {
            setIsLoading(null)
        }
    }

    const handleUnpublish = async (eventId: string) => {
        setIsLoading(eventId)
        try {
            await adminService.unpublishEvent(eventId)
            toast.success('Event unpublished')
            onRefresh()
        } catch (error) {
            toast.error('Failed to unpublish event')
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
                                                        <img
                                                            src={event.cover_url}
                                                            alt=""
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
                                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                                {event.organizer_id.slice(0, 8)}...
                                            </span>
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
                                                        onClick={() => handleUnpublish(event.id)}
                                                        disabled={isLoading === event.id}
                                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                        title="Unpublish"
                                                    >
                                                        <Cross2Icon className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    disabled={isLoading === event.id}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
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
                            <img
                                src={previewImage}
                                alt="Event Cover"
                                className="w-full h-full object-contain rounded-lg"
                            />
                        )}
                        <Dialog.Close className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-900" />
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    )
}

// Helper component to avoid React fragment key warning with map
const 片 = ({ children }: { children: React.ReactNode }) => <>{children}</>
