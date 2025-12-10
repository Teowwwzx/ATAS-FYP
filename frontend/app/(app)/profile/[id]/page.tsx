'use client'

import React, { useState, useEffect, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProfileByUserId, getReviewsByUser, getPublicEvents, getMyEvents, inviteEventParticipant, getOrganizationById } from '@/services/api'
import { ProfileResponse, ReviewResponse, EventDetails, MyEventItem, OrganizationResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@/components/ui/Button'
import { BookExpertModal } from '@/components/modals/BookExpertModal'

export default function PublicProfilePage() {
    const params = useParams()
    const userId = params.id as string

    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [orgsById, setOrgsById] = useState<Record<string, OrganizationResponse>>({})

    // Event State
    const [organizedEvents, setOrganizedEvents] = useState<EventDetails[]>([])

    // Invite State
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [myEvents, setMyEvents] = useState<MyEventItem[]>([])
    const [selectedEventId, setSelectedEventId] = useState<string>('')
    const [inviting, setInviting] = useState(false)

    useEffect(() => {
        if (userId) {
            const fetchProfile = async () => {
                try {
                    const [profileData, eventsData] = await Promise.all([
                        getProfileByUserId(userId),
                        getPublicEvents()
                    ])
                    setProfile(profileData)

                    // Filter Organized Events
                    const userEvents = eventsData.filter(e => e.organizer_id === userId)
                    setOrganizedEvents(userEvents)

                    try {
                        const revs = await getReviewsByUser(userId)
                        setReviews(revs)
                    } catch { }

                    try {
                        const expOrgIds = Array.from(new Set([
                            ...(profileData.job_experiences?.map(j => j.org_id).filter(Boolean) as string[]),
                            ...(profileData.educations?.map(e => e.org_id).filter(Boolean) as string[])
                        ]))
                        if (expOrgIds.length > 0) {
                            const results = await Promise.all(expOrgIds.map(async (oid) => {
                                const org = await getOrganizationById(oid)
                                return [oid, org] as const
                            }))
                            setOrgsById(Object.fromEntries(results))
                        }
                    } catch { }
                } catch (error: unknown) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setError((error as any).response?.data?.detail || 'Failed to load profile.')
                } finally {
                    setIsLoading(false)
                }
            }
            fetchProfile()
        }
    }, [userId])

    // Fetch my events when opening modal
    useEffect(() => {
        if (showInviteModal) {
            getMyEvents()
                .then(events => {
                    // Only show events where I am organizer
                    setMyEvents(events.filter(e => e.my_role === 'organizer'))
                })
                .catch(() => toast.error('Failed to load your events'))
        }
    }, [showInviteModal])

    const handleInvite = async () => {
        if (!selectedEventId) return
        setInviting(true)
        try {
            await inviteEventParticipant(selectedEventId, {
                user_id: userId,
                role: 'speaker', // Defaulting to speaker as per user request
                description: 'Invited via Profile'
            })
            toast.success('Invitation sent successfully!')
            setShowInviteModal(false)
        } catch (error: unknown) {
            console.error(error)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error((error as any).response?.data?.detail || 'Failed to send invitation')
        } finally {
            setInviting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="text-center">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-100 max-w-md mx-auto">
                        <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">Profile Not Found</h3>
                        <p className="text-zinc-500">{error || "This profile doesn't exist or is private."}</p>
                    </div>
                </div>
            </div>
        )
    }

    // Determine if user is a student (not a speaker/expert)
    const isStudent = !profile.can_be_speaker

    return (
        <div className="min-h-screen bg-amber-50 pb-20">
            <div className="max-w-4xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">

                {/* Cover Image */}
                <div className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-sm group">
                    {profile.cover_url ? (
                        <img
                            src={profile.cover_url}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                            <div className="text-zinc-900/10 text-9xl font-black select-none">ATAS</div>
                        </div>
                    )}
                </div>

                <div className="relative px-6 sm:px-10 -mt-20">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="h-40 w-40 rounded-[2rem] ring-8 ring-amber-50 bg-white overflow-hidden shadow-xl">
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.full_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-5xl text-yellow-400 font-bold">
                                        {profile.full_name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name & Bio */}
                        <div className="flex-1 pb-4 text-center sm:text-left space-y-4">
                            <div>
                                <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-1">{profile.full_name}</h1>
                                <p className="text-lg text-zinc-600 font-medium max-w-2xl">{profile.bio || 'No bio provided.'}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                    {profile.title && (
                                        <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-sm font-bold">{profile.title}</span>
                                    )}
                                    {profile.availability && (
                                        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-bold">{profile.availability}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                                {isStudent ? (
                                    <button
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-zinc-900 rounded-xl font-bold hover:bg-yellow-500 transition-all shadow-md active:scale-95"
                                        onClick={() => toast.success('Friend request sent!')}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        Add Friend
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-zinc-900 rounded-xl font-bold hover:bg-yellow-500 transition-all shadow-md active:scale-95"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            Book Expert
                                        </button>
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-md active:scale-95"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                            Invite to Speak
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tags */}
                {profile.tags && profile.tags.length > 0 && (
                    <div className="mt-6 px-6 sm:px-10">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="flex flex-wrap gap-2">
                                {profile.tags.map(tag => (
                                    <span key={tag.id} className="px-3 py-1 rounded-full bg-amber-50 text-zinc-900 border border-yellow-200 text-sm font-bold">{tag.name}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Event Highlights Section */}
                <div className="mt-12 space-y-8">
                    {/* Organized Events */}
                    {organizedEvents.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-black text-zinc-900">Events Organized</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {organizedEvents.map(event => {
                                    const eventReviews = reviews.filter(r => r.event_id === event.id)
                                    const rating = eventReviews.length > 0
                                        ? eventReviews.reduce((sum, r) => sum + r.rating, 0) / eventReviews.length
                                        : undefined

                                    return (
                                        <div key={event.id} className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col">
                                            {/* Cover */}
                                            <div className="relative h-32 w-full overflow-hidden">
                                                {event.cover_url ? (
                                                    <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                ) : (
                                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                        <span className="text-zinc-700 text-4xl font-black opacity-20 uppercase">{event.title.charAt(0)}</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-zinc-900 shadow-sm">
                                                    {event.registration_type === 'free' ? 'FREE' : 'PAID'}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-4 flex flex-col flex-1">
                                                <h3 className="font-bold text-zinc-900 line-clamp-1 mb-1 group-hover:text-yellow-600 transition-colors">{event.title}</h3>
                                                <p className="text-xs text-zinc-500 font-medium mb-3">
                                                    {new Date(event.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>

                                                <div className="mt-auto flex items-center justify-between">
                                                    {/* Rating / Review */}
                                                    <div className="flex items-center gap-1">
                                                        <svg className={`w-4 h-4 ${rating ? 'text-yellow-400' : 'text-zinc-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                        <span className="text-sm font-bold text-zinc-700">{rating ? rating.toFixed(1) : 'New'}</span>
                                                        {eventReviews.length > 0 && <span className="text-xs text-zinc-400">({eventReviews.length})</span>}
                                                    </div>

                                                    <Link href={`/events/${event.id}`} className="text-xs font-bold text-yellow-600 hover:text-yellow-700">
                                                        View Details
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Experience */}
                    {profile.job_experiences && profile.job_experiences.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-8 8h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-black text-zinc-900">Experience</h2>
                            </div>
                            <ul className="space-y-4">
                                {profile.job_experiences.map(exp => {
                                    const org = exp.org_id ? orgsById[exp.org_id] : undefined
                                    return (
                                        <li key={exp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center overflow-hidden">
                                                {org?.logo_url ? (
                                                    <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="text-zinc-900 font-bold">{org?.name?.charAt(0) || '•'}</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-zinc-900">{exp.title}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {org?.name ? `${org.name}` : ''}
                                                    {exp.start_datetime ? ` • ${new Date(exp.start_datetime).toLocaleDateString()}` : ''}
                                                    {exp.end_datetime ? ` - ${new Date(exp.end_datetime).toLocaleDateString()}` : ''}
                                                </p>
                                                {exp.description && (
                                                    <p className="text-sm text-zinc-700 mt-1">{exp.description}</p>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}

                    {/* Education */}
                    {profile.educations && profile.educations.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 20.5c-2.177 0-4.316-.559-6.16-1.922L12 14z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-black text-zinc-900">Education</h2>
                            </div>
                            <ul className="space-y-4">
                                {profile.educations.map(edu => {
                                    const org = edu.org_id ? orgsById[edu.org_id] : undefined
                                    return (
                                        <li key={edu.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center overflow-hidden">
                                                {org?.logo_url ? (
                                                    <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="text-zinc-900 font-bold">{org?.name?.charAt(0) || '•'}</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-zinc-900">{edu.qualification || 'Education'}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {edu.field_of_study || ''}
                                                    {org?.name ? ` • ${org.name}` : ''}
                                                    {edu.start_datetime ? ` • ${new Date(edu.start_datetime).toLocaleDateString()}` : ''}
                                                    {edu.end_datetime ? ` - ${new Date(edu.end_datetime).toLocaleDateString()}` : ''}
                                                </p>
                                                {edu.remark && (
                                                    <p className="text-sm text-zinc-700 mt-1">{edu.remark}</p>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Social Links */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { url: profile.website_url, label: 'Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                        { url: profile.github_url, label: 'GitHub', icon: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
                        { url: profile.linkedin_url, label: 'LinkedIn', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
                        { url: profile.twitter_url, label: 'Twitter', icon: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
                        { url: profile.instagram_url, label: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                    ].map((social) => social.url && (
                        <a
                            key={social.label}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-yellow-400 transition-all duration-200"
                        >
                            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-zinc-900 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d={social.icon} />
                                </svg>
                            </div>
                            <div className="ml-4 overflow-hidden">
                                <p className="text-sm font-bold text-zinc-900">{social.label}</p>
                                <p className="text-xs text-zinc-500 truncate">{social.url.replace(/^https?:\/\//, '')}</p>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Reviews */}
                {!isStudent && (
                    <div className="mt-12">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900">Reviews</h3>
                                    <p className="text-sm text-zinc-500">Ratings and comments from events</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-yellow-500">
                                        {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '—'}
                                    </div>
                                    <div className="text-xs text-zinc-500">{reviews.length} review(s)</div>
                                </div>
                            </div>
                            {reviews.length === 0 ? (
                                <div className="p-6 text-zinc-500">No reviews yet.</div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {reviews.map(r => (
                                        <li key={r.id} className="px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 rounded-full bg-yellow-50 flex items-center justify-center text-zinc-900 font-bold">
                                                    {r.rating}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-zinc-700">{r.comment || 'No comment provided.'}</p>
                                                    <p className="mt-1 text-xs text-zinc-400 font-mono">Event: {r.event_id.slice(0, 8)}… • By: {r.reviewer_id.slice(0, 8)}… • {new Date(r.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Book Expert Modal */}
            <BookExpertModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                expertId={profile.user_id}
                expertName={profile.full_name}
            />
        </div>
    )
}
