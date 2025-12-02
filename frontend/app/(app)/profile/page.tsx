'use client'

import React, { useEffect, useState, useRef } from 'react'
import { getMyProfile, updateProfile, updateAvatar, updateCoverPicture, getMe } from '@/services/api'
import { ProfileResponse, ProfileUpdate, UserMeResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [userInfo, setUserInfo] = useState<UserMeResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<ProfileUpdate>({})

    const avatarInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const [profileData, userData] = await Promise.all([
                getMyProfile(),
                getMe()
            ])

            setProfile(profileData)
            setUserInfo(userData)

            setFormData({
                full_name: profileData.full_name,
                bio: profileData.bio,
                linkedin_url: profileData.linkedin_url,
                github_url: profileData.github_url,
                instagram_url: profileData.instagram_url,
                twitter_url: profileData.twitter_url,
                website_url: profileData.website_url,
                visibility: profileData.visibility,
            })
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

    return (
        <div className="min-h-screen bg-amber-50 pb-20">
            <div className="max-w-4xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">

                {/* Cover Image */}
                <div className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-sm group">
                    {profile.cover_url ? (
                        <img
                            src={profile.cover_url}
                            alt="Cover"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                            <div className="text-zinc-900/10 text-9xl font-black select-none">ATAS</div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            className="opacity-0 group-hover:opacity-100 bg-white text-zinc-900 px-6 py-3 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-105"
                        >
                            Change Cover
                        </button>
                        <input
                            ref={coverInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'cover')}
                        />
                    </div>
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
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute bottom-2 right-2 bg-white text-zinc-900 p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                title="Change Avatar"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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

                        {/* Name & Bio (View Mode) */}
                        {!editing && (
                            <div className="flex-1 pb-4 text-center sm:text-left">
                                <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-1">{profile.full_name}</h1>
                                {userInfo && (
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-3 text-sm font-bold text-zinc-500">
                                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full uppercase tracking-wide text-xs">
                                            {userInfo.roles[0] || 'User'}
                                        </span>
                                        <span>{userInfo.email}</span>
                                    </div>
                                )}
                                <p className="text-lg text-zinc-600 font-medium max-w-2xl">{profile.bio || 'No bio yet.'}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pb-4">
                            {!editing ? (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-8 py-3 bg-zinc-900 text-yellow-400 rounded-full shadow-lg font-bold hover:bg-zinc-800 hover:scale-105 transition-all duration-200"
                                >
                                    Edit Profile
                                </button>
                            ) : (
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
                            )}
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                {editing && (
                    <div className="mt-12 animate-fadeIn">
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
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
                                        <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Bio</label>
                                        <textarea
                                            rows={4}
                                            value={formData.bio || ''}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200"
                                            placeholder="Tell us about yourself"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
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
                        </form>
                    </div>
                )}

                {/* Social Links (View Mode) */}
                {!editing && (
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
                )}
            </div>
        </div>
    )
}
