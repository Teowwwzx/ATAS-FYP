'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
    getMyProfile, updateProfile, updateAvatar, updateCoverPicture, getMe, getMyEvents, getMyEventHistory,
    getTags, attachMyTag, detachMyTag, addMyEducation, deleteMyEducation, getMyFollows, getMyFollowers, unfollowUser,
    addMyJobExperience, deleteMyJobExperience,
    getPublicOrganizations, createOrganization, getOrganizationById
} from '@/services/api'
import {
    ProfileResponse, ProfileUpdate, UserMeResponse, MyEventItem,
    EducationCreate, EducationResponse, JobExperienceCreate, OrganizationResponse
} from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileView } from '@/components/profile/ProfileView'
import { ProfileEdit } from '@/components/profile/ProfileEdit'

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [userInfo, setUserInfo] = useState<UserMeResponse | null>(null)
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [historyEvents, setHistoryEvents] = useState<any[]>([])
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string }[]>([])
    const [followers, setFollowers] = useState<any[]>([])
    const [following, setFollowing] = useState<any[]>([])

    // States for Edit Mode
    const [newEducation, setNewEducation] = useState<EducationCreate>({ qualification: '', field_of_study: '' })
    const [newJob, setNewJob] = useState<JobExperienceCreate>({ title: '', description: '' })
    const [viewFriends, setViewFriends] = useState<'none' | 'followers' | 'following'>('none')
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const avatarInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    // Org Search
    const [orgSearch, setOrgSearch] = useState('')
    const [orgOptions, setOrgOptions] = useState<OrganizationResponse[]>([])
    const [orgLoading, setOrgLoading] = useState(false)
    const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(null)
    const [showCreateOrg, setShowCreateOrg] = useState(false)
    const [newOrgName, setNewOrgName] = useState('')
    const [newOrgType, setNewOrgType] = useState<'company' | 'university' | 'community' | 'nonprofit' | 'government'>('community')
    const [creatingOrg, setCreatingOrg] = useState(false)
    const [orgsById, setOrgsById] = useState<Record<string, OrganizationResponse>>({})

    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [addingEdu, setAddingEdu] = useState(false)
    const [addingJob, setAddingJob] = useState(false)
    const [formData, setFormData] = useState<ProfileUpdate>({})

    useEffect(() => {
        loadProfile()
    }, [])

    useEffect(() => {
        let active = true
        const q = orgSearch.trim()
        if (!q) {
            setOrgOptions([])
            return
        }
        setOrgLoading(true)
        const t = setTimeout(() => {
            getPublicOrganizations({ q, page: 1, page_size: 5 })
                .then(res => { if (active) setOrgOptions(res) })
                .catch(() => { if (active) setOrgOptions([]) })
                .finally(() => { if (active) setOrgLoading(false) })
        }, 300)
        return () => { active = false; clearTimeout(t) }
    }, [orgSearch])

    const loadProfile = async () => {
        try {
            const [profileData, userData, eventsData, historyData, tagsData, followersData, followingData] = await Promise.all([
                getMyProfile(),
                getMe(),
                getMyEvents(),
                getMyEventHistory(),
                getTags(),
                getMyFollowers(),
                getMyFollows()
            ])

            setProfile(profileData)
            setUserInfo(userData)
            setEvents(eventsData)
            setHistoryEvents(historyData)
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

            // Load organizations
            try {
                const expOrgIds = Array.from(new Set([
                    ...(profileData.job_experiences?.map(j => j.org_id).filter(Boolean) as string[]),
                    ...(profileData.educations?.map(e => e.org_id).filter(Boolean) as string[])
                ]))
                if (expOrgIds.length > 0) {
                    const results = await Promise.all(expOrgIds.map(async (oid) => {
                        try {
                            const org = await getOrganizationById(oid)
                            return [oid, org] as const
                        } catch { return null }
                    }))
                    const validResults = results.filter(r => r !== null) as [string, OrganizationResponse][]
                    setOrgsById(Object.fromEntries(validResults))
                }
            } catch { }

        } catch (error) {
            console.error('Failed to load profile', error)
            toast.error('Failed to load profile')
        } finally {
            setLoading(false)
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
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (error) {
            console.error('Failed to update profile', error)
            toast.error('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const loadingToast = toast.loading('Updating avatar...')
        try {
            const updated = await updateAvatar(file)
            setProfile(updated)
            toast.success('Avatar updated!', { id: loadingToast })
        } catch (error) {
            toast.error('Failed to update avatar', { id: loadingToast })
        }
    }

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const loadingToast = toast.loading('Updating cover...')
        try {
            const updated = await updateCoverPicture(file)
            setProfile(updated)
            toast.success('Cover updated!', { id: loadingToast })
        } catch (error) {
            toast.error('Failed to update cover', { id: loadingToast })
        }
    }

    // ... Handlers (Duplicated logic from previous monolithic file, but kept here for passing to Edit Component)
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
        } catch { toast.error('Failed to add education') } finally { setAddingEdu(false) }
    }

    const handleDeleteEducation = async (id: string) => {
        try {
            await deleteMyEducation(id)
            setProfile(prev => prev ? { ...prev, educations: prev.educations?.filter(e => e.id !== id) } : null)
            toast.success('Education deleted')
        } catch { toast.error('Failed to delete education') }
    }

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddingJob(true)
        try {
            const job = await addMyJobExperience(newJob)
            setProfile(prev => prev ? { ...prev, job_experiences: [...(prev.job_experiences || []), job] } : null)
            setNewJob({ title: '', description: '' })
            toast.success('Experience added')
            // Refresh organizations map if a new org was used
            if (job.org_id && !orgsById[job.org_id]) {
                const org = await getOrganizationById(job.org_id)
                setOrgsById(prev => ({ ...prev, [org.id]: org }))
            }
        } catch { toast.error('Failed to add experience') } finally { setAddingJob(false) }
    }

    const handleDeleteJob = async (id: string) => {
        try {
            await deleteMyJobExperience(id)
            setProfile(prev => prev ? { ...prev, job_experiences: prev.job_experiences?.filter(j => j.id !== id) } : null)
            toast.success('Experience deleted')
        } catch { toast.error('Failed to delete experience') }
    }

    const handleCreateOrg = async () => {
        setCreatingOrg(true)
        try {
            const org = await createOrganization({ name: newOrgName.trim(), type: newOrgType, visibility: 'public' })
            setSelectedOrg(org)
            setNewJob({ ...newJob, org_id: org.id })
            setShowCreateOrg(false)
            setOrgSearch('')
            setOrgOptions([])
            setNewOrgName('')
            toast.success('Organization created')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to create organization')
        } finally {
            setCreatingOrg(false)
        }
    }


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
            </div>
        )
    }

    if (!profile) return <div className="p-8 text-center text-zinc-900">Profile not found.</div>

    return (
        <div className="min-h-screen bg-amber-50">
            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                >
                    <img
                        src={previewImage}
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                        alt="Preview"
                    />
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-6 right-6 text-white text-opacity-70 hover:text-opacity-100 transition-opacity"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            <ProfileHeader
                profile={profile}
                isOwnProfile={true}
                followersCount={followers.length}
                followingCount={following.length}
                onViewFollowers={() => setViewFriends('followers')}
                onViewFollowing={() => setViewFriends('following')}
                onEdit={() => setEditing(true)}
                onAvatarChange={handleAvatarChange}
                onCoverChange={handleCoverChange}
                onPreviewImage={setPreviewImage}
                avatarInputRef={avatarInputRef}
                coverInputRef={coverInputRef}
            />

            {!editing ? (
                <ProfileView
                    profile={profile}
                    userInfo={userInfo}
                    events={events}
                    historyEvents={historyEvents}
                    followers={followers}
                    following={following}
                    isOwnProfile={true}
                    onEdit={() => setEditing(true)}
                    orgsById={orgsById}
                    viewFriends={viewFriends}
                    setViewFriends={setViewFriends}
                />
            ) : (
                <ProfileEdit
                    formData={formData}
                    setFormData={setFormData}
                    profile={profile}
                    newEducation={newEducation}
                    setNewEducation={setNewEducation}
                    onAddEducation={handleAddEducation}
                    onDeleteEducation={handleDeleteEducation}
                    addingEdu={addingEdu}
                    newJob={newJob}
                    setNewJob={setNewJob}
                    onAddJob={handleAddJob}
                    onDeleteJob={handleDeleteJob}
                    addingJob={addingJob}
                    orgSearch={orgSearch}
                    setOrgSearch={setOrgSearch}
                    orgOptions={orgOptions}
                    orgLoading={orgLoading}
                    selectedOrg={selectedOrg}
                    setSelectedOrg={setSelectedOrg}
                    showCreateOrg={showCreateOrg}
                    setShowCreateOrg={setShowCreateOrg}
                    newOrgName={newOrgName}
                    setNewOrgName={setNewOrgName}
                    newOrgType={newOrgType}
                    setNewOrgType={setNewOrgType}
                    onCreateOrg={handleCreateOrg}
                    creatingOrg={creatingOrg}
                    availableTags={availableTags}
                    onTagToggle={handleTagToggle}
                    myTags={profile.tags || []}
                    onSave={handleSave}
                    onCancel={() => setEditing(false)}
                    saving={saving}
                />
            )}
        </div>
    )
}
