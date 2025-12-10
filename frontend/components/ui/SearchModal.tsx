'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { findProfiles, semanticSearchProfiles, semanticSearchEvents, getPublicOrganizations } from '@/services/api'
import { ProfileResponse, EventDetails, OrganizationResponse } from '@/services/api.types'
import { debounce } from 'lodash'

interface SearchModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [profiles, setProfiles] = useState<ProfileResponse[]>([])
    const [events, setEvents] = useState<EventDetails[]>([])
    const [orgs, setOrgs] = useState<OrganizationResponse[]>([])
    const [useAi, setUseAi] = useState(true)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (q: string) => {
            if (!q.trim()) {
                setProfiles([])
                setEvents([])
                setOrgs([])
                setLoading(false)
                return
            }
            try {
                const [p, e, o] = await Promise.all([
                    useAi ? semanticSearchProfiles({ q_text: q, top_k: 10 }) : findProfiles({ name: q }),
                    useAi ? semanticSearchEvents({ q_text: q, top_k: 10 }) : Promise.resolve([] as EventDetails[]),
                    getPublicOrganizations({ q, page: 1, page_size: 10 })
                ])
                setProfiles(p as ProfileResponse[])
                setEvents(e as EventDetails[])
                setOrgs(o as OrganizationResponse[])
            } catch (error) {
                console.error('Search failed', error)
                setProfiles([])
                setEvents([])
                setOrgs([])
            } finally {
                setLoading(false)
            }
        }, 300),
        [useAi]
    )

    useEffect(() => {
        if (open) {
            // Focus input when opened? autoFocus prop on input usually works
        } else {
            setQuery('')
            setProfiles([])
            setEvents([])
            setOrgs([])
        }
    }, [open])

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        setLoading(true)
        debouncedSearch(val)
    }

    const handleSelectProfile = (userId: string) => {
        onOpenChange(false)
        router.push(`/profile/${userId}`)
    }

    const handleSelectEvent = (eventId: string) => {
        onOpenChange(false)
        router.push(`/events/${eventId}`)
    }

    const handleSelectOrg = (orgId: string) => {
        onOpenChange(false)
        router.push(`/organizations/${orgId}`)
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[90vw] max-w-2xl bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col border border-zinc-100">
                    <Dialog.Title className="sr-only">Search</Dialog.Title>
                    <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            className="flex-1 text-lg bg-transparent border-none focus:ring-0 placeholder-zinc-400 text-zinc-900 font-medium"
                            placeholder="Search people, events, organizations..."
                            value={query}
                            onChange={handleSearch}
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setUseAi(!useAi)}
                                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${useAi ? 'bg-green-500 border-green-500 text-white' : 'bg-zinc-50 border-zinc-300 text-transparent hover:border-yellow-400'}`}
                                aria-pressed={useAi}
                                aria-label="Toggle AI search"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </button>
                            <span className="text-xs font-bold text-zinc-700">AI</span>
                        </div>
                        <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors">
                            <span className="sr-only">Close</span>
                            <kbd className="hidden sm:inline-block text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 text-zinc-500">ESC</kbd>
                        </button>
                    </div>
                    
                    {(loading || profiles.length > 0 || events.length > 0 || orgs.length > 0 || query) && (
                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {loading ? (
                                <div className="p-4 text-center text-zinc-500 text-sm">Searching...</div>
                            ) : (
                                <div className="space-y-6">
                                    {profiles.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">People</div>
                                            {profiles.map((profile) => (
                                                <button
                                                    key={profile.id}
                                                    onClick={() => handleSelectProfile(profile.user_id)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                                >
                                                    {profile.avatar_url ? (
                                                        <Image src={profile.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover ring-2 ring-white group-hover:ring-yellow-200" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                            {profile.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-zinc-900">{profile.full_name}</div>
                                                        {profile.bio && <div className="text-xs text-zinc-500 truncate max-w-sm">{profile.bio}</div>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {events.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Events</div>
                                            {events.map((event) => (
                                                <button
                                                    key={event.id}
                                                    onClick={() => handleSelectEvent(event.id)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H5a2 2 0 00-2 2v9a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H6zm0 4h8v2H6V6z"/></svg>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-zinc-900">{event.title}</div>
                                                        {event.venue_remark && <div className="text-xs text-zinc-500 truncate max-w-sm">{event.venue_remark}</div>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {orgs.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Organizations</div>
                                            {orgs.map((org) => (
                                                <button
                                                    key={org.id}
                                                    onClick={() => handleSelectOrg(org.id)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                                >
                                                    {org.logo_url ? (
                                                        <Image src={org.logo_url} alt="logo" width={40} height={40} className="rounded-lg object-cover ring-2 ring-white group-hover:ring-yellow-200" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                            {org.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-zinc-900">{org.name}</div>
                                                        {org.type && <div className="text-xs text-zinc-500 truncate max-w-sm">{org.type}</div>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {!profiles.length && !events.length && !orgs.length && query && (
                                        <div className="p-8 text-center text-zinc-500">
                                            No results found for {query}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!query && !loading && (
                        <div className="p-8 text-center text-zinc-400 text-sm">
                            Type to search for people, events, and organizations.
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
