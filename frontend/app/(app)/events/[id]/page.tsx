'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'react-hot-toast'
import { useParams } from 'next/navigation'
import {
    getEventById,
    joinPublicEvent,
    leaveEvent,
    getEventParticipants,
    getMyProfile,
    updateEvent,
    updateEventCover,
    findProfiles,
    inviteEventParticipant,
    getProfileByUserId,
    getMyEventHistory,
    publishEvent,
    unpublishEvent,
    openRegistration,
    closeRegistration,
    getEventChecklist,
    createEventChecklistItem,
    updateEventChecklistItem,
    getEventProposals,
    createEventProposal,
    deleteEventProposal,
} from '@/services/api'
import {
    EventDetails,
    EventParticipantDetails,
    ProfileResponse,
    EventCreate,
    EventParticipantRole,
    EventFormat,
    EventType,
    EventRegistrationType,
    EventVisibility,
    EventChecklistItemResponse,
    EventProposalResponse,
    EventProposalCreate
} from '@/services/api.types'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'

export default function EventDetailsPage() {
    const params = useParams()
    const id = params.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [joinOpen, setJoinOpen] = useState(false)
    const [participants, setParticipants] = useState<EventParticipantDetails[]>([])
    const [currentUser, setCurrentUser] = useState<ProfileResponse | null>(null)

    const [editOpen, setEditOpen] = useState(false)
    const [editData, setEditData] = useState<Partial<EventCreate>>({})
    const [uploadingCover, setUploadingCover] = useState(false)
    const [inviteRole, setInviteRole] = useState<EventParticipantRole>('speaker')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<ProfileResponse[]>([])
    const [searching, setSearching] = useState(false)
    const [profileMap, setProfileMap] = useState<Record<string, ProfileResponse>>({})
    const [organizerHistoryMatch, setOrganizerHistoryMatch] = useState(false)

    const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'proposals' | 'checklist' | 'manage'>('overview')
    const [previewTab, setPreviewTab] = useState<'overview' | 'participants' | 'proposals' | 'checklist' | 'manage'>('overview')
    const [previewOpen, setPreviewOpen] = useState(false)

    // New State for Checklist & Proposals
    const [checklistItems, setChecklistItems] = useState<EventChecklistItemResponse[]>([])
    const [proposals, setProposals] = useState<EventProposalResponse[]>([])
    const [proposalOpen, setProposalOpen] = useState(false)
    const [proposalData, setProposalData] = useState<EventProposalCreate>({ title: '', description: '' })
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
    const [deleteProposalId, setDeleteProposalId] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        try {
            const [eventData, participantsData, userData] = await Promise.all([
                getEventById(id),
                getEventParticipants(id).catch(() => []), // Ignore error if not allowed
                getMyProfile().catch(() => null),
            ])
            setEvent(eventData)
            setParticipants(participantsData)
            try {
                const mineOrganized = await getMyEventHistory('organized')
                setOrganizerHistoryMatch(!!mineOrganized.find(e => e.id === eventData.id))
            } catch { }
            try {
                const ids = Array.from(new Set(participantsData.map(p => p.user_id)))
                const map: Record<string, ProfileResponse> = {}
                await Promise.all(ids.map(async (uid) => {
                    try {
                        const prof = await getProfileByUserId(uid)
                        map[uid] = prof
                    } catch { }
                }))
                setProfileMap(map)
            } catch { }
            setCurrentUser(userData)
        } catch (error: unknown) {
            console.error('Failed to load event details', error)
            const e = error as { response?: { status?: number } }
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('atas_token')
                window.location.href = '/login'
            }
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        if (id) {
            loadData()
        }
    }, [id, loadData])

    const isParticipant = participants.some((p) => p.user_id === currentUser?.user_id)

    const isOrganizer = useMemo(() => {
        if (!event || !currentUser) return false
        return (
            participants.some((p) => p.user_id === currentUser.user_id && p.role === 'organizer') ||
            event.organizer_id === currentUser.user_id ||
            organizerHistoryMatch
        )
    }, [participants, event, currentUser, organizerHistoryMatch])

    // Fetch Checklist
    useEffect(() => {
        if ((activeTab === 'checklist' || previewTab === 'checklist') && id) {
            getEventChecklist(id).then(async (items) => {
                if (items.length === 0 && isOrganizer) {
                    // Initialize hardcoded items
                    const defaults = [
                        { title: 'Pre-Event: Define Objectives' },
                        { title: 'Pre-Event: Secure Venue' },
                        { title: 'Pre-Event: Invite Speakers' },
                        { title: 'Execution: Setup AV' },
                        { title: 'Execution: Registration Desk' },
                        { title: 'Post-Event: Send Thank You Emails' },
                    ]
                    const created = []
                    for (const d of defaults) {
                        try {
                            created.push(await createEventChecklistItem(id, d))
                        } catch { }
                    }
                    setChecklistItems(created)
                } else {
                    setChecklistItems(items)
                }
            }).catch(() => setChecklistItems([]))
        }
    }, [activeTab, previewTab, id, isOrganizer])

    // Fetch Proposals
    useEffect(() => {
        if ((activeTab === 'proposals' || previewTab === 'proposals') && id) {
            getEventProposals(id).then(setProposals).catch(() => setProposals([]))
        }
    }, [activeTab, previewTab, id])

    const confirmJoin = async () => {
        setJoining(true)
        try {
            await joinPublicEvent(id)
            await loadData()
            setJoinOpen(false)
        } catch (error: unknown) {
            const e = error as { response?: { status?: number; data?: { detail?: string } } }
            if (e.response?.status === 401) {
                localStorage.removeItem('atas_token')
                window.location.href = '/login'
                return
            }
            toast.error(e.response?.data?.detail || 'Failed to join event')
        } finally {
            setJoining(false)
        }
    }

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this event?')) return
        setJoining(true)
        try {
            await leaveEvent(id)
            await loadData()
            toast.success('You have left the event.')
        } catch (error: unknown) {
            console.error('Failed to leave event', error)
            const e = error as { response?: { status?: number; data?: { detail?: string } } }
            if (e.response?.status === 401) {
                localStorage.removeItem('atas_token')
                window.location.href = '/login'
                return
            }
            if (e.response?.status === 403) {
                toast.error('Organizers cannot leave their own event')
            } else {
                toast.error(e.response?.data?.detail || 'Failed to leave event')
            }
        } finally {
            setJoining(false)
        }
    }

    const toggleChecklist = async (item: EventChecklistItemResponse) => {
        try {
            const updated = await updateEventChecklistItem(id, item.id, { is_completed: !item.is_completed })
            setChecklistItems(prev => prev.map(i => i.id === item.id ? updated : i))
        } catch {
            toast.error('Failed to update item')
        }
    }

    const handleCreateProposal = async () => {
        try {
            await createEventProposal(id, proposalData)
            setProposalOpen(false)
            setProposalData({ title: '', description: '' })
            const fresh = await getEventProposals(id)
            setProposals(fresh)
            toast.success('Proposal submitted')
        } catch (error: unknown) {
            toast.error('Failed to submit proposal')
        }
    }

    const canEditInvite = useMemo(() => {
        if (!event || !currentUser) return false
        const mine = participants.find(p => p.user_id === currentUser.user_id)
        return isOrganizer || (mine?.role === 'committee')
    }, [event, currentUser, participants, isOrganizer])

    const canJoin = useMemo(() => {
        if (!event || !currentUser) return false
        if (isParticipant) return false
        const now = new Date()
        const start = new Date(event.start_datetime)
        return event.status === 'published' && event.registration_status === 'opened' && now < start
    }, [event, currentUser, isParticipant])

    if (loading) {
        return <div className="p-8 text-center">Loading event...</div>
    }

    if (!event) {
        return <div className="p-8 text-center">Event not found.</div>
    }

    const renderEventView = (isPreview: boolean) => {
        const currentTab = isPreview ? previewTab : activeTab
        const setTab = isPreview ? setPreviewTab : setActiveTab
        const showOrganizerControls = !isPreview && (isOrganizer || canEditInvite)

        return (
            <div className="bg-white shadow-sm overflow-hidden rounded-[2.5rem] border border-yellow-100">
                {/* Cover Image */}
                <div className="group relative h-72 sm:h-96 w-full bg-zinc-100">
                    {event.cover_url ? (
                        <img
                            src={event.cover_url}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                            <h1 className="text-6xl sm:text-8xl font-black text-zinc-900 opacity-10 select-none tracking-tighter">
                                {event.title}
                            </h1>
                        </div>
                    )}

                    {/* Hover Overlay for Cover Edit */}
                    {canEditInvite && !isPreview && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center z-10">
                            <label className="cursor-pointer opacity-0 group-hover:opacity-100 bg-white text-zinc-900 px-6 py-3 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span>{uploadingCover ? 'Uploading...' : 'Change Cover'}</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setUploadingCover(true); try { const updated = await updateEventCover(event.id, file); setEvent(updated); toast.success('Cover updated'); } catch (error: unknown) { const er = error as { response?: { data?: { detail?: string } } }; toast.error(er?.response?.data?.detail || 'Failed to update cover'); } finally { setUploadingCover(false); } }}
                                    disabled={uploadingCover}
                                />
                            </label>
                        </div>
                    )}

                    <div className="absolute top-6 right-6 flex gap-3 z-20">
                        <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold text-zinc-900 shadow-sm uppercase tracking-wide">
                            {event.type}
                        </span>
                        <span className="bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold text-yellow-400 shadow-sm uppercase tracking-wide">
                            {event.format.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                {/* Header Info */}
                <div className="px-6 py-8 sm:px-10 flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-zinc-100">
                    <div className="flex-1">
                        <h3 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight leading-tight mb-2">
                            {event.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-zinc-600 font-medium mt-4">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(event.start_datetime).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {event.venue_remark || 'TBA'}
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {!isPreview && isOrganizer ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewOpen(true)}
                                    className="inline-flex items-center px-6 py-3 border-2 border-zinc-200 bg-white text-zinc-900 font-bold rounded-full shadow-sm transition-all duration-200 hover:bg-zinc-50"
                                >
                                    Live Preview
                                </button>
                            </div>
                        ) : isParticipant ? (
                            <button
                                onClick={() => setLeaveConfirmOpen(true)}
                                disabled={joining}
                                className="inline-flex items-center px-6 py-3 border-2 border-red-100 shadow-sm text-sm font-bold rounded-full text-red-600 bg-white hover:bg-red-50 hover:border-red-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                {joining ? 'Processing...' : 'Leave Event'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setJoinOpen(true)}
                                disabled={joining || !canJoin}
                                className={`inline-flex items-center px-8 py-4 border border-transparent shadow-lg text-base font-bold rounded-full transition-all duration-200 transform hover:scale-105 ${canJoin
                                    ? 'bg-yellow-400 text-zinc-900 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400'
                                    : 'bg-zinc-200 text-zinc-500 cursor-not-allowed shadow-none'
                                    }`}
                            >
                                {joining ? 'Joining...' : canJoin ? 'Join Event Now' : 'Event Closed'}
                            </button>
                        )}
                        {event.registration_type === 'free' && (
                            <div className="mt-2 text-right">
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-bold">Free</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-zinc-100 px-6 sm:px-10 overflow-x-auto">
                    <button
                        onClick={() => setTab('overview')}
                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${currentTab === 'overview' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setTab('participants')}
                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${currentTab === 'participants' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Participants
                        <span className="ml-2 bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full text-xs">{participants.length}</span>
                    </button>
                    {(isOrganizer || participants.some(p => p.user_id === currentUser?.user_id && (p.role === 'committee' || p.role === 'speaker'))) && (
                        <button
                            onClick={() => setTab('proposals')}
                            className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${currentTab === 'proposals' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Proposals
                        </button>
                    )}
                    {(isOrganizer || participants.some(p => p.user_id === currentUser?.user_id && p.role === 'committee')) && (
                        <button
                            onClick={() => setTab('checklist')}
                            className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${currentTab === 'checklist' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Checklist
                        </button>
                    )}
                    {showOrganizerControls && (
                        <button
                            onClick={() => setTab('manage')}
                            className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${currentTab === 'manage' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Manage
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="px-6 py-8 sm:px-10 bg-zinc-50/50 min-h-[400px]">
                    {currentTab === 'overview' && (
                        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-8">
                                <div>
                                    <h4 className="text-lg font-black text-zinc-900 mb-4">About Event</h4>
                                    <div className="prose prose-yellow text-zinc-900 max-w-none whitespace-pre-wrap font-medium leading-relaxed">
                                        {event.description || 'No description available.'}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                                    <h4 className="text-lg font-black text-zinc-900 mb-4">Registration</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Status</span>
                                            <span className="font-bold text-zinc-900 uppercase">{event.registration_status}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Visibility</span>
                                            <span className="font-bold text-zinc-900 uppercase">{event.visibility}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Type</span>
                                            <span className="font-bold text-zinc-900 uppercase">{event.registration_type}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentTab === 'participants' && (
                        <div className="space-y-8">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-black text-zinc-900">All Participants</h4>
                                    {canEditInvite && !isPreview && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search profiles..." className="px-4 py-2 rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium text-sm w-40 sm:w-64" />
                                            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as EventParticipantRole)} className="px-4 py-2 rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium text-sm">
                                                <option value="speaker">Speaker</option>
                                                <option value="committee">Committee</option>
                                                <option value="student">Student</option>
                                            </select>
                                            <button onClick={async () => { setSearching(true); try { const res = await findProfiles({ name: searchQuery }); setSearchResults(res); } catch { setSearchResults([]) } finally { setSearching(false) } }} disabled={searching} className="px-4 py-2 rounded-xl bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed">{searching ? '...' : 'Search'}</button>
                                        </div>
                                    )}
                                </div>

                                {/* Search Results */}
                                {canEditInvite && !isPreview && searchResults.length > 0 && (
                                    <div className="mb-8 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                                        <h5 className="text-sm font-bold text-zinc-900 mb-3">Search Results</h5>
                                        <div className="space-y-2">
                                            {searchResults.slice(0, 5).map(r => (
                                                <div key={r.id} className="flex items-center justify-between text-sm bg-white p-3 rounded-xl shadow-sm">
                                                    <span className="font-medium text-zinc-900">{r.full_name}</span>
                                                    <button onClick={async () => { try { await inviteEventParticipant(event.id, { user_id: r.user_id, role: inviteRole }); await loadData(); toast.success('Invitation sent') } catch (error: unknown) { const er = error as { response?: { data?: { detail?: string } } }; toast.error(er?.response?.data?.detail || 'Failed to invite') } }} className="px-3 py-1.5 rounded-lg bg-yellow-400 text-zinc-900 font-bold text-xs hover:bg-yellow-300">Invite as {inviteRole}</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Speakers</h5>
                                            {canEditInvite && !isPreview && (
                                                <button onClick={() => { setInviteRole('speaker'); (document.querySelector('input[placeholder="Search profiles..."]') as HTMLElement)?.focus() }} className="text-xs font-bold text-yellow-600 hover:text-yellow-700">+ Invite Speaker</button>
                                            )}
                                        </div>
                                        <ul className="space-y-2">
                                            {participants.filter(p => p.role === 'speaker').map(p => (
                                                <li key={p.id} className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl">
                                                    {profileMap[p.user_id]?.avatar_url ? (
                                                        <img src={profileMap[p.user_id]?.avatar_url || ''} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                                                            {profileMap[p.user_id]?.full_name?.charAt(0) || 'S'}
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-zinc-900">{profileMap[p.user_id]?.full_name || p.user_id}</span>
                                                </li>
                                            ))}
                                            {participants.filter(p => p.role === 'speaker').length === 0 && (<li className="text-sm text-zinc-400 italic">No speakers assigned</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Committee</h5>
                                        <ul className="space-y-2">
                                            {participants.filter(p => p.role === 'committee').map(p => (
                                                <li key={p.id} className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl">
                                                    {profileMap[p.user_id]?.avatar_url ? (
                                                        <img src={profileMap[p.user_id]?.avatar_url || ''} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                                                            {profileMap[p.user_id]?.full_name?.charAt(0) || 'C'}
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-zinc-900">{profileMap[p.user_id]?.full_name || p.user_id}</span>
                                                </li>
                                            ))}
                                            {participants.filter(p => p.role === 'committee').length === 0 && (<li className="text-sm text-zinc-400 italic">No committee members</li>)}
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <h5 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Students / Attendees</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {participants.filter(p => p.role === 'student' || p.role === 'organizer').map(p => (
                                            <div key={p.id} className="flex items-center gap-2 bg-zinc-50 pl-2 pr-4 py-2 rounded-full border border-zinc-100">
                                                {profileMap[p.user_id]?.avatar_url ? (
                                                    <img src={profileMap[p.user_id]?.avatar_url || ''} alt="avatar" className="h-6 w-6 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 text-xs font-bold">
                                                        {profileMap[p.user_id]?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                                <span className="text-sm text-zinc-700">{profileMap[p.user_id]?.full_name || 'User'}</span>
                                                {p.role === 'organizer' && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">ORG</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentTab === 'proposals' && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-lg font-black text-zinc-900">Proposals</h4>
                                <button onClick={() => { setProposalData({ title: event.title, description: event.description || '' }); setProposalOpen(true) }} className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-xl font-bold hover:bg-yellow-300 text-sm">
                                    + New Proposal
                                </button>
                            </div>
                            {proposals.length === 0 ? (
                                <div className="text-center py-12 text-zinc-500">No proposals yet.</div>
                            ) : (
                                <div className="space-y-4">
                                    {proposals.map(p => (
                                        <div key={p.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex justify-between items-start">
                                            <div>
                                                <h5 className="font-bold text-zinc-900">{p.title}</h5>
                                                <p className="text-sm text-zinc-600 mt-1">{p.description}</p>
                                                <div className="text-xs text-zinc-400 mt-2">Created {new Date(p.created_at).toLocaleDateString()}</div>
                                            </div>
                                            {isOrganizer && (
                                                <button onClick={() => setDeleteProposalId(p.id)} className="text-red-500 text-xs font-bold hover:underline">Delete</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {currentTab === 'checklist' && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                            <h4 className="text-lg font-black text-zinc-900 mb-6">Committee Checklist</h4>
                            <div className="space-y-2">
                                {checklistItems.map(item => (
                                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${item.is_completed ? 'bg-green-50' : 'bg-zinc-50'}`}>
                                        <input
                                            type="checkbox"
                                            checked={item.is_completed}
                                            onChange={() => toggleChecklist(item)}
                                            className="w-5 h-5 rounded border-zinc-300 text-yellow-400 focus:ring-yellow-400"
                                        />
                                        <span className={`font-medium ${item.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{item.title}</span>
                                    </div>
                                ))}
                                {checklistItems.length === 0 && <div className="text-center py-8 text-zinc-500">No checklist items.</div>}
                            </div>
                        </div>
                    )}

                    {currentTab === 'manage' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                                <h4 className="text-lg font-black text-zinc-900 mb-4">Event Settings</h4>
                                {isOrganizer && (
                                    <button
                                        onClick={() => { setEditOpen(true); setEditData({ title: event.title, description: event.description || '', start_datetime: new Date(event.start_datetime).toISOString(), end_datetime: new Date(event.end_datetime).toISOString(), registration_type: event.registration_type, visibility: event.visibility, format: event.format, type: event.type, venue_remark: event.venue_remark || '' }) }}
                                        className="w-full sm:w-auto px-8 py-3 bg-yellow-400 text-zinc-900 rounded-xl shadow-lg font-bold hover:bg-yellow-300 hover:scale-105 transition-all duration-200"
                                    >
                                        Edit Event Details
                                    </button>
                                )}
                            </div>

                            <LifecycleControls event={event} isOrganizer={isOrganizer} onUpdated={setEvent} />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            {renderEventView(false)}

            <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[90vh] bg-zinc-50 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-100">
                            <Dialog.Title className="text-lg font-black text-zinc-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                Live Preview
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="p-2 rounded-full hover:bg-zinc-100 transition-colors">
                                    <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </Dialog.Close>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-5xl mx-auto">
                                {renderEventView(true)}
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={joinOpen} onOpenChange={setJoinOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40" onClick={() => setJoinOpen(false)} />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-xl z-50">
                        <Dialog.Title className="text-lg font-black text-zinc-900">Join Event</Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm text-zinc-600">Confirm joining this event.</Dialog.Description>
                        <div className="mt-4 flex justify-end gap-2">
                            <Dialog.Close asChild>
                                <button className="px-3 py-2 rounded border">Cancel</button>
                            </Dialog.Close>
                            <button onClick={confirmJoin} disabled={joining} className="px-3 py-2 rounded bg-yellow-400 text-zinc-900 font-bold">Confirm</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl rounded-2xl bg-white p-6 shadow-xl z-50">
                        <Dialog.Title className="text-lg font-black text-zinc-900">Edit Event</Dialog.Title>
                        <div className="mt-4 space-y-3">
                            <input name="title" value={editData.title || ''} onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))} placeholder="Title" className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200" />
                            <textarea name="description" value={editData.description || ''} onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200" rows={3} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input type="datetime-local" name="start_datetime" value={(editData.start_datetime || '').replace('Z', '')} onChange={(e) => setEditData(prev => ({ ...prev, start_datetime: e.target.value }))} className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200" />
                                <input type="datetime-local" name="end_datetime" value={(editData.end_datetime || '').replace('Z', '')} onChange={(e) => setEditData(prev => ({ ...prev, end_datetime: e.target.value }))} className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <select name="format" value={editData.format || event.format} onChange={(e) => setEditData(prev => ({ ...prev, format: e.target.value as EventFormat }))} className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200">
                                    <option value="workshop">Workshop</option>
                                    <option value="seminar">Seminar</option>
                                    <option value="webinar">Webinar</option>
                                    <option value="panel_discussion">Panel Discussion</option>
                                    <option value="club_event">Club Event</option>
                                    <option value="other">Other</option>
                                </select>
                                <select name="type" value={editData.type || event.type} onChange={(e) => setEditData(prev => ({ ...prev, type: e.target.value as EventType }))} className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200">
                                    <option value="offline">Offline</option>
                                    <option value="online">Online</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <select name="registration_type" value={editData.registration_type || event.registration_type} onChange={(e) => setEditData(prev => ({ ...prev, registration_type: e.target.value as EventRegistrationType }))} className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200">
                                    <option value="free">Free</option>
                                    <option value="paid">Paid</option>
                                </select>
                                <select name="visibility" value={editData.visibility || event.visibility} onChange={(e) => setEditData(prev => ({ ...prev, visibility: e.target.value as EventVisibility }))} className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200">
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                            <input name="venue_remark" value={editData.venue_remark || ''} onChange={(e) => setEditData(prev => ({ ...prev, venue_remark: e.target.value }))} placeholder="Venue remark" className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3 transition-all duration-200" />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Dialog.Close asChild>
                                <button className="px-3 py-2 rounded border">Cancel</button>
                            </Dialog.Close>
                            <button onClick={async () => { try { const updated = await updateEvent(event.id, editData); setEvent(updated); setEditOpen(false); toast.success('Event updated') } catch (error: unknown) { const er = error as { response?: { data?: { detail?: string } } }; toast.error(er?.response?.data?.detail || 'Failed to update event') } }} className="px-3 py-2 rounded bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300">Save Changes</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={proposalOpen} onOpenChange={setProposalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40" onClick={() => setProposalOpen(false)} />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg rounded-2xl bg-white p-6 shadow-xl z-50">
                        <Dialog.Title className="text-lg font-black text-zinc-900">New Proposal</Dialog.Title>
                        <div className="mt-4 space-y-3">
                            <input
                                value={proposalData.title || ''}
                                onChange={(e) => setProposalData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Proposal Title"
                                className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3"
                            />
                            <textarea
                                value={proposalData.description || ''}
                                onChange={(e) => setProposalData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Proposal Description"
                                className="w-full rounded-xl bg-zinc-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium px-4 py-3"
                                rows={4}
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Dialog.Close asChild>
                                <button className="px-3 py-2 rounded border">Cancel</button>
                            </Dialog.Close>
                            <button onClick={handleCreateProposal} className="px-3 py-2 rounded bg-yellow-400 text-zinc-900 font-bold hover:bg-yellow-300">Submit Proposal</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <ConfirmationModal
                isOpen={leaveConfirmOpen}
                onClose={() => setLeaveConfirmOpen(false)}
                onConfirm={async () => { setLeaveConfirmOpen(false); await handleLeave() }}
                title="Leave Event"
                message="Are you sure you want to leave this event?"
                confirmText="Leave"
                cancelText="Cancel"
                variant="danger"
            />
            <ConfirmationModal
                isOpen={!!deleteProposalId}
                onClose={() => setDeleteProposalId(null)}
                onConfirm={async () => { if (deleteProposalId) { await deleteEventProposal(id, deleteProposalId); setProposals(prev => prev.filter(x => x.id !== deleteProposalId)); toast.success('Deleted'); } setDeleteProposalId(null) }}
                title="Delete Proposal"
                message="Delete proposal?"
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    )
}

// Lifecycle controls below main content
export function LifecycleControls({
    event,
    isOrganizer,
    onUpdated,
}: {
    event: EventDetails
    isOrganizer: boolean
    onUpdated: (e: EventDetails) => void
}) {
    const [actionLoading, setActionLoading] = useState(false)

    const handleLifecycle = async (action: 'publish' | 'unpublish' | 'open' | 'close') => {
        if (!isOrganizer) return
        setActionLoading(true)
        try {
            let updated: EventDetails
            if (action === 'publish') updated = await publishEvent(event.id)
            else if (action === 'unpublish') updated = await unpublishEvent(event.id)
            else if (action === 'open') updated = await openRegistration(event.id)
            else updated = await closeRegistration(event.id)
            onUpdated(updated)
            toast.success(`Event ${action}ed successfully`)
        } catch (error: unknown) {
            const e = error as { response?: { data?: { detail?: string } } }
            toast.error(e?.response?.data?.detail || 'Action failed')
        } finally {
            setActionLoading(false)
        }
    }

    if (!isOrganizer) return null

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-4">
            <div className="font-black text-zinc-900">Lifecycle Controls</div>
            <div className="flex flex-wrap gap-2">
                <button onClick={() => handleLifecycle('publish')} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-900 font-bold hover:bg-zinc-50">Publish</button>
                <button onClick={() => handleLifecycle('unpublish')} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-900 font-bold hover:bg-zinc-50">Unpublish</button>
                <button onClick={() => handleLifecycle('open')} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-900 font-bold hover:bg-zinc-50">Open Registration</button>
                <button onClick={() => handleLifecycle('close')} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-900 font-bold hover:bg-zinc-50">Close Registration</button>
            </div>
        </div>
    )
}
