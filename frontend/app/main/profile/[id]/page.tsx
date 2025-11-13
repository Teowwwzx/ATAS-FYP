'use client'

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import { useParams } from 'next/navigation'
import api from '@/services/api'
import { ProfileResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'

export default function ProfilePage() {
    const params = useParams()
    const userId = params.id as string

    const { user: currentUser } = useUser() // Get the logged-in user

    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [fullName, setFullName] = useState('')
    const [bio, setBio] = useState('')
    const [avatar, setAvatar] = useState<File | null>(null)
    const [coverPicture, setCoverPicture] = useState<File | null>(null)

    const isOwnProfile = currentUser?.id === userId

    useEffect(() => {
        if (userId) {
            const fetchProfile = async () => {
                try {
                    const response = await api.get<ProfileResponse>(`/profiles/${userId}`)
                    setProfile(response.data)
                    setFullName(response.data.full_name)
                    setBio(response.data.bio || '')
                } catch (err) {
                    setError('Failed to load profile.')
                    toast.error('Failed to load profile.')
                } finally {
                    setIsLoading(false)
                }
            }
            fetchProfile()
        }
    }, [userId])

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAvatar(e.target.files[0])
        }
    }

    const handleCoverPictureChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setCoverPicture(e.target.files[0])
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!profile) return

        const formData = new FormData()
        formData.append('full_name', fullName)
        formData.append('bio', bio)
        if (avatar) {
            formData.append('avatar', avatar)
        }
        if (coverPicture) {
            formData.append('cover_picture', coverPicture)
        }

        try {
                    const response = await api.put<ProfileResponse>('/profiles/me', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            setProfile(response.data)
            toast.success('Profile updated successfully!')
        } catch (err) {
            toast.error('Failed to update profile.')
        }
    }

    if (isLoading) return <div>Loading...</div>
    if (error) return <div>{error}</div>
    if (!profile) return <div>Profile not found.</div>

    return (
        <div className="container mx-auto p-4">
            {/* Display basic profile info here */}
            <h1 className="text-2xl font-bold mb-4">{profile.full_name}</h1>
            <p>{profile.bio}</p>

            {isOwnProfile && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">Avatar</label>
                            <input type="file" id="avatar" onChange={handleAvatarChange} className="mt-1" />
                        </div>
                        <div>
                            <label htmlFor="coverPicture" className="block text-sm font-medium text-gray-700">Cover Picture</label>
                            <input type="file" id="coverPicture" onChange={handleCoverPictureChange} className="mt-1" />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Save
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}