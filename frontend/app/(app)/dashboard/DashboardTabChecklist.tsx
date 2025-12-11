import React, { useState, useEffect } from 'react'
import { EventDetails, EventChecklistItemResponse, ProfileResponse, EventProposalResponse } from '@/services/api.types'
import { getEventChecklist, createEventChecklistItem, updateEventChecklistItem, deleteEventChecklistItem, findProfiles, getEventProposals } from '@/services/api'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface DashboardTabChecklistProps {
    event: EventDetails
}

export function DashboardTabChecklist({ event }: DashboardTabChecklistProps) {
    const [items, setItems] = useState<EventChecklistItemResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [files, setFiles] = useState<EventProposalResponse[]>([])
    const [fileLinks, setFileLinks] = useState<Record<string, string[]>>({}) // fileId -> checklistId[]

    // Inline Add State
    const [newItemTitle, setNewItemTitle] = useState('')
    const [newItemUser, setNewItemUser] = useState<ProfileResponse | null>(null)
    const [userSearch, setUserSearch] = useState('')
    const [userOptions, setUserOptions] = useState<ProfileResponse[]>([])

    const fetchChecklist = async () => {
        try {
            const [checklistData, filesData] = await Promise.all([
                getEventChecklist(event.id),
                getEventProposals(event.id)
            ])
            setItems(checklistData.sort((a, b) => a.sort_order - b.sort_order))
            setFiles(filesData)

            // Load links from local storage
            const links: Record<string, string[]> = {}
            try {
                const stored = localStorage.getItem(`event_${event.id}_file_checklist_links`)
                if (stored) {
                    const parsed = JSON.parse(stored)
                    // Revert mapping: checklistId -> fileIds[]
                    // Actually, let's keep it fileId -> checklistId[] and search on render for simplicity
                    setFileLinks(parsed)
                }
            } catch (e) {
                console.error(e)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const searchUsers = async (query: string) => {
        if (!query) {
            setUserOptions([])
            return
        }
        try {
            const res = await findProfiles({ name: query })
            setUserOptions(res)
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        fetchChecklist()
    }, [event.id])

    const handleToggle = async (item: EventChecklistItemResponse) => {
        const originalItems = [...items]
        const updatedItems = items.map(i => i.id === item.id ? { ...i, is_completed: !i.is_completed } : i)
        setItems(updatedItems)

        try {
            await updateEventChecklistItem(event.id, item.id, { is_completed: !item.is_completed })
        } catch (error) {
            console.error(error)
            setItems(originalItems)
            toast.error('Failed to update task')
        }
    }

    const handleDelete = async (itemId: string) => {
        if (!confirm('Delete this task?')) return
        try {
            await deleteEventChecklistItem(event.id, itemId)
            setItems(items.filter(i => i.id !== itemId))
            toast.success('Task deleted')
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete task')
        }
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItemTitle.trim()) return

        const tempId = 'temp-' + Date.now()
        const tempItem: EventChecklistItemResponse = {
            id: tempId,
            event_id: event.id,
            title: newItemTitle,
            is_completed: false,
            sort_order: items.length + 1,
            created_by_user_id: 'me',
            created_at: new Date().toISOString(),
            assigned_user_id: newItemUser?.user_id
        }

        // Optimistic UI
        setItems([...items, tempItem])
        setNewItemTitle('')
        setNewItemUser(null)
        setUserSearch('')

        try {
            const newItem = await createEventChecklistItem(event.id, {
                title: tempItem.title,
                assigned_user_id: tempItem.assigned_user_id
            })
            // Replace temp item with real one
            setItems(prev => prev.map(i => i.id === tempId ? newItem : i))
            toast.success('Task added')
        } catch (error) {
            console.error(error)
            setItems(prev => prev.filter(i => i.id !== tempId))
            toast.error('Failed to add task')
        }
    }

    const loadDefaults = async () => {
        const defaults = [
            "Secure a speaker",
            "Send email confirmation",
            "Prepare appreciation email"
        ]
        setLoading(true)
        try {
            for (const title of defaults) {
                await createEventChecklistItem(event.id, { title })
            }
            await fetchChecklist()
            toast.success('Default template loaded')
        } catch (error) {
            console.error(error)
            toast.error('Failed to load defaults')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
            <div className="flex items-center justify-between">
                <div />
                {!loading && items.length === 0 && (
                    <button
                        onClick={loadDefaults}
                        className="text-sm font-bold text-yellow-600 hover:text-yellow-700 underline decoration-yellow-400 decoration-2 underline-offset-2"
                    >
                        Load Default Template
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-100">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Task</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-6 py-4 w-12 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 font-medium">
                                            No tasks yet. Add one below!
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggle(item)}
                                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.is_completed
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'bg-zinc-50 border-zinc-300 text-transparent hover:border-yellow-400'
                                                        }`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold transition-all ${item.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                                                    {item.title}
                                                </span>
                                                {/* Linked Files Display */}
                                                {(() => {
                                                    const linkedFiles = files.filter(f => {
                                                        const linkedChecklistIds = fileLinks[f.id] || []
                                                        return linkedChecklistIds.includes(item.id)
                                                    })

                                                    if (linkedFiles.length > 0) {
                                                        return (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {linkedFiles.map(f => (
                                                                    <a
                                                                        key={f.id}
                                                                        href={f.file_url ?? '#'}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-100"
                                                                        title={f.title ?? ''}
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                        {f.title}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.assigned_user_id ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                                            A
                                                        </div>
                                                        <span className="text-sm font-medium text-zinc-700">Assigned</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-zinc-400 italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete task"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Inline Add Task Row */}
                    <div className="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-yellow-400/50 transition-colors p-4 flex gap-4 items-center">
                        <div className="w-6 h-6 rounded-lg border-2 border-zinc-300 bg-white" />
                        <form onSubmit={handleAdd} className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                            <input
                                type="text"
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                placeholder="Add a new task... (Press Enter)"
                                className="flex-1 bg-transparent border-none p-0 text-base font-medium placeholder-zinc-400 focus:ring-0 text-zinc-900"
                            />

                            <div className="relative">
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => {
                                        setUserSearch(e.target.value)
                                        searchUsers(e.target.value)
                                        setNewItemUser(null)
                                    }}
                                    placeholder={newItemUser ? newItemUser.full_name : "@ Assign"}
                                    className={`bg-white text-xs font-bold py-2 px-3 rounded-xl border transition-all w-32 truncate ${newItemUser
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-zinc-200 text-zinc-500 focus:border-yellow-400 focus:ring-0'
                                        }`}
                                />
                                {userSearch && userOptions.length > 0 && !newItemUser && (
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden z-20">
                                        {userOptions.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => {
                                                    setNewItemUser(u)
                                                    setUserSearch('')
                                                    setUserOptions([])
                                                }}
                                                className="p-3 hover:bg-yellow-50 cursor-pointer text-sm font-medium border-b border-zinc-50 last:border-0 text-zinc-700"
                                            >
                                                {u.full_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={!newItemTitle.trim()}
                                className="p-2 bg-zinc-900 text-yellow-400 rounded-lg shadow-sm hover:scale-105 transition-all disabled:opacity-0 disabled:scale-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
