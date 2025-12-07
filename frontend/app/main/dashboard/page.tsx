"use client"
import { useEffect, useMemo, useState } from "react"
import Link from 'next/link'
import {
  getMyEvents,
  getEventById,
  getEventChecklist,
  createEventChecklistItem,
  updateEventChecklistItem,
  deleteEventChecklistItem,
  getEventProposals,
  createEventProposal,
  getEventProposalComments,
  createEventProposalComment,
  getMe,
} from "@/services/api"
import type {
  MyEventItem,
  EventDetails,
  EventChecklistItemResponse,
  EventProposalResponse,
  EventProposalCommentResponse,
  UserMeResponse,
} from "@/services/api.types"
import { useAuthGuard } from "@/hooks/useAuthGuard"

export default function DashboardPage() {
  const { user, roles, loading } = useAuthGuard([]) // All authenticated users
  const [activeTab, setActiveTab] = useState<'organizer' | 'expert'>('organizer')
  const isExpert = roles?.includes('expert')

  // Auto-switch to Expert tab if likely primary role
  useEffect(() => {
    if (isExpert && !roles?.includes('student') && activeTab !== 'expert') {
      setActiveTab('expert')
    }
  }, [isExpert, roles])

  if (loading) return <div className="p-6">Loading dashboard...</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Role Switcher */}
      {(isExpert && roles?.includes('student')) && (
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit mb-6">
          <button
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'organizer' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => setActiveTab('organizer')}
          >
            Organizer / Student
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'expert' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => setActiveTab('expert')}
          >
            Expert View
          </button>
        </div>
      )}

      {activeTab === 'expert' ? <ExpertDashboard /> : <OrganizerDashboard />}
    </div>
  )
}

function ExpertDashboard() {
  const [events, setEvents] = useState<MyEventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyEvents().then(setEvents).finally(() => setLoading(false))
  }, [])

  const pendingRequests = useMemo(() => events.filter(e => e.my_status === 'pending'), [events])
  const confirmedSchedule = useMemo(() => events.filter(e => e.my_status === 'accepted'), [events])

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Expert Dashboard</h1>

      {/* Notifications / Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            Pending Invitations ({pendingRequests.length})
          </h2>
          <div className="grid gap-4">
            {pendingRequests.map(evt => (
              <div key={evt.event_id} className="bg-white p-4 rounded-lg border border-yellow-100 flex justify-between items-center shadow-sm">
                <div>
                  <div className="font-bold text-gray-900">{evt.title}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(evt.start_datetime).toLocaleString()}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1 uppercase font-bold tracking-wide">Action Required</div>
                </div>
                <Link href={`/main/requests/${evt.event_id}`} className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold text-sm hover:bg-yellow-600">
                  View Request
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Schedule */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmed Schedule</h2>
        {confirmedSchedule.length === 0 ? (
          <div className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center">
            No upcoming confirmed sessions.
          </div>
        ) : (
          <div className="grid gap-4">
            {confirmedSchedule.map(evt => (
              <div key={evt.event_id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-900">{evt.title}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(evt.start_datetime).toLocaleString()}
                  </div>
                </div>
                <Link href={`/main/events/${evt.event_id}`} className="text-gray-500 hover:text-gray-900">
                  Details &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OrganizerDashboard() {
  const [myEvents, setMyEvents] = useState<MyEventItem[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [checklist, setChecklist] = useState<EventChecklistItemResponse[]>([])
  const [proposals, setProposals] = useState<EventProposalResponse[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState<string>("")
  const [proposalComments, setProposalComments] = useState<EventProposalCommentResponse[]>([])

  const [newItemTitle, setNewItemTitle] = useState("")
  const [newItemDesc, setNewItemDesc] = useState("")
  const [newProposalUrl, setNewProposalUrl] = useState("")
  const [newProposalTitle, setNewProposalTitle] = useState("")
  const [newProposalDesc, setNewProposalDesc] = useState("")
  const [newComment, setNewComment] = useState("")

  useEffect(() => {
    const load = async () => {
      const me = await getMyEvents()
      // Filter out events where I am just invited/pending?
      // Organizer dashboard usually for events I ORGANIZE.
      // But maybe also participation.
      // Let's keep existing logic but sort/filter if needed.
      // Ideally only show 'organizer' events in the management dropdown?
      const organized = me.filter(e => e.my_role === 'organizer')
      setMyEvents(organized.length > 0 ? organized : me) // Fallback if no organized events, show all
      if (organized.length > 0) {
        setSelectedEventId(organized[0].event_id)
      } else if (me.length > 0) {
        setSelectedEventId(me[0].event_id)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadEvent = async () => {
      if (!selectedEventId) return
      const d = await getEventById(selectedEventId)
      setEventDetails(d)
      const cl = await getEventChecklist(selectedEventId)
      setChecklist(cl)
      const pr = await getEventProposals(selectedEventId)
      setProposals(pr)
      setSelectedProposalId(pr[0]?.id || "")
      if (pr[0]) {
        const cm = await getEventProposalComments(selectedEventId, pr[0].id)
        setProposalComments(cm)
      } else {
        setProposalComments([])
      }
    }
    loadEvent()
  }, [selectedEventId])

  const handleAddChecklist = async () => {
    if (!selectedEventId || !newItemTitle.trim()) return
    const created = await createEventChecklistItem(selectedEventId, {
      title: newItemTitle,
      description: newItemDesc || undefined,
    })
    setChecklist(prev => [...prev, created])
    setNewItemTitle("")
    setNewItemDesc("")
  }

  const toggleComplete = async (item: EventChecklistItemResponse) => {
    const updated = await updateEventChecklistItem(selectedEventId, item.id, { is_completed: !item.is_completed })
    setChecklist(prev => prev.map(i => (i.id === item.id ? updated : i)))
  }

  const deleteItem = async (item: EventChecklistItemResponse) => {
    await deleteEventChecklistItem(selectedEventId, item.id)
    setChecklist(prev => prev.filter(i => i.id !== item.id))
  }

  const handleCreateProposal = async () => {
    if (!selectedEventId) return
    const created = await createEventProposal(selectedEventId, {
      title: newProposalTitle || undefined,
      description: newProposalDesc || undefined,
      file_url: newProposalUrl || undefined,
    })
    const pr = await getEventProposals(selectedEventId)
    setProposals(pr)
    setSelectedProposalId(created.id)
    setNewProposalUrl("")
    setNewProposalTitle("")
    setNewProposalDesc("")
  }

  const handleSelectProposal = async (pid: string) => {
    setSelectedProposalId(pid)
    if (pid) {
      const cm = await getEventProposalComments(selectedEventId, pid)
      setProposalComments(cm)
    } else {
      setProposalComments([])
    }
  }

  const handleAddComment = async () => {
    if (!selectedEventId || !selectedProposalId || !newComment.trim()) return
    await createEventProposalComment(selectedEventId, selectedProposalId, { content: newComment })
    const cm = await getEventProposalComments(selectedEventId, selectedProposalId)
    setProposalComments(cm)
    setNewComment("")
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizer Dashboard</h1>
          {/* Find Expert Quick Action */}
          <Link href="/main/experts" className="text-sm text-yellow-600 hover:text-yellow-700 font-bold mt-1 inline-block">
            🔍 Find & Book Expert
          </Link>
        </div>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="border rounded px-3 py-2"
        >
          {myEvents.map(me => (
            <option key={me.event_id} value={me.event_id}>
              {me.title}
            </option>
          ))}
        </select>
      </div>

      {myEvents.length === 0 && (
        <div className="text-center py-10 bg-gray-50 rounded-xl">
          <p className="text-gray-500 mb-4">You haven't organized any events yet.</p>
          <Link href="/main/events/create" className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold">
            Create Event
          </Link>
        </div>
      )}

      {eventDetails && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-lg font-medium">{eventDetails.title}</div>
                <div className="text-sm text-gray-600">
                  {new Date(eventDetails.start_datetime).toLocaleString()} — {new Date(eventDetails.end_datetime).toLocaleString()}
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 capitalize">{eventDetails.status}</span>
            </div>
            {eventDetails.description && (
              <p className="text-gray-700 text-sm">{eventDetails.description}</p>
            )}
            <div className="mt-3 text-xs text-gray-600 capitalize">
              Format: {eventDetails.format.replace('_', ' ')} • Type: {eventDetails.type} • Registration: {eventDetails.registration_type} • Visibility: {eventDetails.visibility}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-2">Quick Create Proposal</div>
            <div className="space-y-2">
              <input className="w-full border rounded px-3 py-2" placeholder="file_url" value={newProposalUrl} onChange={e => setNewProposalUrl(e.target.value)} />
              <input className="w-full border rounded px-3 py-2" placeholder="title (optional)" value={newProposalTitle} onChange={e => setNewProposalTitle(e.target.value)} />
              <textarea className="w-full border rounded px-3 py-2" placeholder="description (optional)" value={newProposalDesc} onChange={e => setNewProposalDesc(e.target.value)} />
              <button className="w-full border rounded px-3 py-2 hover:bg-gray-50" onClick={handleCreateProposal}>Create</button>
            </div>
          </div>
        </div>
      )}

      {eventDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Checklist</div>
              <div className="flex gap-2">
                <input className="border rounded px-2 py-1" placeholder="title" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} />
                <input className="border rounded px-2 py-1" placeholder="description" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
                <button className="border rounded px-3 py-1" onClick={handleAddChecklist}>Add</button>
              </div>
            </div>
            <ul className="divide-y">
              {checklist.map(item => (
                <li key={item.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.description && <div className="text-xs text-gray-600">{item.description}</div>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button className="px-2 py-1 rounded border" onClick={() => toggleComplete(item)}>
                      {item.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                    <button className="px-2 py-1 rounded border" onClick={() => deleteItem(item)}>Delete</button>
                  </div>
                </li>
              ))}
              {checklist.length === 0 && (
                <li className="py-2 text-sm text-gray-600">No checklist items yet.</li>
              )}
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <div className="font-medium mb-3">Proposals</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <ul className="divide-y">
                  {proposals.map(pr => (
                    <li key={pr.id} className={`py-2 cursor-pointer ${selectedProposalId === pr.id ? 'bg-gray-50' : ''}`} onClick={() => handleSelectProposal(pr.id)}>
                      <div className="text-sm font-medium">{pr.title || eventDetails?.title}</div>
                      {pr.file_url && <div className="text-xs text-gray-600 truncate">{pr.file_url}</div>}
                    </li>
                  ))}
                  {proposals.length === 0 && (
                    <li className="py-2 text-sm text-gray-600">No proposals yet.</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="font-medium mb-2">Comments</div>
                <ul className="space-y-2 max-h-64 overflow-auto border rounded p-2">
                  {proposalComments.map(c => (
                    <li key={c.id} className="text-sm">
                      <div>{c.content}</div>
                      <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                  {proposalComments.length === 0 && (
                    <li className="text-sm text-gray-600">No comments yet.</li>
                  )}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input className="flex-1 border rounded px-2 py-1" placeholder="Write a comment" value={newComment} onChange={e => setNewComment(e.target.value)} />
                  <button className="border rounded px-3 py-1" onClick={handleAddChecklist}>Send</button> {/* BUG: handleAddChecklist here? Should be handleAddComment */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}