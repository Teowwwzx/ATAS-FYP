'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getOrganizationById, getMe, updateOrganization, getPublicEvents, getReviewsByEvent, getOrganizationMembers, getMyOrganizationMembership, joinOrganization, leaveOrganization } from '@/services/api'
import { OrganizationResponse, UserMeResponse, OrganizationUpdate, EventDetails } from '@/services/api.types'
import { EventCard } from '@/components/ui/EventCard'
import { toast } from 'react-hot-toast'
 

export default function OrganizationDetailPage() {
  const params = useParams()
  const orgId = params.id as string

  const [org, setOrg] = useState<OrganizationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<UserMeResponse | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<OrganizationUpdate>({})
  const [relatedEvents, setRelatedEvents] = useState<EventDetails[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventReviews, setEventReviews] = useState<Record<string, { averageRating: number; reviewsCount: number; latestComment?: string }>>({})
  const [myMembership, setMyMembership] = useState<{ is_member: boolean; role?: string | null } | null>(null)
  const [members, setMembers] = useState<{ user_id: string; role: string }[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const isOwner = !!(me && org && me.id === org.owner_id)

  useEffect(() => {
    if (!orgId) return
    const run = async () => {
      try {
        const [data, user] = await Promise.all([
          getOrganizationById(orgId),
          getMe().catch(() => null)
        ])
        setOrg(data)
        setMe(user)
        setForm({
          name: data.name,
          description: data.description || '',
          type: data.type,
          website_url: data.website_url || '',
          location: data.location || '',
          visibility: data.visibility,
        })
      } catch (error: unknown) {
        const e = error as { response?: { status?: number; data?: { detail?: string } } }
        if (e.response?.status === 401) {
          localStorage.removeItem('atas_token')
          window.location.href = '/login'
          return
        }
        const msg = e.response?.data?.detail || 'Failed to load organization'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [orgId])

  useEffect(() => {
    const loadRelatedEvents = async () => {
      if (!org?.owner_id) return
      try {
        setEventsLoading(true)
        const events = await getPublicEvents()
        const hosted = events.filter(e => e.organizer_id === org.owner_id)
        setRelatedEvents(hosted)
      } catch {
        setRelatedEvents([])
      } finally {
        setEventsLoading(false)
      }
    }
    loadRelatedEvents()
  }, [org?.owner_id])

  useEffect(() => {
    const loadReviews = async () => {
      if (!relatedEvents.length) return
      try {
        const results = await Promise.all(relatedEvents.map(async (ev) => {
          try {
            const reviews = await getReviewsByEvent(ev.id)
            const count = reviews.length
            const avg = count > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0
            const latest = reviews.find(r => !!r.comment)?.comment || undefined
            return [ev.id, { averageRating: Number(avg.toFixed(1)), reviewsCount: count, latestComment: latest }] as const
          } catch {
            return [ev.id, { averageRating: 0, reviewsCount: 0 }] as const
          }
        }))
        setEventReviews(Object.fromEntries(results))
      } catch { }
    }
    loadReviews()
  }, [relatedEvents])

  useEffect(() => {
    const loadMembership = async () => {
      if (!org?.id) return
      try {
        const status = await getMyOrganizationMembership(org.id)
        setMyMembership(status)
      } catch {
        setMyMembership(null)
      }
    }
    loadMembership()
  }, [org?.id])

  useEffect(() => {
    const loadMembers = async () => {
      if (!org?.id || !isOwner) return
      try {
        setMembersLoading(true)
        const list = await getOrganizationMembers(org.id)
        setMembers(list)
      } catch {
        setMembers([])
      } finally {
        setMembersLoading(false)
      }
    }
    loadMembers()
  }, [org?.id, isOwner])

  if (loading) return <div className="text-sm text-zinc-500">Loading...</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (!org) return <div className="text-sm text-zinc-500">Organization not found.</div>

  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updated = await updateOrganization(org.id, form)
      setOrg(updated)
      toast.success('Organization updated')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update organization')
    }
  }

  return (
      <div className="bg-transparent">
        <div className="bg-white rounded-[2rem] shadow-sm border border-zinc-100 overflow-hidden">
          {org.cover_url && (<img src={org.cover_url} alt="cover" className="w-full h-56 object-cover" />)}
          <div className="px-6 py-6">
            <div className="flex items-center gap-4 mb-4">
              {org.logo_url && (<img src={org.logo_url} alt="logo" className="h-16 w-16 rounded-lg ring-2 ring-yellow-400" />)}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-zinc-900">{org.name}</h1>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(v => !v)}
                      className="px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
                    >
                      {isEditing ? 'Cancel' : 'Manage'}
                    </button>
                  )}
                </div>
                {org.type && (<span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{org.type}</span>)}
              </div>
            </div>
            {!isEditing ? (
              <>
                {org.description && (<p className="text-zinc-700 mb-4">{org.description}</p>)}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {org.website_url && (
                    <div><span className="font-bold text-zinc-700">Website:</span> <a href={org.website_url} className="text-yellow-600 font-bold" target="_blank" rel="noreferrer">{org.website_url}</a></div>
                  )}
                  {org.location && (
                    <div><span className="font-bold text-zinc-700">Location:</span> <span className="text-zinc-800">{org.location}</span></div>
                  )}
                </div>

                {/* Membership actions */}
                {me && !isOwner && (
                  <div className="mt-4">
                    {myMembership?.is_member ? (
                      <button
                        onClick={async () => { try { await leaveOrganization(org.id); toast.success('Left organization'); const s = await getMyOrganizationMembership(org.id); setMyMembership(s) } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to leave') } }}
                        className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-900 text-sm font-bold hover:bg-zinc-50"
                      >
                        Leave Organization
                      </button>
                    ) : (
                      org.visibility === 'public' && (
                        <button
                          onClick={async () => { try { await joinOrganization(org.id); toast.success('Joined organization'); const s = await getMyOrganizationMembership(org.id); setMyMembership(s) } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to join') } }}
                          className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800"
                        >
                          Join Organization
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Related Events */}
                <div className="mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-black text-zinc-900">Events</h3>
                  </div>
                  {eventsLoading ? (
                    <div className="text-sm text-zinc-500">Loading events…</div>
                  ) : relatedEvents.length === 0 ? (
                    <div className="text-sm text-zinc-500">No events found.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {relatedEvents.map(event => (
                        <EventCard key={event.id} event={event} compact reviewsSummary={eventReviews[event.id]} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Members (owner only) */}
                {isOwner && (
                  <div className="mt-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <h3 className="text-lg font-black text-zinc-900">Members</h3>
                      <span className="text-xs text-zinc-500 font-bold">{members.length}</span>
                    </div>
                    {membersLoading ? (
                      <div className="text-sm text-zinc-500">Loading members…</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {members.map(m => (
                          <div key={m.user_id} className="flex items-center gap-3 bg-white rounded-2xl border border-zinc-100 p-4">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-zinc-900 font-bold">{m.user_id.slice(0,1).toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-zinc-900 truncate">{m.user_id}</div>
                              <div className="text-xs text-zinc-500 uppercase tracking-wider">{m.role}</div>
                            </div>
                          </div>
                        ))}
                        {members.length === 0 && (
                          <div className="text-sm text-zinc-500">No members yet.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Name</label>
                  <input
                    name="name"
                    value={form.name || ''}
                    onChange={handleChange}
                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 py-3 px-4"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    name="description"
                    value={form.description || ''}
                    onChange={handleChange}
                    rows={4}
                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 py-3 px-4"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Type</label>
                    <select
                      name="type"
                      value={form.type || 'community'}
                      onChange={handleChange}
                      className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 py-3 px-4"
                    >
                      <option value="company">Company</option>
                      <option value="university">University</option>
                      <option value="community">Community</option>
                      <option value="nonprofit">Nonprofit</option>
                      <option value="government">Government</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Visibility</label>
                    <select
                      name="visibility"
                      value={form.visibility || 'public'}
                      onChange={handleChange}
                      className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 py-3 px-4"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Website</label>
                    <input
                      name="website_url"
                      value={form.website_url || ''}
                      onChange={handleChange}
                      className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 py-3 px-4"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Location</label>
                    <input
                      name="location"
                      value={form.location || ''}
                      onChange={handleChange}
                      className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 py-3 px-4"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 bg-white text-zinc-900 rounded-full font-bold shadow-sm hover:bg-gray-50 border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-yellow-400 text-zinc-900 rounded-full font-bold shadow-lg hover:bg-yellow-300"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
  )
}
