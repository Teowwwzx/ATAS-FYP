'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
    getMyProfile, updateProfile, updateAvatar, updateCoverPicture, getMe, getMyEvents,
    getTags, attachMyTag, detachMyTag, addMyEducation, deleteMyEducation, getMyFollows, getMyFollowers, unfollowUser,
    addMyJobExperience, deleteMyJobExperience
} from '@/services/api'
import {
    ProfileResponse, ProfileUpdate, UserMeResponse, MyEventItem,
    EducationCreate, EducationResponse, JobExperienceCreate
} from '@/services/api.types'
import { toast } from 'react-hot-toast'

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [userInfo, setUserInfo] = useState<UserMeResponse | null>(null)
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string }[]>([])
    const [followers, setFollowers] = useState<any[]>([])
    const [following, setFollowing] = useState<any[]>([])
    const [newEducation, setNewEducation] = useState<EducationCreate>({ qualification: '', field_of_study: '' })
    const [newJob, setNewJob] = useState<JobExperienceCreate>({ title: '', description: '' })
    const [viewFriends, setViewFriends] = useState<'none' | 'followers' | 'following'>('none')
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [addingEdu, setAddingEdu] = useState(false)
    const [addingJob, setAddingJob] = useState(false)
    const [formData, setFormData] = useState<ProfileUpdate>({})

    const avatarInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const [profileData, userData, eventsData, tagsData, followersData, followingData] = await Promise.all([
                getMyProfile(),
                getMe(),
                getMyEvents(),
                getTags(),
                getMyFollowers(),
                getMyFollows()
            ])

            setProfile(profileData)
            setUserInfo(userData)
            setEvents(eventsData)
            setAvailableTags(tagsData)
            setFollowers(followersData)
            setFollowing(followingData)

            setFormData({
                full_name: profileData.full_name,
                bio: profileData.bio,
                linkedin_url: profileData.linkedin_url,
                github_url: profileData.github_url,
                instagram_url: profileData.instagram_url,
                twitter_url: profileData.twitter_url,
                website_url: profileData.website_url,
                visibility: profileData.visibility,
                title: profileData.title,
                availability: profileData.availability,
                country: profileData.country,
                city: profileData.city,
                origin_country: profileData.origin_country,
                can_be_speaker: profileData.can_be_speaker,
                intents: profileData.intents,
                today_status: profileData.today_status,
            })
        } catch (error) {
            console.error('Failed to load profile', error)
            toast.error('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const handleTagToggle = async (tagId: string) => {
        const hasTag = profile?.tags?.some(t => t.id === tagId)
        try {
            if (hasTag) {
                await detachMyTag(tagId)
                setProfile(prev => prev ? { ...prev, tags: prev.tags?.filter(t => t.id !== tagId) } : null)
                toast.success('Tag removed')
            } else {
                await attachMyTag(tagId)
                const tag = availableTags.find(t => t.id === tagId)
                if (tag) {
                    setProfile(prev => prev ? { ...prev, tags: [...(prev.tags || []), tag] } : null)
                    toast.success('Tag added')
                }
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to update tags')
        }
    }

    const handleAddEducation = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddingEdu(true)
        try {
            const edu = await addMyEducation(newEducation)
            setProfile(prev => prev ? { ...prev, educations: [...(prev.educations || []), edu] } : null)
            setNewEducation({ qualification: '', field_of_study: '' })
            toast.success('Education added')
        } catch (error) {
            console.error(error)
            toast.error('Failed to add education')
        } finally {
            setAddingEdu(false)
        }
    }

    const handleDeleteEducation = async (id: string) => {
        if (!confirm('Delete this education?')) return
        try {
            await deleteMyEducation(id)
            setProfile(prev => prev ? { ...prev, educations: prev.educations?.filter(e => e.id !== id) } : null)
            toast.success('Education deleted')
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete education')
        }
    }

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddingJob(true)
        try {
            const job = await addMyJobExperience(newJob)
            setProfile(prev => prev ? { ...prev, job_experiences: [...(prev.job_experiences || []), job] } : null)
            setNewJob({ title: '', description: '' })
            toast.success('Experience added')
        } catch (error) {
            console.error(error)
            toast.error('Failed to add experience')
        } finally {
            setAddingJob(false)
        }
    }

    const handleDeleteJob = async (id: string) => {
        if (!confirm('Delete this experience?')) return
        try {
            await deleteMyJobExperience(id)
            setProfile(prev => prev ? { ...prev, job_experiences: prev.job_experiences?.filter(j => j.id !== id) } : null)
            toast.success('Experience deleted')
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete experience')
        }
    }

    const handleUnfollow = async (userId: string) => {
        if (!confirm('Unfollow this user?')) return
        try {
            await unfollowUser(userId)
            setFollowing(prev => prev.filter(f => f.followee_id !== userId))
            toast.success('Unfollowed')
        } catch (error) {
            console.error(error)
            toast.error('Failed to unfollow')
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const updated = await updateProfile(formData)
            setProfile(updated)
            setEditing(false)
            toast.success('Profile updated!')
        } catch (error) {
            console.error('Failed to update profile', error)
            toast.error('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0]
        if (!file) return

        // Reset input value to allow re-selecting the same file
        e.target.value = ''

        const loadingToast = toast.loading(`Updating ${type}...`)

        try {
            if (type === 'avatar') {
                const updated = await updateAvatar(file)
                setProfile(updated)
            } else {
                const updated = await updateCoverPicture(file)
                setProfile(updated)
            }
            toast.success(`${type === 'avatar' ? 'Avatar' : 'Cover'} updated!`, { id: loadingToast })
        } catch (error) {
            console.error(`Failed to update ${type}`, error)
            toast.error(`Failed to update ${type}`, { id: loadingToast })
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
            </div>
        )
    }

    if (!profile) {
        return <div className="p-8 text-center text-zinc-900">Profile not found.</div>
    }

    const isProfileIncomplete = !profile.bio || !profile.title || !profile.country || (profile.educations?.length === 0 && profile.job_experiences?.length === 0)

    return (
        <div className="min-h-screen bg-amber-50 pb-20">
            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                    <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 transition-colors rounded-full hover:bg-white/10">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            <div className="w-full pt-6 px-4 sm:px-6 lg:px-8">
                
                {/* Cover Image */}
                <div className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-sm group">
                    {profile.cover_url ? (
                        <img
                            src={profile.cover_url}
                            alt="Cover"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                            onClick={() => setPreviewImage(profile.cover_url ?? null)}
                        />
                    ) : (
                        <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                            <div className="text-zinc-900/10 text-9xl font-black select-none">ATAS</div>
                        </div>
                    )}

                    {/* Cover Edit Button - Improved Visibility */}
                    <button
                        onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
                        className="absolute top-4 right-4 z-20 bg-white text-zinc-900 p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-yellow-400"
                        title="Change Cover"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <input
                        ref={coverInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'cover')}
                    />
                </div>

                <div className="relative -mt-20 flex flex-col items-start w-full">
                    {/* Avatar */}
                    <div className="relative group mb-6">
                        <div 
                            className="h-40 w-40 rounded-[2.5rem] ring-8 ring-amber-50 bg-white overflow-hidden shadow-2xl cursor-pointer relative"
                            onClick={() => profile.avatar_url && setPreviewImage(profile.avatar_url)}
                        >
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-5xl text-yellow-400 font-bold">
                                    {profile.full_name.charAt(0)}
                                </div>
                            )}
                            
                            {/* Avatar Overlay on Hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                        </div>

                        {/* Avatar Edit Button - Improved Visibility */}
                        <button
                            onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                            className="absolute bottom-2 right-2 z-30 bg-zinc-900 text-yellow-400 p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-zinc-800 border-2 border-white"
                            title="Change Avatar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'avatar')}
                        />
                    </div>

                    {/* Categorized View Mode */}
                    {!editing && (
                        <div className="flex flex-col gap-8 pb-12 animate-fadeIn">
                            {/* Profile Header Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 tracking-tight mb-2">{profile.full_name}</h1>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-zinc-600 font-medium mb-4">
                                        {userInfo && <span className="font-mono text-sm text-zinc-400">{userInfo.email}</span>}
                                        {profile.title && (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                                                <span className="text-zinc-900 font-bold">{profile.title}</span>
                                            </>
                                        )}
                                        {(profile.city || profile.country) && (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                                                <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Stats Row */}
                                    <div className="flex items-center gap-6 text-sm font-bold select-none">
                                        <span onClick={() => setViewFriends(viewFriends === 'followers' ? 'none' : 'followers')} 
                                              className={`cursor-pointer hover:text-zinc-900 transition-colors ${viewFriends === 'followers' ? 'text-zinc-900 decoration-yellow-400 decoration-2 underline underline-offset-4' : 'text-zinc-500'}`}>
                                            <span className="text-zinc-900 text-lg">{followers.length}</span> Followers
                                        </span>
                                        <span onClick={() => setViewFriends(viewFriends === 'following' ? 'none' : 'following')}
                                              className={`cursor-pointer hover:text-zinc-900 transition-colors ${viewFriends === 'following' ? 'text-zinc-900 decoration-yellow-400 decoration-2 underline underline-offset-4' : 'text-zinc-500'}`}>
                                            <span className="text-zinc-900 text-lg">{following.length}</span> Following
                                        </span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-6 py-2.5 bg-zinc-900 text-yellow-400 rounded-xl shadow-lg font-bold hover:bg-zinc-800 hover:scale-105 transition-all duration-200 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Edit Profile
                                </button>
                            </div>

                            {/* Friends Panel (Conditional) */}
                            {viewFriends !== 'none' && (
                                <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-gray-100 animate-fadeIn">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                                        <h3 className="font-bold text-lg capitalize text-zinc-900">{viewFriends}</h3>
                                        <button onClick={() => setViewFriends('none')} className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {viewFriends === 'followers' ? followers.map(f => (
                                            <div key={f.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
                                                    {f.follower?.avatar_url ? <img src={f.follower.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-100">{f.follower?.full_name?.charAt(0) || '?'}</div>}
                                                </div>
                                                <div className="flex-1 min-w-0"><div className="font-bold text-sm text-zinc-900 truncate">{f.follower?.full_name || 'Unknown User'}</div></div>
                                            </div>
                                        )) : following.map(f => (
                                            <div key={f.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
                                                        {f.followee?.avatar_url ? <img src={f.followee.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-100">{f.followee?.full_name?.charAt(0) || '?'}</div>}
                                                    </div>
                                                    <div className="font-bold text-sm text-zinc-900 truncate">{f.followee?.full_name || 'Unknown User'}</div>
                                                </div>
                                                <button onClick={() => handleUnfollow(f.followee_id)} className="ml-3 text-xs font-bold bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-full text-zinc-600 transition-all shadow-sm">Unfollow</button>
                                            </div>
                                        ))}
                                        {((viewFriends === 'followers' && followers.length === 0) || (viewFriends === 'following' && following.length === 0)) && <p className="text-zinc-400 text-sm italic text-center py-4">No one to show here yet.</p>}
                                    </div>
                                </div>
                            )}

                            {/* Profile Completion Banner */}
                            {isProfileIncomplete && (
                                <div className="mb-8 bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-[2rem] p-6 shadow-sm text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn border border-zinc-800">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-yellow-400 rounded-lg text-zinc-900">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-bold text-lg">Complete your profile</h3>
                                        </div>
                                        <p className="text-zinc-400 text-sm mb-3 font-medium">
                                            A complete profile attracts 3x more views and opportunities.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {!profile.bio && <span className="px-3 py-1 bg-white/10 text-yellow-400 text-xs font-bold rounded-lg border border-white/5">Add Bio</span>}
                                            {!profile.title && <span className="px-3 py-1 bg-white/10 text-yellow-400 text-xs font-bold rounded-lg border border-white/5">Add Title</span>}
                                            {!profile.country && <span className="px-3 py-1 bg-white/10 text-yellow-400 text-xs font-bold rounded-lg border border-white/5">Add Location</span>}
                                            {(profile.educations?.length === 0 && profile.job_experiences?.length === 0) && <span className="px-3 py-1 bg-white/10 text-yellow-400 text-xs font-bold rounded-lg border border-white/5">Add Experience</span>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setEditing(true)}
                                        className="px-6 py-3 bg-yellow-400 text-zinc-900 text-sm font-bold rounded-xl hover:bg-yellow-300 transition-colors whitespace-nowrap shadow-lg shadow-yellow-400/20"
                                    >
                                        Complete Now
                                    </button>
                                </div>
                            )}

                            {/* Categorized Grid */}
                            <div className="flex flex-col gap-6">
                                {/* About / Overview */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                                    <h3 className="font-black text-xl text-zinc-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        About
                                        <button onClick={() => setEditing(true)} className="ml-auto text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-full hover:bg-gray-100" title="Edit About">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    </h3>
                                    <p className="text-zinc-600 font-medium leading-relaxed mb-6 max-w-4xl">
                                        {profile.bio || <span className="text-zinc-400 italic">No bio added yet.</span>}
                                    </p>
                                    
                                    <div className="space-y-3 pt-4 border-t border-gray-50">
                                        {profile.today_status && (
                                            <div className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                                                <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span></span>
                                                {profile.today_status}
                                            </div>
                                        )}
                                        {profile.origin_country && (
                                            <div className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                                                <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                                                From {profile.origin_country}
                                            </div>
                                        )}
                                        {profile.can_be_speaker && (
                                            <div className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                                                <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></span>
                                                Open to Speaking
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expertise & Intents */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                                    <h3 className="font-black text-xl text-zinc-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        Expertise & Intents
                                        <button onClick={() => setEditing(true)} className="ml-auto text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-full hover:bg-gray-100" title="Edit Expertise">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        {profile.intents && profile.intents.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Looking for</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.intents.map((intent, i) => (
                                                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 uppercase tracking-wider">
                                                            {intent.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {profile.skills && profile.skills.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Skills</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.skills.map(skill => (
                                                        <span key={skill.id} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-xs font-bold border border-zinc-200">
                                                            {skill.name}
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
                                        
                                        {(!profile.intents?.length && !profile.skills?.length && !profile.tags?.length) && (
                                            <p className="text-zinc-400 italic">No expertise or interests listed.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Experience & Education */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                                    <h3 className="font-black text-xl text-zinc-900 mb-6 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Experience & Education
                                        <button onClick={() => setEditing(true)} className="ml-auto text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-full hover:bg-gray-100" title="Edit Experience">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="font-bold text-lg text-zinc-900 mb-3 border-b border-gray-100 pb-2">Work Experience</h4>
                                            {profile.job_experiences && profile.job_experiences.length > 0 ? (
                                                <div className="space-y-4">
                                                    {profile.job_experiences.map((job, i) => (
                                                        <div key={i} className="flex gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-500">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-zinc-900">{job.title}</div>
                                                                {job.description && <div className="text-zinc-500 text-sm mt-0.5">{job.description}</div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-zinc-400 italic text-sm">No work experience added.</p>}
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-lg text-zinc-900 mb-3 border-b border-gray-100 pb-2">Education</h4>
                                            {profile.educations && profile.educations.length > 0 ? (
                                                <div className="space-y-4">
                                                    {profile.educations.map((edu, i) => (
                                                        <div key={i} className="flex gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-500">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-zinc-900">{edu.qualification}</div>
                                                                <div className="text-zinc-500 text-sm mt-0.5">{edu.field_of_study}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-zinc-400 italic text-sm">No education added.</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Socials */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 h-fit">
                                    <h3 className="font-black text-xl text-zinc-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        Connect
                                        <button onClick={() => setEditing(true)} className="ml-auto text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-full hover:bg-gray-100" title="Edit Socials">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {[
                                            { url: profile.website_url, label: 'Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                                            { url: profile.github_url, label: 'GitHub', icon: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
                                            { url: profile.linkedin_url, label: 'LinkedIn', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
                                            { url: profile.twitter_url, label: 'Twitter', icon: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
                                            { url: profile.instagram_url, label: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                                        ].map((social) => social.url ? (
                                            <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-zinc-900 hover:text-yellow-400 text-zinc-600 transition-all group">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-zinc-800"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={social.icon} /></svg></div>
                                                <span className="font-bold text-sm">{social.label}</span>
                                            </a>
                                        ) : null)}
                                        {![profile.website_url, profile.github_url, profile.linkedin_url, profile.twitter_url, profile.instagram_url].some(Boolean) && (
                                            <p className="text-zinc-400 italic text-sm col-span-full">No social links added.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Actions (Save/Cancel) */}
                    {editing && (
                        <div className="pb-8 w-full flex justify-end">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditing(false)}
                                    className="px-6 py-3 bg-white text-zinc-900 rounded-full font-bold shadow-sm hover:bg-gray-50 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-8 py-3 bg-yellow-400 text-zinc-900 rounded-full shadow-lg font-bold hover:bg-yellow-300 hover:scale-105 transition-all duration-200 disabled:opacity-70"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Edit Form */}
                    {editing && (
                        <div className="mt-8 animate-fadeIn max-w-3xl mx-auto space-y-8">
                            {/* Basic Info */}
                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h3 className="text-2xl font-black text-zinc-900 mb-6">Basic Info</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={formData.full_name || ''}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder="Your Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Professional Title</label>
                                            <input
                                                type="text"
                                                value={formData.title || ''}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder="e.g. Graphic Designer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Bio</label>
                                            <textarea
                                                rows={4}
                                                value={formData.bio || ''}
                                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder="Tell us about yourself"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Availability</label>
                                            <input
                                                type="text"
                                                value={formData.availability || ''}
                                                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder="e.g. Weekends only"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">City</label>
                                                <input
                                                    type="text"
                                                    value={formData.city || ''}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                    className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                    placeholder="e.g. Singapore"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Country</label>
                                                <input
                                                    type="text"
                                                    value={formData.country || ''}
                                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                    className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                    placeholder="e.g. Singapore"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Origin Country</label>
                                            <input
                                                type="text"
                                                value={formData.origin_country || ''}
                                                onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder="Where are you from?"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Today's Status</label>
                                            <input
                                                type="text"
                                                value={formData.today_status || ''}
                                                onChange={(e) => setFormData({ ...formData, today_status: e.target.value })}
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder="e.g. Open to offers"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                                            <input
                                                type="checkbox"
                                                id="can_be_speaker"
                                                checked={formData.can_be_speaker || false}
                                                onChange={(e) => setFormData({ ...formData, can_be_speaker: e.target.checked })}
                                                className="w-5 h-5 rounded text-yellow-400 focus:ring-yellow-400 border-gray-300"
                                            />
                                            <label htmlFor="can_be_speaker" className="font-bold text-zinc-900">I am open to being a speaker</label>
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Education Management */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h3 className="text-2xl font-black text-zinc-900 mb-6">Education</h3>
                                {profile.educations && profile.educations.length > 0 && (
                                    <div className="space-y-4 mb-8">
                                        {profile.educations.map(edu => (
                                            <div key={edu.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                                <div>
                                                    <div className="font-bold text-zinc-900">{edu.qualification}</div>
                                                    <div className="text-sm text-zinc-500">{edu.field_of_study}</div>
                                                </div>
                                                <button onClick={() => handleDeleteEducation(edu.id)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="p-6 bg-amber-50 rounded-2xl">
                                    <h4 className="font-bold text-zinc-900 mb-4">Add Education</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Degree / Qualification"
                                            value={newEducation.qualification}
                                            onChange={e => setNewEducation({ ...newEducation, qualification: e.target.value })}
                                            className="rounded-xl border-zinc-200"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Field of Study / School"
                                            value={newEducation.field_of_study}
                                            onChange={e => setNewEducation({ ...newEducation, field_of_study: e.target.value })}
                                            className="rounded-xl border-zinc-200"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddEducation}
                                        disabled={addingEdu || !newEducation.qualification || !newEducation.field_of_study}
                                        className="bg-zinc-900 text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                                    >
                                        {addingEdu ? 'Adding...' : 'Add Education'}
                                    </button>
                                </div>
                            </div>

                            {/* Job Experience Management */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h3 className="text-2xl font-black text-zinc-900 mb-6">Work Experience</h3>
                                {profile.job_experiences && profile.job_experiences.length > 0 && (
                                    <div className="space-y-4 mb-8">
                                        {profile.job_experiences.map(job => (
                                            <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                                <div>
                                                    <div className="font-bold text-zinc-900">{job.title}</div>
                                                    <div className="text-sm text-zinc-500">{job.description}</div>
                                                </div>
                                                <button onClick={() => handleDeleteJob(job.id)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {addingJob ? (
                                    <div className="animate-pulse bg-gray-50 p-4 rounded-2xl flex items-center justify-center text-zinc-400 font-bold">
                                        Adding...
                                    </div>
                                ) : (
                                    <form onSubmit={handleAddJob} className="bg-gray-50 p-6 rounded-2xl space-y-4">
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Job Title / Role"
                                                required
                                                className="w-full bg-white border-0 rounded-xl px-4 py-3 font-bold text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                                                value={newJob.title}
                                                onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Description (Company, Years, etc.)"
                                                className="w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                                                value={newJob.description || ''}
                                                onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                                        >
                                            Add Experience
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Specialist Tags */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h3 className="text-2xl font-black text-zinc-900 mb-6">Specialist Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.length === 0 && <p className="text-zinc-500 italic">No tags available.</p>}
                                    {availableTags.map(tag => {
                                        const isSelected = profile.tags?.some(t => t.id === tag.id)
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => handleTagToggle(tag.id)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${isSelected
                                                    ? 'bg-zinc-900 text-yellow-400 shadow-md ring-2 ring-zinc-900'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {tag.name} {isSelected && '✓'}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Social Links Form */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h3 className="text-2xl font-black text-zinc-900 mb-6">Social Links</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { key: 'website_url', label: 'Website', placeholder: 'https://example.com' },
                                        { key: 'github_url', label: 'GitHub', placeholder: 'https://github.com/username' },
                                        { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
                                        { key: 'twitter_url', label: 'Twitter', placeholder: 'https://twitter.com/username' },
                                        { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/username' },
                                    ].map((field) => (
                                        <div key={field.key}>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">{field.label}</label>
                                            <input
                                                type="url"
                                                value={(formData as any)[field.key] || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder={field.placeholder}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}



                    {/* Events Section */}
                    {!editing && events.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-2xl font-black text-zinc-900 mb-6 text-center">Current Events</h2>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {events.map((evt) => (
                                    <Link key={evt.event_id} href={`/events/${evt.event_id}`} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all block group">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${evt.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {evt.status}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400">{new Date(evt.start_datetime).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-zinc-900 mb-2 group-hover:text-yellow-600 transition-colors">{evt.title}</h3>
                                        <div className="text-sm text-gray-500 font-medium">
                                            {evt.my_role ? (
                                                <span className="capitalize">Role: {evt.my_role}</span>
                                            ) : 'Participant'}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
