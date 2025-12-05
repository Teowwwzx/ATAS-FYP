'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getProfileByUserId, getUserEventHistory, getReviewsByUser } from '@/services/api'
import { ProfileResponse, EventDetails, ReviewResponse } from '@/services/api.types'
import Link from 'next/link'
import { format } from 'date-fns'

export default function PublicProfilePage() {
    const params = useParams()
    const userId = params.id as string

    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [organizedEvents, setOrganizedEvents] = useState<EventDetails[]>([])
    const [attendedEvents, setAttendedEvents] = useState<EventDetails[]>([])
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'organized' | 'attended'>('organized')

    useEffect(() => {
        if (userId) {
            const loadData = async () => {
                try {
                    const [profileData, organizedData, attendedData, reviewsData] = await Promise.all([
                        getProfileByUserId(userId),
                        getUserEventHistory(userId, 'organized'),
                        getUserEventHistory(userId, 'participant'),
                        getReviewsByUser(userId)
                    ])
                    setProfile(profileData)
                    setOrganizedEvents(organizedData)
                    setAttendedEvents(attendedData)
                    setReviews(reviewsData)
                } catch (error: unknown) {
                    const e = error as { response?: { status?: number; data?: { detail?: string } } }
                    setError(e.response?.data?.detail || 'Failed to load profile.')
                } finally {
                    setIsLoading(false)
                }
            }
            loadData()
        }
    }, [userId])

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : null

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

    return (
        <div className="min-h-screen bg-amber-50 pb-20">
            <div className="max-w-5xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">

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
                        <div className="flex-1 pb-4 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-zinc-900 tracking-tight">{profile.full_name}</h1>
                                {averageRating && (
                                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full self-center sm:self-auto">
                                        <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="text-sm font-bold text-yellow-700">{averageRating}</span>
                                        <span className="text-xs text-yellow-600">({reviews.length})</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-lg text-zinc-600 font-medium max-w-2xl">{profile.bio || 'No bio provided.'}</p>
                        </div>
                    </div>
                </div>

                {/* Social Links */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                {/* Event History Tabs */}
                <div className="mt-12">
                    <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveTab('organized')}
                            className={`pb-3 text-lg font-bold transition-all ${activeTab === 'organized'
                                ? 'text-zinc-900 border-b-4 border-yellow-400'
                                : 'text-zinc-400 hover:text-zinc-700'
                                }`}
                        >
                            Organized Events
                            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs align-middle">
                                {organizedEvents.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('attended')}
                            className={`pb-3 text-lg font-bold transition-all ${activeTab === 'attended'
                                ? 'text-zinc-900 border-b-4 border-yellow-400'
                                : 'text-zinc-400 hover:text-zinc-700'
                                }`}
                        >
                            Attended Events
                            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs align-middle">
                                {attendedEvents.length}
                            </span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(activeTab === 'organized' ? organizedEvents : attendedEvents).map((event) => (
                            <Link
                                key={event.id}
                                href={`/events/${event.id}`}
                                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
                            >
                                <div className="h-48 relative overflow-hidden bg-gray-100">
                                    {event.cover_url ? (
                                        <img
                                            src={event.cover_url}
                                            alt={event.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-zinc-900 shadow-sm">
                                        {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-zinc-900 mb-2 line-clamp-2 group-hover:text-yellow-600 transition-colors">
                                        {event.title}
                                    </h3>
                                    <p className="text-zinc-500 text-sm line-clamp-2 mb-4 flex-1">
                                        {event.description || 'No description available.'}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-zinc-400 mt-auto pt-4 border-t border-gray-50">
                                        <span className="capitalize">{event.type}</span>
                                        <span>{event.format?.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {(activeTab === 'organized' ? organizedEvents : attendedEvents).length === 0 && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                            <p className="text-zinc-400 font-medium">No events found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
