'use client'

import React, { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { findProfiles } from '@/services/api'
import { ProfileResponse } from '@/services/api.types'
import Link from 'next/link'
import { debounce } from 'lodash'

interface SearchModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ProfileResponse[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (q: string) => {
            if (!q.trim()) {
                setResults([])
                setLoading(false)
                return
            }
            try {
                const res = await findProfiles({ name: q })
                setResults(res)
            } catch (error) {
                console.error('Search failed', error)
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 300),
        []
    )

    useEffect(() => {
        if (open) {
            // Focus input when opened? autoFocus prop on input usually works
        } else {
            setQuery('')
            setResults([])
        }
    }, [open])

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        setLoading(true)
        debouncedSearch(val)
    }

    const handleSelect = (id: string) => {
        onOpenChange(false)
        router.push(`/main/profile/${id}`)
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[90vw] max-w-2xl bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col border border-zinc-100">
                    <Dialog.Title className="sr-only">Search Profiles</Dialog.Title>
                    <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            className="flex-1 text-lg bg-transparent border-none focus:ring-0 placeholder-zinc-400 text-zinc-900 font-medium"
                            placeholder="Search for people..."
                            value={query}
                            onChange={handleSearch}
                            autoFocus
                        />
                        <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors">
                            <span className="sr-only">Close</span>
                            <kbd className="hidden sm:inline-block text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 text-zinc-500">ESC</kbd>
                        </button>
                    </div>
                    
                    {(loading || results.length > 0 || query) && (
                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {loading ? (
                                <div className="p-4 text-center text-zinc-500 text-sm">Searching...</div>
                            ) : results.length > 0 ? (
                                <div className="space-y-1">
                                    <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Profiles</div>
                                    {results.map((profile) => (
                                        <button
                                            key={profile.id}
                                            onClick={() => handleSelect(profile.user_id)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                        >
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white group-hover:ring-yellow-200" />
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
                            ) : query ? (
                                <div className="p-8 text-center text-zinc-500">
                                    No results found for "{query}"
                                </div>
                            ) : null}
                        </div>
                    )}
                    
                    {!query && !loading && (
                        <div className="p-8 text-center text-zinc-400 text-sm">
                            Type to search for users, experts, and friends.
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
