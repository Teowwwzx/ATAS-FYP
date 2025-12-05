'use client'

import React, { useState } from 'react'
import { Tab } from '@headlessui/react'
import { EventDetails, ProfileResponse } from '@/services/api.types'
import { EventInviteModal } from './EventInviteModal'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import { DashboardTabChecklist } from './DashboardTabChecklist'
import { DashboardTabProposals } from './DashboardTabProposals'
import { DashboardTabSettings } from './DashboardTabSettings'

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

interface DashboardTabsProps {
    event: EventDetails
    user: ProfileResponse | null
    onUpdate: () => void // Callback to refresh parent data
}

export function DashboardTabs({ event, user, onUpdate }: DashboardTabsProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false)

    const tabs = [
        { name: 'Overview', current: true },
        { name: 'People', current: false },
        { name: 'Proposals', current: false },
        { name: 'Checklist', current: false },
        { name: 'Settings', current: false },
    ]

    return (
        <div className="bg-white rounded-b-[2.5rem] shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
            <Tab.Group>
                <div className="border-b border-zinc-100 px-8">
                    <Tab.List className="-mb-px flex space-x-8 overflow-x-auto scroller-none">
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.name}
                                className={({ selected }) =>
                                    classNames(
                                        selected
                                            ? 'border-yellow-400 text-zinc-900'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300',
                                        'whitespace-nowrap py-6 px-1 border-b-4 font-bold text-sm focus:outline-none transition-colors'
                                    )
                                }
                            >
                                {tab.name}
                            </Tab>
                        ))}
                    </Tab.List>
                </div>

                <Tab.Panels className="flex-1 p-8 md:p-12 bg-zinc-50/50">

                    {/* 1. Overview Tab */}
                    <Tab.Panel className="focus:outline-none space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2">
                                <h3 className="text-xl font-black text-zinc-900 mb-4">About Event</h3>
                                <div className="prose prose-zinc max-w-none text-zinc-600 whitespace-pre-wrap">
                                    {event.description || "No description provided."}
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                                    <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">Organizer</h4>
                                    <div className="flex items-center gap-4">
                                        {user?.avatar_url ? (
                                            <Image
                                                src={user.avatar_url}
                                                alt={user.full_name}
                                                width={48}
                                                height={48}
                                                className="rounded-full object-cover ring-2 ring-zinc-100"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold text-lg">
                                                {user?.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-zinc-900">{user?.full_name}</p>
                                            <p className="text-xs text-zinc-500">Event Host</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tab.Panel>

                    {/* 2. People Tab */}
                    <Tab.Panel className="focus:outline-none animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-zinc-900">Participants</h3>
                            <button
                                onClick={() => setIsInviteOpen(true)}
                                className="px-5 py-2.5 bg-zinc-900 text-yellow-400 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                </svg>
                                Invite People
                            </button>
                        </div>

                        {/* Placeholder for People List - Future Impl: EventParticipantList */}
                        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-400 min-h-[300px] flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-300">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p>No participants yet. Invite someone!</p>
                        </div>
                    </Tab.Panel>

                    {/* 3. Proposals Tab */}
                    <Tab.Panel className="focus:outline-none">
                        <DashboardTabProposals event={event} />
                    </Tab.Panel>

                    {/* 4. Checklist Tab */}
                    <Tab.Panel className="focus:outline-none">
                        <DashboardTabChecklist event={event} />
                    </Tab.Panel>

                    {/* 5. Settings Tab */}
                    <Tab.Panel className="focus:outline-none">
                        <DashboardTabSettings event={event} onUpdate={onUpdate} />
                    </Tab.Panel>

                </Tab.Panels>
            </Tab.Group>

            <EventInviteModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                eventId={event.id}
                eventTitle={event.title}
            />
        </div>
    )
}
