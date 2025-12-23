import React, { useState, useEffect } from 'react'
import { EventDetails, EventChecklistItemResponse, ProfileResponse, EventProposalResponse } from '@/services/api.types'
import { getEventChecklist, createEventChecklistItem, updateEventChecklistItem, deleteEventChecklistItem, findProfiles, getEventProposals, getEventParticipants, getProfileByUserId } from '@/services/api'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import { Dialog, Transition, Menu } from '@headlessui/react'
import { Fragment } from 'react'

const TEMPLATES = {
    default: {
        id: 'default',
        name: "Default",
        description: "Essential tasks for any event.",
        tasks: [
            "Secure a speaker",
            "Send email confirmation",
            "Attendees confirmation emails",
            "Prepare appreciation email"
        ]
    },
    project_management: {
        id: 'project_management',
        name: "Project Management",
        description: "Detailed setup for structured project tracking.",
        tasks: [
            "Create Project Charter",
            "Define Work Breakdown Structure (WBS)",
            "Develop Budget Plan",
            "Risk Assessment Analysis",
            "Secure a speaker",
            "Send email confirmation",
            "Attendees confirmation emails",
            "Prepare appreciation email",
            "Create Performance Report",
            "Project Chatter"
        ]
    },
    coming_soon: {
        id: 'coming_soon',
        name: "Coming Soon",
        description: "More templates are on the way!",
        tasks: []
    }
}

interface DashboardTabChecklistProps {
    event: EventDetails
}

export function DashboardTabChecklist({ event }: DashboardTabChecklistProps) {
    const [items, setItems] = useState<EventChecklistItemResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [files, setFiles] = useState<EventProposalResponse[]>([])
    const [fileLinks, setFileLinks] = useState<Record<string, string[]>>({}) // fileId -> checklistId[] list

    // Templates State
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('default')

    // Assignment State
    const [committee, setCommittee] = useState<ProfileResponse[]>([])

    // Inline Add State
    const [newItemTitle, setNewItemTitle] = useState('')
    const [newItemUser, setNewItemUser] = useState<ProfileResponse | null>(null)
    const [newItemFile, setNewItemFile] = useState<EventProposalResponse | null>(null) // New: Link a file
    const [userSearch, setUserSearch] = useState('')
    const [showAssignMenu, setShowAssignMenu] = useState(false)

    const fetchChecklist = async () => {
        try {
            const [checklistData, filesData, participantsData] = await Promise.all([
                getEventChecklist(event.id),
                getEventProposals(event.id),
                getEventParticipants(event.id)
            ])
            setItems(checklistData.sort((a, b) => a.sort_order - b.sort_order))
            setFiles(filesData)

            // Fetch Committee Profiles
            const committeeIds = participantsData
                .filter(p => ['organizer', 'committee'].includes(p.role))
                .map(p => p.user_id)

            // Unique IDs
            const uniqueIds = Array.from(new Set(committeeIds))

            const profiles = await Promise.all(uniqueIds.map(id => getProfileByUserId(id)))
            setCommittee(profiles)

            // Load links from local storage
            const links: Record<string, string[]> = {}
            try {
                const stored = localStorage.getItem(`event_${event.id}_file_checklist_links`)
                if (stored) {
                    const parsed = JSON.parse(stored)
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

    // Removed searchUsers as we now use committee list primarily, but can keep for fallback if needed.
    // For now, we will just use the committee list.

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

    const handleToggleAssignUser = async (itemId: string, userId: string) => {
        const item = items.find(i => i.id === itemId)
        if (!item) return

        const currentIds = item.assigned_user_ids || []
        // Fallback for legacy data if needed, but API should normalize
        // If currentIds empty but assigned_user_id exists, include it?
        // Let's assume API response is clean or we handle it.

        let newIds = [...currentIds]
        if (newIds.includes(userId)) {
            newIds = newIds.filter(id => id !== userId)
        } else {
            newIds.push(userId)
        }

        // Optimistic Update
        setItems(items.map(i => i.id === itemId ? { ...i, assigned_user_ids: newIds } : i))

        try {
            await updateEventChecklistItem(event.id, itemId, { assigned_user_ids: newIds })
            // toast.success('Assignees updated') // Too noisy for multi-select
        } catch (error) {
            console.error(error)
            setItems(items.map(i => i.id === itemId ? { ...i, assigned_user_ids: currentIds } : i))
            toast.error('Failed to update assignees')
        }
    }

    const handleToggleFile = (itemId: string, fileId: string) => {
        const currentLinks = { ...fileLinks }
        if (!currentLinks[fileId]) currentLinks[fileId] = []

        const isLinked = currentLinks[fileId].includes(itemId)
        if (isLinked) {
            currentLinks[fileId] = currentLinks[fileId].filter(id => id !== itemId)
        } else {
            currentLinks[fileId].push(itemId)
        }

        setFileLinks(currentLinks)
        localStorage.setItem(`event_${event.id}_file_checklist_links`, JSON.stringify(currentLinks))
        toast.success(isLinked ? 'File detached' : 'File attached')
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
            assigned_user_ids: newItemUser ? [newItemUser.user_id] : []
        }

        // Optimistic UI
        setItems([...items, tempItem])
        setNewItemTitle('')
        setNewItemUser(null)
        setNewItemFile(null)
        setShowAssignMenu(false)

        try {
            const newItem = await createEventChecklistItem(event.id, {
                title: tempItem.title,
                assigned_user_ids: tempItem.assigned_user_ids
            })
            // Replace temp item with real one
            setItems(prev => prev.map(i => i.id === tempId ? newItem : i))

            // Handle File Link
            if (newItemFile) {
                const currentLinks = { ...fileLinks }
                const fileId = newItemFile.id
                if (!currentLinks[fileId]) currentLinks[fileId] = []
                currentLinks[fileId].push(newItem.id)
                setFileLinks(currentLinks)
                localStorage.setItem(`event_${event.id}_file_checklist_links`, JSON.stringify(currentLinks))
            }

            toast.success('Task added')
        } catch (error) {
            console.error(error)
            setItems(prev => prev.filter(i => i.id !== tempId))
            toast.error('Failed to add task')
        }
    }

    const loadTemplate = async () => {
        const template = TEMPLATES[selectedTemplate]
        if (!template || template.tasks.length === 0) return

        setLoading(true)
        setShowTemplateModal(false)
        try {
            for (const title of template.tasks) {
                await createEventChecklistItem(event.id, { title })
            }
            await fetchChecklist()
            toast.success(`${template.name} template loaded`)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load template')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
            <div className="flex items-center justify-between">
                <div />
                <div />
                {!loading && items.length === 0 && (
                    <button
                        onClick={() => setShowTemplateModal(true)}
                        className="text-sm font-bold text-yellow-600 hover:text-yellow-700 underline decoration-yellow-400 decoration-2 underline-offset-2"
                    >
                        Load a Template
                    </button>
                )}
            </div>

            {/* Template Modal */}
            <Transition appear show={showTemplateModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowTemplateModal(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-0 text-left align-middle shadow-xl transition-all">
                                    <div className="flex h-[600px]">
                                        {/* Sidebar: Templates List */}
                                        <div className="w-1/3 border-r border-zinc-100 bg-zinc-50 p-6 flex flex-col gap-2">
                                            <Dialog.Title as="h3" className="text-lg font-black text-zinc-900 mb-4">
                                                Select Template
                                            </Dialog.Title>
                                            {Object.values(TEMPLATES).map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setSelectedTemplate(t.id as keyof typeof TEMPLATES)}
                                                    disabled={t.id === 'coming_soon'}
                                                    className={`p-4 rounded-xl text-left transition-all border-2 ${selectedTemplate === t.id
                                                        ? 'bg-white border-yellow-400 shadow-md ring-1 ring-yellow-400'
                                                        : t.id === 'coming_soon'
                                                            ? 'opacity-50 cursor-not-allowed border-transparent'
                                                            : 'hover:bg-white border-transparent hover:border-zinc-200'
                                                        }`}
                                                >
                                                    <div className="font-bold text-zinc-900 text-sm">{t.name}</div>
                                                    <div className="text-xs text-zinc-500 mt-1">{t.description}</div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Main: Preview */}
                                        <div className="flex-1 p-8 flex flex-col">
                                            <div className="flex-1 overflow-y-auto">
                                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Tasks Preview</h4>
                                                <ul className="space-y-3">
                                                    {TEMPLATES[selectedTemplate].tasks.length > 0 ? (
                                                        TEMPLATES[selectedTemplate].tasks.map((task, i) => (
                                                            <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                                                <div className="w-5 h-5 rounded-md border-2 border-zinc-300" />
                                                                <span className="text-sm font-bold text-zinc-700">{task}</span>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">
                                                            No tasks in this template yet.
                                                        </div>
                                                    )}
                                                </ul>
                                            </div>
                                            <div className="pt-6 border-t border-zinc-100 flex justify-end gap-3">
                                                <button
                                                    onClick={() => setShowTemplateModal(false)}
                                                    className="px-4 py-2 rounded-xl text-zinc-500 font-bold text-sm hover:bg-zinc-100 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={loadTemplate}
                                                    disabled={TEMPLATES[selectedTemplate].tasks.length === 0}
                                                    className="px-6 py-2 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50"
                                                >
                                                    Use Template
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

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
                                                <Menu as="div" className="relative">
                                                    <Menu.Button className="w-full text-left focus:outline-none">
                                                        {item.assigned_user_ids && item.assigned_user_ids.length > 0 ? (
                                                            <div className="flex items-center -space-x-2 px-2 py-1 -ml-2 rounded-lg hover:bg-zinc-100 transition-colors">
                                                                {item.assigned_user_ids.map(uid => {
                                                                    const person = committee.find(p => p.id === uid) || committee.find(p => p.user_id === uid)
                                                                    if (!person) return null
                                                                    return (
                                                                        <div key={uid} className="w-6 h-6 rounded-full bg-zinc-100 ring-2 ring-white overflow-hidden relative" title={person.full_name}>
                                                                            {person.avatar_url ? (
                                                                                <Image src={person.avatar_url} alt={person.full_name} fill className="object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-[10px] font-bold">
                                                                                    {person.full_name[0]}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-zinc-400 font-bold ring-2 ring-white hover:bg-zinc-50">
                                                                    +
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="px-2 py-1 -ml-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer group-hover:bg-white text-zinc-400 italic text-xs hover:text-blue-500">
                                                                Assign...
                                                            </div>
                                                        )}
                                                    </Menu.Button>
                                                    <Transition
                                                        as={Fragment}
                                                        enter="transition ease-out duration-100"
                                                        enterFrom="transform opacity-0 scale-95"
                                                        enterTo="transform opacity-100 scale-100"
                                                        leave="transition ease-in duration-75"
                                                        leaveFrom="transform opacity-100 scale-100"
                                                        leaveTo="transform opacity-0 scale-95"
                                                    >
                                                        <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-right divide-y divide-zinc-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                                            <div className="p-1 max-h-60 overflow-y-auto">
                                                                {committee.length > 0 ? (
                                                                    committee.map(u => {
                                                                        const isAssigned = (item.assigned_user_ids || []).includes(u.user_id) || (item.assigned_user_ids || []).includes(u.id)
                                                                        return (
                                                                            <Menu.Item key={u.id}>
                                                                                {({ active }) => (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault() // Try to prevent close?
                                                                                            handleToggleAssignUser(item.id, u.user_id)
                                                                                        }}
                                                                                        className={`${active ? 'bg-yellow-50 text-zinc-900' : 'text-zinc-700'
                                                                                            } group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs font-bold`}
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                                                                                {u.full_name[0]}
                                                                                            </div>
                                                                                            {u.full_name}
                                                                                        </div>
                                                                                        {isAssigned && (
                                                                                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                                            </svg>
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                            </Menu.Item>
                                                                        )
                                                                    })
                                                                ) : (
                                                                    <div className="px-2 py-2 text-xs text-zinc-400 italic">No members available</div>
                                                                )}
                                                            </div>
                                                        </Menu.Items>
                                                    </Transition>
                                                </Menu>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Attach File Menu */}
                                                    <Menu as="div" className="relative inline-block text-left">
                                                        <Menu.Button className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all focus:opacity-100 focus:outline-none">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                        </Menu.Button>
                                                        <Transition
                                                            as={Fragment}
                                                            enter="transition ease-out duration-100"
                                                            enterFrom="transform opacity-0 scale-95"
                                                            enterTo="transform opacity-100 scale-100"
                                                            leave="transition ease-in duration-75"
                                                            leaveFrom="transform opacity-100 scale-100"
                                                            leaveTo="transform opacity-0 scale-95"
                                                        >
                                                            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-zinc-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                                                <div className="p-1 max-h-60 overflow-y-auto">
                                                                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                                        Attach File
                                                                    </div>
                                                                    {files.length > 0 ? (
                                                                        files.map(f => {
                                                                            const isLinked = (fileLinks[f.id] || []).includes(item.id)
                                                                            return (
                                                                                <Menu.Item key={f.id}>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={() => handleToggleFile(item.id, f.id)}
                                                                                            className={`${active ? 'bg-blue-50 text-blue-900' : 'text-zinc-700'
                                                                                                } group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold`}
                                                                                        >
                                                                                            <span className="truncate">{f.title || 'Untitled'}</span>
                                                                                            {isLinked && (
                                                                                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                                                </svg>
                                                                                            )}
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            )
                                                                        })
                                                                    ) : (
                                                                        <div className="px-3 py-2 text-xs text-zinc-400 italic">No files available</div>
                                                                    )}
                                                                </div>
                                                            </Menu.Items>
                                                        </Transition>
                                                    </Menu>

                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all focus:opacity-100"
                                                        title="Delete task"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
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
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignMenu(!showAssignMenu)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${newItemUser || newItemFile
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white border-zinc-200 text-zinc-500 hover:border-yellow-400'
                                            }`}
                                    >
                                        {newItemUser ? (
                                            <>
                                                <span className="text-blue-600">@</span> {newItemUser.full_name}
                                            </>
                                        ) : newItemFile ? (
                                            <>
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                {newItemFile.title}
                                            </>
                                        ) : (
                                            <>
                                                <span>Assign / Attach</span>
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {showAssignMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden z-20">
                                        <div className="max-h-60 overflow-y-auto">
                                            {/* Committee Section */}
                                            <div className="px-3 py-2 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                Committee & Organizers
                                            </div>
                                            {committee.length > 0 ? (
                                                committee.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewItemUser(u)
                                                            setNewItemFile(null) // Reset file if user selected
                                                            setShowAssignMenu(false)
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-3 group"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold group-hover:bg-yellow-100 text-zinc-600">
                                                            {u.full_name[0]}
                                                        </div>
                                                        <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900">{u.full_name}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-xs text-zinc-400 italic">No members found</div>
                                            )}

                                            {/* Files Section */}
                                            {files.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-t border-zinc-100">
                                                        Attach File
                                                    </div>
                                                    {files.map(f => (
                                                        <button
                                                            key={f.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setNewItemFile(f)
                                                                setNewItemUser(null) // Reset user if file selected (can change logic to allow both if backend supports it, but for now 1 slot in UI)
                                                                // Actually UI can support both if we have separate states, but `handleAdd` assign logic needs care.
                                                                // The requested feature is "people OR files".
                                                                setShowAssignMenu(false)
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 group"
                                                        >
                                                            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            </div>
                                                            <span className="text-xs font-bold text-zinc-700 group-hover:text-blue-800 truncate">{f.title || 'Untitled File'}</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
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
