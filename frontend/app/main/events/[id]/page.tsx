"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getEventById, getEventParticipants, joinPublicEvent, leaveEvent, setEventReminder, inviteEventParticipant, updateEventParticipantRole, removeEventParticipant, findProfiles, createEventProposal, createEventProposalWithFile, updateEventLogo, updateEventCover, updateEvent, getProfileByUserId, openRegistration, closeRegistration, publishEvent, unpublishEvent, endEvent, respondInvitationMe, updateEventParticipantStatus, generateAttendanceQR, getAttendanceQRPNG, getEventAttendanceStats, listCategories, attachEventCategories, getEventProposals, getEventProposalComments, createEventProposalComment, getEventChecklist, updateEventChecklistItem, deleteEventChecklistItem } from '@/services/api'
import type { EventDetails, EventParticipantDetails, EventReminderOption, EventParticipantRole, EventProposalCreate, ProfileResponse, EventCreate, EventChecklistItemResponse } from '@/services/api.types'
import { useUser } from '@/hooks/useUser'
import { toast } from 'react-hot-toast'

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id as string
  const [event, setEvent] = useState<EventDetails | null>(null)
  const [participants, setParticipants] = useState<EventParticipantDetails[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileResponse[]>([])
  const [visibleCount, setVisibleCount] = useState(10)
  const [inviteRole, setInviteRole] = useState<EventParticipantRole>('speaker')
  const [proposalTitle, setProposalTitle] = useState('')
  const [proposalDescription, setProposalDescription] = useState('')
  const [proposalFile, setProposalFile] = useState<File | undefined>(undefined)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<Partial<EventCreate>>({})
  const [profileMap, setProfileMap] = useState<Record<string, ProfileResponse>>({})
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<{ total_audience: number; attended_audience: number; absent_audience: number; total_participants: number; attended_total: number } | null>(null)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [proposals, setProposals] = useState<{ id: string; title?: string | null }[]>([])
  const [comments, setComments] = useState<{ proposal_id: string; items: { id: string; content: string }[] } | null>(null)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return
      setLoading(true)
      try {
        const data = await getEventById(eventId)
        setEvent(data)
        try {
          const parts = await getEventParticipants(eventId)
          setParticipants(parts)
          const ids = Array.from(new Set(parts.map(p => p.user_id)))
          const map: Record<string, ProfileResponse> = {}
          for (const uid of ids) {
            try {
              const prof = await getProfileByUserId(uid)
              map[uid] = prof
            } catch {}
          }
          setProfileMap(map)
        } catch {
          setParticipants(null)
        }
      } catch (error: unknown) {
        const e = error as { response?: { data?: { detail?: string } } }
        console.error(error)
        setError(e?.response?.data?.detail || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const myParticipant = useMemo(() => {
    if (!participants || !user) return null
    return participants.find(p => p.user_id === user.user_id) || null
  }, [participants, user])

  const canJoin = useMemo(() => {
    if (!event || !user) return false
    if (myParticipant) return false
    const now = new Date()
    const start = new Date(event.start_datetime)
    return event.visibility === 'public' && event.status === 'published' && event.registration_status === 'opened' && now < start
  }, [event, user, myParticipant])

  const canQuit = useMemo(() => {
    if (!event || !user || !myParticipant) return false
    return myParticipant.role !== 'organizer'
  }, [event, user, myParticipant])

  const isOrganizer = useMemo(() => {
    if (!participants || !user) return false
    return participants.some(p => p.user_id === user.user_id && p.role === 'organizer') || event?.organizer_id === user?.user_id
  }, [participants, user, event])

  const isCommittee = useMemo(() => {
    if (!participants || !user) return false
    return participants.some(p => p.user_id === user.user_id && p.role === 'committee')
  }, [participants, user])

  const isSpeaker = useMemo(() => {
    if (!participants || !user) return false
    return participants.some(p => p.user_id === user.user_id && p.role === 'speaker')
  }, [participants, user])

  const handleJoin = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await joinPublicEvent(eventId)
      toast.success('Joined event successfully')
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to join event'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleQuit = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await leaveEvent(eventId)
      toast.success('You have left the event')
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to leave event'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSearch = async () => {
    try {
      const byName = await findProfiles({ name: searchQuery })
      const filtered = tagFilter
        ? byName.filter(r => (r.tags || []).some(t => t.name.toLowerCase().includes(tagFilter.toLowerCase())))
        : byName
      setSearchResults(filtered)
      setVisibleCount(10)
    } catch (e) {
      setSearchResults([])
    }
  }

  const handleInvite = async (userId: string) => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await inviteEventParticipant(eventId, { user_id: userId, role: inviteRole })
      toast.success('Invitation sent')
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to invite'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRoleUpdate = async (participantId: string, role: EventParticipantRole) => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await updateEventParticipantRole(eventId, participantId, { role })
      toast.success('Role updated')
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to update role'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemove = async (participantId: string) => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await removeEventParticipant(eventId, participantId)
      toast.success('Participant removed')
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to remove participant'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateProposal = async () => {
    if (!eventId || !event) return
    setActionLoading(true)
    try {
      const body: EventProposalCreate = {
        title: proposalTitle || event.title,
        description: proposalDescription || event.description || '',
      }
      const created = proposalFile ? await createEventProposalWithFile(eventId, body, proposalFile) : await createEventProposal(eventId, body)
      toast.success('Proposal created')
      setProposalTitle('')
      setProposalDescription('')
      setProposalFile(undefined)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to create proposal'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleInvitationResponse = async (status: 'accepted' | 'rejected') => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await respondInvitationMe(eventId, { status })
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
      toast.success(`Invitation ${status}`)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to update invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOrganizerStatus = async (participantId: string, status: 'accepted' | 'rejected') => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await updateEventParticipantStatus(eventId, participantId, { status })
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
      toast.success(`Status set to ${status}`)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateQR = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      const res = await generateAttendanceQR(eventId)
      setQrToken(res.token)
      const blob = await getAttendanceQRPNG(eventId)
      const url = URL.createObjectURL(blob)
      setQrImageUrl(url)
      toast.success('QR generated')
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to generate QR')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLoadStats = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      const stats = await getEventAttendanceStats(eventId)
      setAttendanceStats(stats)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to load stats')
    } finally {
      setActionLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const list = await listCategories()
      setCategories(list)
    } catch {}
  }

  const handleAttachCategories = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await attachEventCategories(eventId, { category_ids: selectedCategoryIds })
      toast.success('Categories attached')
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to attach categories')
    } finally {
      setActionLoading(false)
    }
  }

  const loadProposals = async () => {
    if (!eventId) return
    try {
      const list = await getEventProposals(eventId)
      setProposals(list.map(p => ({ id: p.id, title: p.title })))
    } catch {}
  }

  const loadComments = async (proposalId: string) => {
    if (!eventId) return
    try {
      const items = await getEventProposalComments(eventId, proposalId)
      setComments({ proposal_id: proposalId, items: items.map(c => ({ id: c.id, content: c.content })) })
    } catch {}
  }

  const handleAddComment = async () => {
    if (!eventId || !comments || !newComment.trim()) return
    setActionLoading(true)
    try {
      await createEventProposalComment(eventId, comments.proposal_id, { content: newComment.trim() })
      await loadComments(comments.proposal_id)
      setNewComment('')
      toast.success('Comment added')
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to add comment')
    } finally {
      setActionLoading(false)
    }
  }

  const [checklist, setChecklist] = useState<EventChecklistItemResponse[]>([])

  const loadChecklist = async () => {
    if (!eventId) return
    try {
      const items = await getEventChecklist(eventId)
      setChecklist(items)
    } catch {}
  }

  const toggleChecklistComplete = async (item: EventChecklistItemResponse) => {
    if (!eventId) return
    setActionLoading(true)
    try {
      const updated = await updateEventChecklistItem(eventId, item.id, { is_completed: !item.is_completed })
      setChecklist(prev => prev.map(i => (i.id === item.id ? updated : i)))
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to update checklist')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteChecklistItem = async (item: EventChecklistItemResponse) => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await deleteEventChecklistItem(eventId, item.id)
      setChecklist(prev => prev.filter(i => i.id !== item.id))
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail || 'Failed to delete checklist item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditData(prev => ({ ...prev, [name]: value }))
  }

  const handleEditSubmit = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      if (editData.start_datetime && editData.end_datetime) {
        const sd = new Date(editData.start_datetime)
        const ed = new Date(editData.end_datetime)
        if (ed <= sd) {
          toast.error('End date must be after start date')
          setActionLoading(false)
          return
        }
      }
      const updated = await updateEvent(eventId, editData)
      setEvent(updated)
      toast.success('Event updated')
      setEditOpen(false)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to update event'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogoUpload = async (file?: File) => {
    if (!eventId || !file) return
    setUploadingImage(true)
    try {
      const updated = await updateEventLogo(eventId, file)
      setEvent(updated)
      toast.success('Logo updated')
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to update logo'
      toast.error(msg)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCoverUpload = async (file?: File) => {
    if (!eventId || !file) return
    setUploadingImage(true)
    try {
      const updated = await updateEventCover(eventId, file)
      setEvent(updated)
      toast.success('Cover updated')
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to update cover'
      toast.error(msg)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleLifecycle = async (action: 'publish' | 'unpublish' | 'open' | 'close' | 'end') => {
    if (!eventId) return
    setActionLoading(true)
    try {
      let updated: EventDetails
      if (action === 'publish') updated = await publishEvent(eventId)
      else if (action === 'unpublish') updated = await unpublishEvent(eventId)
      else if (action === 'open') updated = await openRegistration(eventId)
      else if (action === 'close') updated = await closeRegistration(eventId)
      else updated = await endEvent(eventId)
      setEvent(updated)
      toast.success('Event updated')
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Action failed'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetReminder = async (option: EventReminderOption) => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await setEventReminder(eventId, { option })
      const label = option === 'one_week' ? '1 week' : option === 'three_days' ? '3 days' : '1 day'
      toast.success(`Reminder set: ${label} before start`)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } }
      const msg = e?.response?.data?.detail || 'Failed to set reminder'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6">Loading...</div>
  }

  if (error) {
    return <div className="max-w-3xl mx-auto p-6 text-red-600">{error}</div>
  }

  if (!event) {
    return <div className="max-w-3xl mx-auto p-6">Event not found</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      {(isOrganizer || isCommittee) && (
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Logo</div>
            <input type="file" onChange={(e) => handleLogoUpload(e.target.files?.[0])} disabled={uploadingImage} />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Cover</div>
            <input type="file" onChange={(e) => handleCoverUpload(e.target.files?.[0])} disabled={uploadingImage} />
          </div>
        </div>
      )}
      {event.description && (
        <p className="text-zinc-900">{event.description}</p>
      )}
      {new Date(event.start_datetime).getTime() < Date.now() && (
        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700">Event Closed</div>
      )}
      <div className="flex items-center gap-4">
        {event.logo_url && (
          <img src={event.logo_url} alt="Event logo" className="h-14 w-14 object-cover rounded" />
        )}
        {event.cover_url && (
          <img src={event.cover_url} alt="Event cover" className="h-20 w-36 object-cover rounded" />
        )}
      </div>
      <div className="text-sm text-zinc-900">
        <div>
          <span className="font-medium">Schedule:</span> {new Date(event.start_datetime).toLocaleString()} — {new Date(event.end_datetime).toLocaleString()}
        </div>
        <div className="capitalize">
          <span className="font-medium">Format:</span> {event.format.replace('_', ' ')} • <span className="font-medium">Type:</span> {event.type} • <span className="font-medium">Registration:</span> {event.registration_type}
        </div>
        <div>
          <span className="font-medium">Visibility:</span> {event.visibility}
          {event.registration_status && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-900">Reg: {event.registration_status}</span>
          )}
        </div>
      </div>

      {isOrganizer && (
        <div className="mt-4">
          <button onClick={() => { setEditOpen(!editOpen); if (!editOpen && event) setEditData({ title: event.title, description: event.description || '', start_datetime: new Date(event.start_datetime).toISOString(), end_datetime: new Date(event.end_datetime).toISOString(), registration_type: event.registration_type, visibility: event.visibility, format: event.format, type: event.type, venue_remark: event.venue_remark || '' }) }} className="px-3 py-2 rounded border">{editOpen ? 'Close Edit' : 'Edit Event'}</button>
          {editOpen && (
            <div className="mt-3 space-y-2 border rounded p-3">
              <input name="title" value={editData.title || ''} onChange={handleEditChange} placeholder="Title" className="w-full px-3 py-2 border rounded" />
              <textarea name="description" value={editData.description || ''} onChange={handleEditChange} placeholder="Description" className="w-full px-3 py-2 border rounded" rows={3} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="datetime-local" name="start_datetime" value={(editData.start_datetime || '').replace('Z','')} onChange={handleEditChange} className="px-3 py-2 border rounded" />
                <input type="datetime-local" name="end_datetime" value={(editData.end_datetime || '').replace('Z','')} onChange={handleEditChange} className="px-3 py-2 border rounded" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select name="format" value={editData.format || event!.format} onChange={handleEditChange} className="px-3 py-2 border rounded">
                  <option value="workshop">Workshop</option>
                  <option value="seminar">Seminar</option>
                  <option value="webinar">Webinar</option>
                  <option value="panel_discussion">Panel Discussion</option>
                  <option value="club_event">Club Event</option>
                  <option value="other">Other</option>
                </select>
                <select name="type" value={editData.type || event!.type} onChange={handleEditChange} className="px-3 py-2 border rounded">
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select name="registration_type" value={editData.registration_type || event!.registration_type} onChange={handleEditChange} className="px-3 py-2 border rounded">
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
                <select name="visibility" value={editData.visibility || event!.visibility} onChange={handleEditChange} className="px-3 py-2 border rounded">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <input name="venue_remark" value={editData.venue_remark || ''} onChange={handleEditChange} placeholder="Venue remark" className="w-full px-3 py-2 border rounded" />
              <div className="flex justify-end">
          <button onClick={handleEditSubmit} disabled={actionLoading} className="px-3 py-2 rounded bg-primary-600 text-white">Save</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Join/Quit Controls */}
      <div className="mt-4">
        {user ? (
          <div className="space-y-2">
            {myParticipant ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">You are in this event as <span className="font-medium">{myParticipant.role}</span>.</span>
                {myParticipant.status === 'pending' && (
                  <>
                    <button onClick={() => handleInvitationResponse('accepted')} disabled={actionLoading} className="px-3 py-2 rounded border">Accept</button>
                    <button onClick={() => handleInvitationResponse('rejected')} disabled={actionLoading} className="px-3 py-2 rounded border">Reject</button>
                  </>
                )}
                {canQuit && (
                  <button
                    onClick={handleQuit}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Quit event
                  </button>
                )}
              </div>
            ) : (
              <div>
                {canJoin ? (
                  <button
                    onClick={handleJoin}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    Join event
                  </button>
                ) : (
                  <span className="text-sm text-zinc-900">Joining is not available.</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-zinc-900">Please log in to join or set reminders.</div>
        )}
      </div>

      {/* Reminder Options */}
      {(user && (myParticipant || (event.organizer_id === user?.user_id))) && (
        <div className="mt-6 border rounded p-4">
          <div className="font-medium mb-2">Set a reminder</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetReminder('one_week')}
              disabled={actionLoading}
              className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              1 week before
            </button>
            <button
              onClick={() => handleSetReminder('three_days')}
              disabled={actionLoading}
              className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              3 days before
            </button>
            <button
              onClick={() => handleSetReminder('one_day')}
              disabled={actionLoading}
              className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              1 day before
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">You must be joined to this event to set reminders.</p>
        </div>
      )}

      {(isOrganizer || isCommittee) && (
        <div className="mt-6 border rounded p-4 space-y-4">
          <div className="font-medium">Participants</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-bold mb-1">Speakers</div>
              <ul className="space-y-1">
                {participants?.filter(p => p.role === 'speaker').map(p => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>{profileMap[p.user_id]?.full_name || p.user_id}</span>
                    {isOrganizer && (
                      <button onClick={() => handleRemove(p.id)} disabled={actionLoading} className="px-2 py-1 rounded border text-red-600">Remove</button>
                    )}
                  </li>
                ))}
                {participants?.filter(p => p.role === 'speaker').length === 0 && (
                  <li className="text-xs text-zinc-600">No speakers yet</li>
                )}
              </ul>
            </div>
            <div>
              <div className="text-sm font-bold mb-1">Students</div>
              <ul className="space-y-1">
                {participants?.filter(p => p.role === 'student').map(p => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>{profileMap[p.user_id]?.full_name || p.user_id}</span>
                    {isOrganizer && (
                      <button onClick={() => handleRemove(p.id)} disabled={actionLoading} className="px-2 py-1 rounded border text-red-600">Remove</button>
                    )}
                  </li>
                ))}
                {participants?.filter(p => p.role === 'student').length === 0 && (
                  <li className="text-xs text-zinc-600">No students yet</li>
                )}
              </ul>
            </div>
          </div>
          <div className="space-y-2">
            {participants?.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.role} • {profileMap[p.user_id]?.full_name || p.user_id}</span>
                {isOrganizer && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRoleUpdate(p.id, 'committee')} disabled={actionLoading} className="px-2 py-1 rounded border">Make committee</button>
                    <button onClick={() => handleRoleUpdate(p.id, 'speaker')} disabled={actionLoading} className="px-2 py-1 rounded border">Make speaker</button>
                    {p.status === 'pending' && (
                      <>
                        <button onClick={() => handleOrganizerStatus(p.id, 'accepted')} disabled={actionLoading} className="px-2 py-1 rounded border">Accept</button>
                        <button onClick={() => handleOrganizerStatus(p.id, 'rejected')} disabled={actionLoading} className="px-2 py-1 rounded border">Reject</button>
                      </>
                    )}
                    {p.role !== 'organizer' && (
                      <button onClick={() => handleRemove(p.id)} disabled={actionLoading} className="px-2 py-1 rounded border text-red-600">Remove</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {isOrganizer && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search profiles by name" className="flex-1 px-3 py-2 border rounded" />
                <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Filter by tag/skill" className="px-3 py-2 border rounded" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as EventParticipantRole)} className="px-3 py-2 border rounded">
                  <option value="speaker">Speaker</option>
                  <option value="committee">Committee</option>
                </select>
                <button onClick={handleSearch} disabled={actionLoading} className="px-3 py-2 rounded bg-primary-600 text-white">Search</button>
              </div>
              <div className="space-y-1">
                {searchResults.slice(0, visibleCount).map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {r.avatar_url && (<img src={r.avatar_url} alt="avatar" className="h-6 w-6 rounded-full" />)}
                      <span>{r.full_name}</span>
                      {r.tags && r.tags.length > 0 && (
                        <span className="text-xs text-zinc-600">{r.tags.map(t => t.name).join(', ')}</span>
                      )}
                    </span>
                    <button onClick={() => handleInvite(r.user_id)} disabled={actionLoading} className="px-2 py-1 rounded border">Invite</button>
                  </div>
                ))}
                {searchResults.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <button onClick={() => setVisibleCount(c => c + 10)} className="px-3 py-2 rounded border">Load more</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isOrganizer && event && (
        <div className="mt-6 border rounded p-4 space-y-3">
          <div className="font-medium">Lifecycle</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleLifecycle('publish')} disabled={actionLoading} className="px-3 py-2 rounded border">Publish</button>
            <button onClick={() => handleLifecycle('unpublish')} disabled={actionLoading} className="px-3 py-2 rounded border">Unpublish</button>
            <button onClick={() => handleLifecycle('open')} disabled={actionLoading} className="px-3 py-2 rounded border">Open Registration</button>
            <button onClick={() => handleLifecycle('close')} disabled={actionLoading} className="px-3 py-2 rounded border">Close Registration</button>
            <button onClick={() => handleLifecycle('end')} disabled={actionLoading} className="px-3 py-2 rounded border">End Event</button>
          </div>
          {new Date(event.end_datetime).getTime() < Date.now() && (
            <div className="text-xs text-zinc-700">Event has passed; consider ending it.</div>
          )}
        </div>
      )}

      {(isOrganizer || isCommittee) && (
        <div className="mt-6 border rounded p-4 space-y-3">
          <div className="font-medium">Attendance</div>
          <div className="flex items-center gap-2">
            <button onClick={handleGenerateQR} disabled={actionLoading} className="px-3 py-2 rounded border">Generate QR</button>
            <button onClick={handleLoadStats} disabled={actionLoading} className="px-3 py-2 rounded border">Load stats</button>
          </div>
          {qrToken && (
            <div className="text-xs text-gray-600 break-all">Token: {qrToken}</div>
          )}
          {qrImageUrl && (
            <img src={qrImageUrl} alt="Attendance QR" className="h-40 w-40" />
          )}
          {attendanceStats && (
            <div className="text-sm text-zinc-900">
              <div>Total audience: {attendanceStats.total_audience}</div>
              <div>Attended audience: {attendanceStats.attended_audience}</div>
              <div>Absent audience: {attendanceStats.absent_audience}</div>
              <div>Total participants: {attendanceStats.total_participants}</div>
              <div>Attended total: {attendanceStats.attended_total}</div>
            </div>
          )}
        </div>
      )}

      {(isOrganizer || isCommittee) && (
        <div className="mt-6 border rounded p-4 space-y-3">
          <div className="font-medium">Categories</div>
          <div className="flex items-center gap-2">
            <button onClick={loadCategories} className="px-3 py-2 rounded border">Load categories</button>
          </div>
          {categories.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categories.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedCategoryIds.includes(c.id)} onChange={(e) => {
                    setSelectedCategoryIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))
                  }} />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          )}
          <div>
            <button onClick={handleAttachCategories} disabled={actionLoading || selectedCategoryIds.length === 0} className="mt-2 px-3 py-2 rounded bg-primary-600 text-white disabled:opacity-50">Attach Selected</button>
          </div>
        </div>
      )}

      {(isOrganizer || isCommittee || isSpeaker) && (
        <div className="mt-6 border rounded p-4 space-y-3">
          <div className="font-medium">Proposals & Comments</div>
          <div className="flex items-center gap-2">
            <button onClick={loadProposals} className="px-3 py-2 rounded border">Load proposals</button>
          </div>
          {proposals.length > 0 && (
            <ul className="mt-2 space-y-1">
              {proposals.map(p => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span>{p.title || 'Untitled'}</span>
                  <button onClick={() => loadComments(p.id)} className="px-2 py-1 rounded border">View comments</button>
                </li>
              ))}
            </ul>
          )}
          {comments && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-1">Comments</div>
              <ul className="space-y-1">
                {comments.items.map(c => (
                  <li key={c.id} className="text-sm">{c.content}</li>
                ))}
              </ul>
              <div className="flex items-center gap-2 mt-2">
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment" className="flex-1 px-3 py-2 border rounded" />
                <button onClick={handleAddComment} disabled={actionLoading} className="px-3 py-2 rounded bg-primary-600 text-white">Add</button>
              </div>
            </div>
          )}
        </div>
      )}

      {(isOrganizer || isCommittee) && (
        <div className="mt-6 border rounded p-4 space-y-3">
          <div className="font-medium">Checklist</div>
          <div className="flex items-center gap-2">
            <button onClick={loadChecklist} className="px-3 py-2 rounded border">Load checklist</button>
          </div>
          {checklist.length > 0 && (
            <ul className="divide-y">
              {checklist.map(item => (
                <li key={item.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.description && <div className="text-xs text-gray-600">{item.description}</div>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button className="px-2 py-1 rounded border" onClick={() => toggleChecklistComplete(item)}>
                      {item.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                    {isOrganizer && (
                      <button className="px-2 py-1 rounded border" onClick={() => deleteChecklistItem(item)}>Delete</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {checklist.length === 0 && (
            <div className="text-xs text-zinc-700">No checklist items loaded.</div>
          )}
        </div>
      )}

      {isOrganizer && (
        <div className="mt-6 border rounded p-4 space-y-3">
          <div className="font-medium">Quick Proposal</div>
          <input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 border rounded" />
          <textarea value={proposalDescription} onChange={(e) => setProposalDescription(e.target.value)} placeholder="Description" className="w-full px-3 py-2 border rounded" rows={3} />
          <input type="file" onChange={(e) => setProposalFile(e.target.files?.[0])} className="w-full" />
          <button onClick={handleCreateProposal} disabled={actionLoading} className="px-3 py-2 rounded bg-primary-600 text-white">Create Proposal</button>
        </div>
      )}
    </div>
  )
}
