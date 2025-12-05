'use client'

import React, { useState } from 'react'
import { Tab } from '@headlessui/react'
import { EventDetails, ProfileResponse } from '@/services/api.types'
import { EventInviteModal } from './EventInviteModal'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import { DashboardTabChecklist } from './DashboardTabChecklist'
import { DashboardTabProposals } from './DashboardTabProposals'
import { DashboardTabOverview } from './DashboardTabOverview'
import { DashboardTabPeople } from './DashboardTabPeople'
import { DashboardTabSettings } from './DashboardTabSettings'

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

interface DashboardTabsProps {
    event: EventDetails
    user: ProfileResponse | null
    role?: string | null
    onUpdate: () => void // Callback to refresh parent data
}

export function DashboardTabs({ event, user, role, onUpdate }: DashboardTabsProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [refreshPeople, setRefreshPeople] = useState(0)

    const isOrganizer = user?.user_id === event.organizer_id
    // Roles allowing proposal access: Organizer, Committee, Speaker, Sponsor
    // If exact role strings are needed, update checks. Assuming 'committee', 'speaker', 'sponsor'.
    const canViewProposals = isOrganizer || ['committee', 'speaker', 'sponsor'].includes(role || '')

    const allTabs = [
        { name: 'Overview', current: true },
        { name: 'People', current: false, hidden: !isOrganizer }, // Organizer only for management
        { name: 'Proposals', current: false, hidden: !canViewProposals },
        { name: 'Checklist', current: false, hidden: !isOrganizer },
        { name: 'Settings', current: false, hidden: !isOrganizer },
    ]

    const tabs = allTabs.filter(t => !t.hidden)

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
                    {!allTabs[0].hidden && (
                        <Tab.Panel className="focus:outline-none animate-fadeIn">
                            <DashboardTabOverview event={event} user={user} onUpdate={onUpdate} />
                        </Tab.Panel>
                    )}

                    {/* 2. People Tab */}
                    {!allTabs[1].hidden && (
                        <Tab.Panel className="focus:outline-none animate-fadeIn">
                            <DashboardTabPeople
                                event={event}
                                onInvite={() => setIsInviteOpen(true)}
                                key={refreshPeople}
                            />
                        </Tab.Panel>
                    )}

                    {/* 3. Proposals Tab */}
                    {!allTabs[2].hidden && (
                        <Tab.Panel className="focus:outline-none">
                            <DashboardTabProposals event={event} />
                        </Tab.Panel>
                    )}

                    {/* 4. Checklist Tab */}
                    {!allTabs[3].hidden && (
                        <Tab.Panel className="focus:outline-none">
                            <DashboardTabChecklist event={event} />
                        </Tab.Panel>
                    )}

                    {/* 5. Settings Tab */}
                    {!allTabs[4].hidden && (
                        <Tab.Panel className="focus:outline-none">
                            <DashboardTabSettings event={event} onUpdate={onUpdate} />
                        </Tab.Panel>
                    )}

                </Tab.Panels>
            </Tab.Group>


            <EventInviteModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                eventId={event.id}
                eventTitle={event.title}
                onSuccess={() => setRefreshPeople(prev => prev + 1)}
            />
        </div >
    )
}
