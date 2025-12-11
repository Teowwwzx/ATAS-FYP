import React, { useState, useEffect, Fragment } from 'react'
import { EventDetails, EventProposalResponse, EventProposalCreate, ProfileResponse, EventChecklistItemResponse } from '@/services/api.types'
import { getEventProposals, createEventProposalWithFile, deleteEventProposal, findProfiles, inviteEventParticipants, getEventChecklist } from '@/services/api'
import { toast } from 'react-hot-toast'
import { Dialog, Transition } from '@headlessui/react'

import { ConfirmationModal } from '@/components/ui/ConfirmationModal'


interface DashboardTabProposalsProps {
    event: EventDetails
}

import { CommunicationLog } from '@/components/dashboard/CommunicationLog'
import { getMe } from '@/services/api'

// Wrapped CommunicationLog in a Modal
function ProposalDiscussionModal({ proposal, isOpen, onClose, currentUser }: { proposal: EventProposalResponse, isOpen: boolean, onClose: () => void, currentUser: any }) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[2rem] bg-white shadow-xl transition-all border border-zinc-100 flex flex-col h-[80vh]">
                                <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                                    <div>
                                        <h3 className="text-xl font-black text-zinc-900">Discussion</h3>
                                        <p className="text-zinc-500 text-sm">Proposal: {proposal.title}</p>
                                    </div>
                                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-2 hover:bg-zinc-100 rounded-full transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden flex flex-col p-6">
                                    {proposal.conversation_id ? (
                                        <CommunicationLog
                                            conversationId={proposal.conversation_id}
                                            organizerName="Organizer" // Or fetch actual name? For now generic is fine or prop
                                            currentUserId={currentUser?.id}
                                        />
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-zinc-400">
                                            Initializing chat...
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

// Simple internal component for the template editor
function TemplateEditor({ type, initialContent }: { type: string, initialContent: string }) {
    const [content, setContent] = useState(initialContent)

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        toast.success('Template copied to clipboard!')
    }

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-lg font-bold text-zinc-900 capitalize">{type} Template</h4>
                    <p className="text-zinc-500 text-sm">Customize and use this template for your proposals.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="px-4 py-2 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors text-sm"
                    >
                        Copy Text
                    </button>
                    <button
                        onClick={() => toast.success(`${type} template exported (mock)!`)}
                        className="px-4 py-2 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-colors text-sm"
                    >
                        Export PDF
                    </button>
                </div>
            </div>
            <textarea
                className="w-full h-[400px] p-4 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 font-mono text-sm leading-relaxed resize-none text-zinc-900"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />
        </div>
    )
}

const SPEAKER_TEMPLATE_DEFAULT = `Subject: Invitation to Speak at [Event Name]

Dear [Speaker Name],

I hope this email finds you well.

My name is [Your Name] and I am the [Your Role] for [Event Name], taking place on [Date] at [Venue].

We have been following your work on [Topic] and would be honored to have you join us as a keynote speaker. Our audience of [Number] [Audience Type] would greatly benefit from your insights.

Could we schedule a brief call to discuss this opportunity further?

Best regards,

[Your Name]
[Organization]`

const SPONSOR_TEMPLATE_DEFAULT = `Subject: Partnership Opportunity: [Event Name] x [Company Name]

Dear [Contact Name],

I am writing to you regarding an exciting partnership opportunity for [Event Name], a premier event for [Event Focus] hosted by [Organization].

Scheduled for [Date], we are expecting over [Number] attendees. We believe [Company Name]'s values align perfectly with our mission.

We have drafted a sponsorship proposal (attached) outlining various tiers and benefits. We would love to have [Company Name] as a key partner.

Looking forward to your thoughts.

Sincerely,

[Your Name]
[Organization]`

// --- Invite Modal ---
function InviteProposalModal({ proposal, eventId, isOpen, onClose }: { proposal: EventProposalResponse, eventId: string, isOpen: boolean, onClose: () => void }) {
    const [search, setSearch] = useState('')
    const [results, setResults] = useState<ProfileResponse[]>([])
    const [searching, setSearching] = useState(false)
    const [inviting, setInviting] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<'speaker' | 'sponsor'>('speaker')

    useEffect(() => {
        if (!search.trim()) {
            setResults([])
            return
        }
        const delay = setTimeout(() => {
            setSearching(true)
            findProfiles({ name: search }) // Simple search by name
                .then(setResults)
                .catch(console.error)
                .finally(() => setSearching(false))
        }, 300)
        return () => clearTimeout(delay)
    }, [search])

    const handleInvite = async (userId: string) => {
        setInviting(userId)
        try {
            await inviteEventParticipants(eventId, [{
                user_id: userId,
                role: selectedRole,
                proposal_id: proposal.id
            }])
            toast.success('Invitation sent with proposal attached!')
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Failed to send invitation')
        } finally {
            setInviting(null)
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-zinc-100">
                            <Dialog.Title as="h3" className="text-lg font-bold text-zinc-900 mb-2">
                                Invite Expert to Proposal
                            </Dialog.Title>
                            <div className="mb-4">
                                <p className="text-sm text-zinc-500">Proposal: <span className="font-semibold">{proposal.title}</span></p>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <label className="text-sm font-bold text-zinc-700">Invite as</label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as any)}
                                    className="px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-zinc-50 focus:bg-white focus:border-yellow-400 text-zinc-900"
                                >
                                    <option value="speaker">Speaker</option>
                                    <option value="sponsor">Sponsor</option>
                                </select>
                            </div>

                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all mb-4 text-zinc-900"
                                placeholder="Search by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {searching && <div className="text-center text-sm text-zinc-400 py-2">Searching...</div>}
                                {!searching && search && results.length === 0 && (
                                    <div className="text-center text-sm text-zinc-400 py-2">No users found.</div>
                                )}
                                {results.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {user.full_name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-sm text-zinc-900">{user.full_name}</div>
                                                <div className="text-xs text-zinc-500">{user.email}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInvite(user.id)}
                                            disabled={inviting === user.id}
                                            className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                        >
                                            {inviting === user.id ? 'Sending...' : 'Invite'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}



function LinkFileToChecklistModal({
    file,
    checklistItems,
    isOpen,
    onClose,
    onSave,
    initialLinks
}: {
    file: EventProposalResponse,
    checklistItems: EventChecklistItemResponse[],
    isOpen: boolean,
    onClose: () => void,
    onSave: (ids: string[]) => void,
    initialLinks: string[]
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialLinks)
    const [search, setSearch] = useState('')

    // Default suggestions based on file
    const [suggestedIds, setSuggestedIds] = useState<string[]>([])

    // On mount, find suggestions
    useEffect(() => {
        const category = file.description?.match(/^\[(\w+)\]/)?.[1] || 'other'
        const fileTitle = (file.title || '').toLowerCase()
        const keywords: Record<string, string[]> = {
            'email': ['email', 'confirmation', 'appreciation', 'invite', 'notification', 'letter'],
            'certificate': ['certificate', 'cert', 'award', 'recognition'],
            'proposal': ['speaker', 'proposal', 'deck', 'presentation', 'sponsor']
        }
        const relevantKeywords = keywords[category] || []

        const suggestions = checklistItems.filter(item => {
            const itemTitle = item.title.toLowerCase()
            return relevantKeywords.some(kw => fileTitle.includes(kw) || itemTitle.includes(kw))
        }).map(i => i.id)

        setSuggestedIds(suggestions)
    }, [file, checklistItems])

    const filteredItems = checklistItems.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase())
    )

    const toggleId = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleSave = () => {
        onSave(selectedIds)
        onClose()
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-zinc-100 flex flex-col max-h-[80vh]">
                            <Dialog.Title as="h3" className="text-lg font-bold text-zinc-900 mb-2">
                                Link File to Checklist
                            </Dialog.Title>
                            <p className="text-sm text-zinc-500 mb-4">
                                Select tasks to link with <span className="font-semibold text-zinc-700">{file.title}</span>.
                            </p>

                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all mb-4 text-zinc-900"
                                placeholder="Search tasks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] mb-4 pr-2">
                                {checklistItems.length === 0 && (
                                    <div className="text-center text-zinc-400 py-8 text-sm">No checklist items found.</div>
                                )}
                                {filteredItems.map(item => {
                                    const isSuggested = suggestedIds.includes(item.id)
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleId(item.id)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedIds.includes(item.id)
                                                ? 'bg-yellow-50 border-yellow-400'
                                                : 'bg-white border-zinc-200 hover:border-zinc-300'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-medium ${selectedIds.includes(item.id) ? 'text-zinc-900' : 'text-zinc-600'}`}>
                                                    {item.title}
                                                </span>
                                                {isSuggested && (
                                                    <span className="text-[10px] uppercase font-bold text-blue-500 mt-0.5">Suggested</span>
                                                )}
                                            </div>
                                            {selectedIds.includes(item.id) && (
                                                <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-zinc-900">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md text-sm"
                                >
                                    Save Links ({selectedIds.length})
                                </button>
                            </div>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

export function DashboardTabProposals({ event }: DashboardTabProposalsProps) {
    const [proposals, setProposals] = useState<EventProposalResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'all' | 'speaker_template' | 'sponsor_template'>('all')

    // Upload State
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [uploadForm, setUploadForm] = useState<EventProposalCreate & { file: File | null; category: string }>({
        title: '',
        description: '',
        file_url: '',
        file: null,
        category: 'proposal' // Default category
    })
    const [uploading, setUploading] = useState(false)

    // Preview State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const [isRestricted, setIsRestricted] = useState(false)

    const fetchProposals = async () => {
        try {
            const data = await getEventProposals(event.id)
            setProposals(data)
            setIsRestricted(false)
        } catch (error: any) {
            if (error.response?.status === 403) {
                setIsRestricted(true)
            } else {
                console.error(error)
                toast.error('Failed to load proposals')
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProposals()
        // Fetch checklist items for linking
        getEventChecklist(event.id)
            .then(data => setChecklistItems(data.sort((a, b) => a.sort_order - b.sort_order)))
            .catch(console.error)
    }, [event.id])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!uploadForm.title || !uploadForm.file) {
            toast.error('Please provide a title and a file')
            return
        }

        setUploading(true)
        try {
            // Store category as prefix in description: [category] actual description
            const categoryPrefix = `[${uploadForm.category}]`
            const fullDescription = uploadForm.description
                ? `${categoryPrefix} ${uploadForm.description}`
                : categoryPrefix

            await createEventProposalWithFile(event.id, {
                title: uploadForm.title,
                description: fullDescription
            }, uploadForm.file)

            toast.success('File uploaded!')
            setIsUploadOpen(false)
            setUploadForm({ title: '', description: '', file_url: '', file: null, category: 'proposal' })
            fetchProposals()
        } catch (error) {
            console.error(error)
            toast.error('Failed to upload file')
        } finally {
            setUploading(false)
        }
    }

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [proposalToDelete, setProposalToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Comments Modal State
    const [selectedProposalForComments, setSelectedProposalForComments] = useState<EventProposalResponse | null>(null)

    // Invite Modal State
    const [selectedProposalForInvite, setSelectedProposalForInvite] = useState<EventProposalResponse | null>(null)

    // Checklist State
    const [checklistItems, setChecklistItems] = useState<EventChecklistItemResponse[]>([])

    // Link to Checklist Modal State
    const [selectedFileForLinking, setSelectedFileForLinking] = useState<EventProposalResponse | null>(null)
    const [selectedChecklistIds, setSelectedChecklistIds] = useState<string[]>([])


    const handleDeleteClick = (id: string) => {
        setProposalToDelete(id)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!proposalToDelete) return
        setIsDeleting(true)
        try {
            await deleteEventProposal(event.id, proposalToDelete)
            setProposals(proposals.filter(p => p.id !== proposalToDelete))
            toast.success('Proposal deleted')
            setIsDeleteModalOpen(false)
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete proposal')
        } finally {
            setIsDeleting(false)
            setProposalToDelete(null)
        }
    }

    // Current User Logic for Chat
    const [currentUser, setCurrentUser] = useState<any>(null)
    useEffect(() => {
        getMe().then(setCurrentUser).catch(console.error)
    }, [])

    // Filter Logic
    const filteredProposals = proposals
    // For now we don't have "type" in proposal, so 'all' is just all uploaded proposals.
    // Templates are static.

    // Category Helper Functions
    const getFileCategory = (description: string | null | undefined): string => {
        if (!description) return 'other'
        const match = description.match(/^\[(\w+)\]/)
        return match ? match[1] : 'other'
    }

    const getCategoryInfo = (category: string) => {
        const categories: Record<string, { icon: string; label: string; color: string }> = {
            proposal: { icon: '📄', label: 'Proposal', color: 'bg-blue-100 text-blue-700' },
            email: { icon: '✉️', label: 'Email Template', color: 'bg-green-100 text-green-700' },
            certificate: { icon: '🏆', label: 'Certificate', color: 'bg-yellow-100 text-yellow-700' },
            other: { icon: '📎', label: 'Document', color: 'bg-zinc-100 text-zinc-700' }
        }
        return categories[category] || categories.other
    }

    // Checklist Linking Logic (localStorage-based for now)
    const LINK_STORAGE_KEY = `event_${event.id}_file_checklist_links`

    const getFileLinks = (fileId: string): string[] => {
        try {
            const stored = localStorage.getItem(LINK_STORAGE_KEY)
            const links: Record<string, string[]> = stored ? JSON.parse(stored) : {}
            return links[fileId] || []
        } catch {
            return []
        }
    }

    const setFileLinks = (fileId: string, checklistIds: string[]) => {
        try {
            const stored = localStorage.getItem(LINK_STORAGE_KEY)
            const links: Record<string, string[]> = stored ? JSON.parse(stored) : {}
            links[fileId] = checklistIds
            localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links))
        } catch (e) {
            console.error('Failed to save file links:', e)
        }
    }

    const getSuggestedChecklistItems = (file: EventProposalResponse, checklistItems: EventChecklistItemResponse[]) => {
        const category = getFileCategory(file.description ?? null)
        const fileTitle = (file.title ?? '').toLowerCase()

        // Keyword matching rules
        const keywords: Record<string, string[]> = {
            'email': ['email', 'confirmation', 'appreciation', 'invite', 'notification'],
            'certificate': ['certificate', 'cert', 'award', 'recognition'],
            'proposal': ['speaker', 'proposal', 'deck', 'presentation', 'sponsor']
        }

        const relevantKeywords = keywords[category] || []

        return checklistItems.filter(item => {
            const itemTitle = item.title.toLowerCase()
            // Match if file title or checklist title contains relevant keywords
            return relevantKeywords.some(kw =>
                fileTitle.includes(kw) || itemTitle.includes(kw)
            )
        })
    }


    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">

            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-2 border-b border-zinc-100 pb-1 overflow-x-auto">
                    {[
                        { key: 'all', label: 'All Proposals' },
                        { key: 'speaker_template', label: 'Speaker Template' },
                        { key: 'sponsor_template', label: 'Sponsor Template' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all border-2 border-transparent ${activeTab === tab.key
                                ? 'bg-yellow-400 text-zinc-900 shadow-md'
                                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => toast('AI Generation Coming Soon!', { icon: '🤖' })}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2 text-xs md:text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        Generate with AI
                    </button>

                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="px-5 py-2.5 bg-zinc-900 text-yellow-400 font-bold rounded-xl shadow-md hover:bg-zinc-800 transition-all flex items-center gap-2 text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload File
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'all' && (
                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                        </div>
                    ) : isRestricted ? (
                        <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-100">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900">Access Restricted</h3>
                            <p className="text-zinc-500 mt-2">Only organizers can view proposals.</p>
                        </div>
                    ) : proposals.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-100">
                            <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900">No Proposals Yet</h3>
                            <p className="text-zinc-500 mt-2">Upload a proposal or generate one to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {proposals.map((item) => {
                                const category = getFileCategory(item.description ?? null)
                                const categoryInfo = getCategoryInfo(category)

                                return (
                                    <div key={item.id} className="group bg-white rounded-3xl border border-zinc-200 overflow-hidden hover:shadow-lg transition-all flex flex-col">
                                        <div className="p-6 flex-1">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center font-bold text-sm">
                                                        PDF
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${categoryInfo.color}`}>
                                                        {categoryInfo.icon} {categoryInfo.label}
                                                    </span>
                                                </div>
                                                {/* Dropdown Menu for Delete? Or just delete button */}
                                                <button
                                                    onClick={() => handleDeleteClick(item.id)}
                                                    className="text-zinc-300 hover:text-red-500 transition-colors"
                                                    title="Delete File"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                            <h3 className="text-lg font-bold text-zinc-900 mb-2 line-clamp-2">{item.title}</h3>
                                            <p className="text-sm text-zinc-500 line-clamp-3 mb-4">{item.description?.replace(/^\[\w+\]\s*/, '') || 'No description'}</p>

                                            {/* Linked Checklist Items */}
                                            {(() => {
                                                const linkedIds = getFileLinks(item.id)
                                                const linkedItems = checklistItems.filter(ci => linkedIds.includes(ci.id))

                                                if (linkedItems.length > 0) {
                                                    return (
                                                        <div className="mb-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                                </svg>
                                                                <span className="text-xs font-bold text-green-700">Linked to Checklist:</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {linkedItems.map(li => (
                                                                    <div key={li.id} className="text-xs text-green-600 flex items-center gap-1.5">
                                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                        <span className="font-medium">{li.title}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            })()}

                                            {/* Meta info */}
                                            <div className="text-xs text-zinc-400">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setPreviewUrl(item.file_url ?? null)}
                                                    className="flex-1 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all text-xs flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedFileForLinking(item)
                                                        setSelectedChecklistIds(getFileLinks(item.id))
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 hover:border-yellow-400 hover:text-yellow-600 transition-all text-xs flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4 text-zinc-400 group-hover:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                    Link
                                                </button>
                                            </div>

                                            {/* Button Logic: Discuss (if chat exists) OR Invite (if organizer upload) */}
                                            {item.conversation_id ? (
                                                <button
                                                    onClick={() => setSelectedProposalForComments(item)}
                                                    className="w-full px-4 py-2 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all text-sm flex items-center justify-center gap-2"
                                                >
                                                    Discuss
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedProposalForInvite(item)}
                                                    className="w-full px-4 py-2 bg-yellow-400 text-zinc-900 font-bold rounded-xl hover:bg-yellow-300 transition-all text-sm flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                                    Invite
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'speaker_template' && (
                <TemplateEditor type="Speaker" initialContent={SPEAKER_TEMPLATE_DEFAULT} />
            )}

            {activeTab === 'sponsor_template' && (
                <TemplateEditor type="Sponsor" initialContent={SPONSOR_TEMPLATE_DEFAULT} />
            )}

            {/* Modals */}
            <Transition appear show={isUploadOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsUploadOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all border border-zinc-100">
                                    <Dialog.Title as="h3" className="text-2xl font-black text-zinc-900 mb-6 font-display">
                                        Upload File
                                    </Dialog.Title>
                                    <form onSubmit={handleUpload} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-700 mb-2">Category</label>
                                            <select
                                                value={uploadForm.category}
                                                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all text-zinc-900"
                                            >
                                                <option value="proposal">📄 Proposal / Speaker Material</option>
                                                <option value="email">✉️ Email Template</option>
                                                <option value="certificate">🏆 Certificate</option>
                                                <option value="other">📎 Other Document</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-700 mb-2">Title</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all text-zinc-900"
                                                placeholder="e.g. Sponsor Deck V1"
                                                value={uploadForm.title ?? ''}
                                                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-700 mb-2">Description</label>
                                            <textarea
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all resize-none h-24 text-zinc-900"
                                                placeholder="Brief description..."
                                                value={uploadForm.description ?? ''}
                                                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-700 mb-2">PDF File</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                                                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                                    className="w-full text-sm text-zinc-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-xl file:border-0
                                                    file:text-sm file:font-bold
                                                    file:bg-yellow-50 file:text-yellow-600
                                                    hover:file:bg-yellow-100
                                                    "
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsUploadOpen(false)}
                                                className="px-6 py-2.5 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={uploading}
                                                className="px-6 py-2.5 bg-yellow-400 text-zinc-900 font-bold rounded-xl hover:bg-yellow-300 transition-all shadow-md shadow-yellow-400/20 disabled:opacity-50"
                                            >
                                                {uploading ? 'Uploading...' : 'Upload'}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Detail/Comment Modal */}
            {selectedProposalForComments && (
                <ProposalDiscussionModal
                    proposal={selectedProposalForComments}
                    isOpen={!!selectedProposalForComments}
                    onClose={() => setSelectedProposalForComments(null)}
                    currentUser={currentUser}
                />
            )}

            {/* Invite Modal */}
            {selectedProposalForInvite && (
                <InviteProposalModal
                    proposal={selectedProposalForInvite}
                    eventId={event.id}
                    isOpen={!!selectedProposalForInvite}
                    onClose={() => setSelectedProposalForInvite(null)}
                />
            )}

            {/* Linking Modal */}
            {selectedFileForLinking && (
                <LinkFileToChecklistModal
                    file={selectedFileForLinking}
                    checklistItems={checklistItems}
                    isOpen={!!selectedFileForLinking}
                    onClose={() => {
                        setSelectedFileForLinking(null)
                        setSelectedChecklistIds([])
                    }}
                    initialLinks={selectedChecklistIds}
                    onSave={(ids) => {
                        if (selectedFileForLinking) {
                            setFileLinks(selectedFileForLinking.id, ids)
                            toast.success('Links updated!')
                            // Force re-render of component to show new links (or local update)
                            // Since getFileLinks reads from localStorage, we might need to trigger update.
                            // But React component might not re-render just from localStorage set.
                            // We can use a dummy state to force update or just setState in parent.
                            // For now simple alert:
                            setProposals([...proposals]) // Quick hack to trigger re-render of list
                        }
                    }}
                />
            )}



            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Proposal"
                message="Are you sure you want to delete this proposal? This action cannot be undone."
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                variant="danger"
            />

            {/* PDF Preview Modal */}
            <Transition appear show={!!previewUrl} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setPreviewUrl(null)}>
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-5xl h-[85vh] transform overflow-hidden rounded-2xl bg-zinc-900 p-1 shadow-2xl transition-all">
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center p-4">
                                        <h3 className="text-white font-bold">Preview</h3>
                                        <button onClick={() => setPreviewUrl(null)} className="text-zinc-400 hover:text-white">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="flex-1 w-full bg-zinc-900 flex items-center justify-center p-4">
                                        {(() => {
                                            if (!previewUrl) return null

                                            // Simple extension check
                                            const ext = previewUrl.split('.').pop()?.toLowerCase()
                                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
                                            const isOffice = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext || '')

                                            if (isImage) {
                                                return (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                                                )
                                            }

                                            if (isOffice) {
                                                return (
                                                    <iframe
                                                        src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                                                        className="w-full h-full bg-white rounded-xl"
                                                        title="Document Preview"
                                                    />
                                                )
                                            }

                                            // Default to iframe for PDF or browser supported types
                                            return (
                                                <iframe
                                                    src={previewUrl}
                                                    className="w-full h-full bg-white rounded-xl"
                                                    title="File Preview"
                                                />
                                            )
                                        })()}
                                    </div>
                                    <div className="p-4 flex justify-between items-center bg-zinc-800 border-t border-zinc-700">
                                        <span className="text-zinc-400 text-sm truncate max-w-md">{previewUrl}</span>
                                        <a
                                            href={previewUrl || '#'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-yellow-400 text-zinc-900 font-bold rounded-xl hover:bg-yellow-300 text-sm"
                                        >
                                            Download / Open Original
                                        </a>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    )
}

