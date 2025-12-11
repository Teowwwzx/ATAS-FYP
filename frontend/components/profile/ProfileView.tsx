import React from 'react'
import Link from 'next/link'
import { ProfileResponse, UserMeResponse, MyEventItem, OrganizationResponse } from '@/services/api.types'

interface ProfileViewProps {
    profile: ProfileResponse
    userInfo: UserMeResponse | null
    events: MyEventItem[]
    historyEvents?: any[] // Using any[] for now as it matches the state in parent
    followers: any[]
    following: any[]
    isOwnProfile: boolean
    onEdit: () => void
    orgsById: Record<string, OrganizationResponse>
    viewFriends: 'none' | 'followers' | 'following'
    setViewFriends: (v: 'none' | 'followers' | 'following') => void
}

export function ProfileView({
    profile,
    userInfo,
    events,
    historyEvents = [],
    followers,
    following,
    isOwnProfile,
    onEdit,
    orgsById,
    viewFriends,
    setViewFriends
}: ProfileViewProps) {
    const jobs = profile.job_experiences || []
    const educations = profile.educations || []

    const renderOrgContent = (org: OrganizationResponse | undefined, fallbackText?: string) => {
        if (!org) return fallbackText || null

        const isApproved = org.status === 'approved' // Assuming API returns 'approved'

        if (isApproved) {
            return (
                <Link href={`/organizations/${org.id}`} className="hover:underline text-zinc-900 font-bold hover:text-yellow-600 transition-colors">
                    {org.name}
                </Link>
            )
        }

        return (
            <div className="flex items-center gap-2">
                <span className="text-zinc-700 font-bold">{org.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-wider whitespace-nowrap" title="Waiting for admin approval">
                    Pending Approval
                </span>
            </div>
        )
    }

    const renderOrgLogo = (org: OrganizationResponse | undefined, fallbackIcon: React.ReactNode) => {
        const content = (
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-zinc-400 overflow-hidden border border-gray-100">
                {org?.logo_url ? (
                    <img src={org.logo_url} className="w-full h-full object-cover" alt={org.name} />
                ) : (
                    fallbackIcon
                )}
            </div>
        )

        if (org && org.status === 'approved') {
            return <Link href={`/organizations/${org.id}`}>{content}</Link>
        }
        return content
    }

    return (
        <div className="animate-fadeIn pb-20">
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-8 mt-8">

                {/* Left Column (Sticky Sidebar on Desktop) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Expertise / Intents - PRIORITY FIRST */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg text-zinc-900 mb-4">Expertise</h3>
                        <div className="space-y-4">
                            {profile.intents && profile.intents.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Detailed intents</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.intents.map((intent, i) => (
                                            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 uppercase tracking-wider">
                                                {intent.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {profile.tags && profile.tags.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.tags.map(tag => (
                                            <span key={tag.id} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider">
                                                #{tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(!profile.intents?.length && !profile.tags?.length) && (
                                <p className="text-zinc-400 italic text-sm">No specific expertise tags added.</p>
                            )}
                        </div>
                    </div>

                    {/* Socials Card */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg text-zinc-900 mb-4">Connect</h3>
                        <div className="space-y-3">
                            {[
                                { url: profile.website_url, label: 'Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                                { url: profile.github_url, label: 'GitHub', icon: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
                                { url: profile.linkedin_url, label: 'LinkedIn', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
                                { url: profile.twitter_url, label: 'Twitter', icon: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
                            ].map((social) => social.url ? (
                                <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-zinc-900 hover:text-yellow-400 text-zinc-600 transition-all group">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-zinc-800"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={social.icon} /></svg></div>
                                    <span className="font-bold text-sm">{social.label}</span>
                                </a>
                            ) : null)}
                            {![profile.website_url, profile.github_url, profile.linkedin_url, profile.twitter_url].some(Boolean) && (
                                <p className="text-zinc-400 italic text-sm">No specific social links</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (Main Content) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* About */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-xl text-zinc-900 mb-4">About</h3>
                        <p className="text-zinc-600 font-medium leading-relaxed whitespace-pre-wrap">
                            {profile.bio || <span className="text-zinc-400 italic">No bio added yet.</span>}
                        </p>
                    </div>

                    {/* Events History (NEW) */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-xl text-zinc-900 mb-6 flex items-center justify-between">
                            <span>Events History</span>
                            {historyEvents.length > 0 && <span className="text-sm font-bold bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full">{historyEvents.length}</span>}
                        </h3>
                        {historyEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {historyEvents.map((evt: any) => {
                                    const isOrganizer = userInfo && evt.organizer_id === userInfo.id
                                    return (
                                        <Link key={evt.id} href={`/events/${evt.id}`} className="group block bg-gray-50 hover:bg-white border border-gray-100 hover:border-yellow-400 p-4 rounded-2xl transition-all shadow-sm hover:shadow-md">
                                            <div className="flex gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                                                    {evt.cover_url ? (
                                                        <img src={evt.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={evt.title} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-zinc-900 group-hover:text-yellow-600 transition-colors truncate mb-1">{evt.title}</div>
                                                    <div className="text-xs text-zinc-500 font-medium mb-2">
                                                        {evt.start_datetime ? new Date(evt.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {isOrganizer ? (
                                                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-md uppercase tracking-wide">Organizer</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md uppercase tracking-wide">Participant</span>
                                                        )}
                                                        {evt.status === 'ended' && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-md uppercase tracking-wide">Ended</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-zinc-400 italic">No event history available.</p>
                        )}
                    </div>

                    {/* Experience */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-xl text-zinc-900 mb-6">Work Experience</h3>
                        {jobs.length > 0 ? (
                            <div className="space-y-8">
                                {jobs.map((job, i) => {
                                    const org = job.org_id ? orgsById[job.org_id] : undefined
                                    return (
                                        <div key={i} className="flex gap-5">
                                            {renderOrgLogo(org, <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>)}

                                            <div>
                                                <div className="font-black text-lg text-zinc-900 leading-tight mb-0.5">{job.title}</div>
                                                <div className="text-zinc-700 font-medium flex flex-wrap items-center gap-1.5">
                                                    {renderOrgContent(org, job.description)}
                                                </div>
                                                <div className="text-zinc-400 text-sm mt-1 font-medium">
                                                    {job.start_datetime ? new Date(job.start_datetime).getFullYear() : ''}
                                                    {job.end_datetime ? ` - ${new Date(job.end_datetime).getFullYear()}` : job.start_datetime ? ' - Present' : ''}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : <p className="text-zinc-400 italic">No work experience added.</p>}
                    </div>

                    {/* Education */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-xl text-zinc-900 mb-6">Education</h3>
                        {educations.length > 0 ? (
                            <div className="space-y-8">
                                {educations.map((edu, i) => {
                                    const org = edu.org_id ? orgsById[edu.org_id] : undefined
                                    return (
                                        <div key={i} className="flex gap-5">
                                            {renderOrgLogo(org, <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>)}

                                            <div>
                                                <div className="font-black text-lg text-zinc-900 leading-tight mb-0.5">{edu.qualification}</div>
                                                <div className="text-zinc-600 font-bold mb-0.5">{edu.field_of_study}</div>
                                                {org && (
                                                    <div className="text-sm font-medium text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                                        at {renderOrgContent(org)}
                                                    </div>
                                                )}
                                                <div className="text-zinc-400 text-sm mt-1 font-medium">
                                                    {edu.start_datetime ? new Date(edu.start_datetime).getFullYear() : ''}
                                                    {edu.end_datetime ? ` - ${new Date(edu.end_datetime).getFullYear()}` : edu.start_datetime ? ' - Present' : ''}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : <p className="text-zinc-400 italic">No education added.</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}
