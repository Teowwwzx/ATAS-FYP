'use client'
import React, { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, getMyEvents, getMyProfile } from '@/services/api'
import { EventDetails, MyEventItem, ProfileResponse } from '@/services/api.types'
import { DashboardHeroCard } from '@/app/(app)/dashboard/DashboardHeroCard'
import { DashboardTabs } from '@/app/(app)/dashboard/DashboardTabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { getEventPhase, EventPhase } from '@/lib/eventPhases'
import { EventPreviewModal } from '@/app/(app)/dashboard/EventPreviewModal'
import { toast } from 'react-hot-toast'

function DashboardEventDetailsInner() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [user, setUser] = useState<ProfileResponse | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [phase, setPhase] = useState<EventPhase>(EventPhase.PRE_EVENT)
    const [loading, setLoading] = useState(true)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [evt, me, myEvents] = await Promise.all([
                    getEventById(id),
                    getMyProfile(),
                    getMyEvents().catch(() => [] as MyEventItem[]),
                ])
                setEvent(evt)
                setUser(me)
                const listItem = (myEvents || []).find(e => e.event_id === id)
                setRole(listItem?.my_role || null)
                setPhase(getEventPhase(evt))
            } catch (e) {
                toast.error('Failed to load event')
                router.push('/dashboard')
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchData()
    }, [id, router])

    const handleRefresh = async () => {
        if (!id) return
        try {
            const evt = await getEventById(id)
            setEvent(evt)
            setPhase(getEventPhase(evt))
        } catch {
            toast.error('Failed to refresh event')
        }
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12">
                <Skeleton height="400px" className="rounded-[2.5rem]" />
            </div>
        )
    }

    if (!event) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="text-zinc-500 font-medium">Event not found</div>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen pt-8 pb-12">
            <div className="max-w-[95%] xl:max-w-screen-2xl mx-auto px-4 md:px-8">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mb-4 text-sm font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                </button>

                <div className="w-full animate-fadeIn pb-12">
                    <DashboardHeroCard
                        event={event}
                        onPreview={() => setIsPreviewOpen(true)}
                        canEditCover={user?.user_id === event.organizer_id || role === 'committee'}
                        phase={phase}
                        onCoverUpdated={handleRefresh}
                        minimal
                    />

                    <DashboardTabs
                        event={event}
                        user={user}
                        role={role}
                        phase={phase}
                        onUpdate={handleRefresh}
                        onDelete={() => router.push('/dashboard')}
                    />
                </div>

                <EventPreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    event={event}
                />
            </div>
        </div>
    )
}

export default function DashboardEventDetailsPage() {
    return (
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12"><Skeleton height="400px" className="rounded-[2.5rem]" /></div>}>
            <DashboardEventDetailsInner />
        </Suspense>
    )
}
