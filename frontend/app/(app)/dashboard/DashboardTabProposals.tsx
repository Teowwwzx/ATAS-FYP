import React, { useState, useEffect, Fragment } from 'react'
import { EventDetails, EventProposalResponse, EventProposalCreate } from '@/services/api.types'
import { getEventProposals, createEventProposalWithFile, deleteEventProposal, getProposalComments, createProposalComment } from '@/services/api'
import { toast } from 'react-hot-toast'
import { Dialog, Transition } from '@headlessui/react'

import { ConfirmationModal } from '@/components/ui/ConfirmationModal'

import { EventProposalCommentResponse } from '@/services/api.types'

interface DashboardTabProposalsProps {
    event: EventDetails
}

function ProposalCommentsModal({ proposalId, isOpen, onClose, proposalTitle }: { proposalId: string, isOpen: boolean, onClose: () => void, proposalTitle: string }) {
    const [comments, setComments] = useState<EventProposalCommentResponse[]>([])
    const [newComment, setNewComment] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        if (isOpen && proposalId) {
            setLoading(true)
            getProposalComments(proposalId)
                .then(setComments)
                .catch(err => toast.error("Failed to load comments"))
                .finally(() => setLoading(false))
        }
    }, [isOpen, proposalId])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComment.trim()) return
        setSending(true)
        try {
            const comment = await createProposalComment(proposalId, newComment)
            setComments([...comments, comment])
            setNewComment('')
        } catch (error) {
            toast.error("Failed to send comment")
        } finally {
            setSending(false)
        }
    }

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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[2rem] bg-white p-6 shadow-xl transition-all border border-zinc-100 flex flex-col h-[80vh]">
                                <Dialog.Title as="h3" className="text-xl font-black text-zinc-900 mb-4 flex justify-between items-center">
                                    <span>Discussion: <span className="text-zinc-500 font-normal">{proposalTitle}</span></span>
                                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </Dialog.Title>

                                <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-zinc-50 rounded-xl mb-4 custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div></div>
                                    ) : comments.length === 0 ? (
                                        <p className="text-center text-zinc-400 py-8">No comments yet. Start the discussion!</p>
                                    ) : (
                                        comments.map(c => (
                                            <div key={c.id} className="flex gap-3 animate-fadeIn">
                                                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700 flex-shrink-0">
                                                    {c.user_id.slice(0, 2)}
                                                </div>
                                                <div className="bg-white p-3 rounded-xl shadow-sm border border-zinc-100 max-w-[80%]">
                                                    <p className="text-zinc-800 text-sm whitespace-pre-wrap">{c.content}</p>
                                                    <p className="text-xs text-zinc-400 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleSend} className="relative">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Type a comment..."
                                        className="w-full pl-4 pr-32 py-3 rounded-xl border border-zinc-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all font-medium"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || sending}
                                        className="absolute right-2 top-2 bottom-2 px-4 bg-zinc-900 text-yellow-400 rounded-lg font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors text-sm"
                                    >
                                        {sending ? 'Sending...' : 'Send'}
                                    </button>
                                </form>
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
                className="w-full h-[400px] p-4 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 font-mono text-sm leading-relaxed resize-none"
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

export function DashboardTabProposals({ event }: DashboardTabProposalsProps) {
    const [proposals, setProposals] = useState<EventProposalResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'all' | 'speaker_template' | 'sponsor_template'>('all')

    // Upload State
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [uploadForm, setUploadForm] = useState<EventProposalCreate & { file: File | null }>({
        title: '',
        description: '',
        file_url: '',
        file: null
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
    }, [event.id])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!uploadForm.title || !uploadForm.file) {
            toast.error('Please provide a title and a file')
            return
        }

        setUploading(true)
        try {
            await createEventProposalWithFile(event.id, {
                title: uploadForm.title,
                description: uploadForm.description
            }, uploadForm.file)

            toast.success('Proposal uploaded!')
            setIsUploadOpen(false)
            setUploadForm({ title: '', description: '', file_url: '', file: null })
            fetchProposals()
        } catch (error) {
            console.error(error)
            toast.error('Failed to upload proposal')
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
                        Upload Proposal
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'all' && (
                loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                    </div>
                ) : isRestricted ? (
                    <div className="bg-zinc-50 rounded-[2rem] p-12 text-center border border-zinc-100 flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-400">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900">Access Restricted</h3>
                            <p className="text-zinc-500">Only organizers, committee members, and speakers can view proposals.</p>
                        </div>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="bg-zinc-50 rounded-[2rem] p-12 text-center border border-zinc-100 flex flex-col items-center justify-center">
                        <p className="text-zinc-400 font-medium mb-4">No proposals found.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm animate-fadeIn">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Proposal</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Description</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {proposals.map(proposal => (
                                    <tr key={proposal.id} className="hover:bg-zinc-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                                    {proposal.file_url?.endsWith('.pdf') ? 'PDF' : 'DOC'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-zinc-900 line-clamp-1 max-w-[200px]" title={proposal.title || ''}>{proposal.title}</div>
                                                    <div className="text-xs text-zinc-400 md:hidden line-clamp-1">{proposal.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <p className="text-sm text-zinc-600 line-clamp-2 max-w-sm" title={proposal.description || ''}>
                                                {proposal.description || '-'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setPreviewUrl(proposal.file_url || null)}
                                                    className="text-sm font-bold text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    onClick={() => setSelectedProposalForComments(proposal)}
                                                    className="text-sm font-bold text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                    Discuss
                                                </button>
                                                <a
                                                    href={proposal.file_url || '#'}
                                                    download
                                                    target="_blank"
                                                    className="text-sm font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                >
                                                    Download
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteClick(proposal.id)}
                                                    className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {activeTab === 'speaker_template' && (
                <TemplateEditor type="Speaker" initialContent={SPEAKER_TEMPLATE_DEFAULT} />
            )}

            {activeTab === 'sponsor_template' && (
                <TemplateEditor type="Sponsor" initialContent={SPONSOR_TEMPLATE_DEFAULT} />
            )}

            {/* Upload Modal (Same as before) */}
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
                                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-white p-8 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-2xl font-black text-zinc-900 mb-6">
                                        Upload Proposal
                                    </Dialog.Title>

                                    <form onSubmit={handleUpload} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={uploadForm.title || ''}
                                                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 font-bold"
                                                placeholder="e.g. Sponsorship Deck 2025"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                                            <textarea
                                                value={uploadForm.description || ''}
                                                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                                className="block w-full rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4"
                                                rows={3}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">File (PDF/Image)</label>
                                            <input
                                                type="file"
                                                required
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                                className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                                            />
                                        </div>

                                        <div className="pt-4 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsUploadOpen(false)}
                                                className="px-5 py-2.5 rounded-xl text-zinc-500 font-bold hover:bg-zinc-100"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={uploading}
                                                className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
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

            {/* Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
                    <button
                        className="absolute top-4 right-4 text-white hover:text-yellow-400"
                        onClick={() => setPreviewUrl(null)}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="w-full max-w-5xl h-[85vh] bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <iframe src={previewUrl} className="w-full h-full" />
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Proposal"
                message="Are you sure you want to delete this proposal? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Comments Modal */}
            {selectedProposalForComments && (
                <ProposalCommentsModal
                    isOpen={!!selectedProposalForComments}
                    onClose={() => setSelectedProposalForComments(null)}
                    proposalId={selectedProposalForComments.id}
                    proposalTitle={selectedProposalForComments.title || 'Untitled'}
                />
            )}
        </div>
    )
}
