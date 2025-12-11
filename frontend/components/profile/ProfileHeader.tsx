import React from 'react'
import { ProfileResponse } from '@/services/api.types'

interface ProfileHeaderProps {
    profile: ProfileResponse
    isOwnProfile: boolean
    onEdit: () => void
    onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onPreviewImage: (url: string) => void
    avatarInputRef: React.RefObject<HTMLInputElement | null>
    coverInputRef: React.RefObject<HTMLInputElement | null>
    followersCount: number
    followingCount: number
    onViewFollowers: () => void
    onViewFollowing: () => void
}

export function ProfileHeader({
    profile,
    isOwnProfile,
    onEdit,
    onAvatarChange,
    onCoverChange,
    onPreviewImage,
    avatarInputRef,
    coverInputRef,
    followersCount,
    followingCount,
    onViewFollowers,
    onViewFollowing
}: ProfileHeaderProps) {
    return (
        <div className="relative mb-8">
            {/* Cover Image Container */}
            <div className="relative w-full h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-sm bg-zinc-100 group">
                {profile.cover_url ? (
                    <img
                        src={profile.cover_url}
                        alt="Cover"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                        onClick={() => onPreviewImage(profile.cover_url!)}
                    />
                ) : (
                    <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                        <div className="text-zinc-900/10 text-9xl font-black select-none">ATAS</div>
                    </div>
                )}

                {/* Cover Edit Button - Always Visible & High Z-Index */}
                {isOwnProfile && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
                            className="absolute top-4 right-4 z-40 bg-zinc-900/90 text-yellow-400 p-3 rounded-full shadow-xl hover:scale-110 hover:bg-zinc-800 transition-all border border-white/20"
                            title="Change Cover"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <input
                            ref={coverInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={onCoverChange}
                        />
                    </>
                )}
            </div>

            {/* Info Bar - Below Cover with Overlapping Avatar */}
            <div className="flex flex-col md:flex-row px-4 sm:px-10 relative">
                {/* Avatar Section */}
                <div className="-mt-16 sm:-mt-20 shrink-0 relative z-30 mr-0 md:mr-8 mb-4 md:mb-0 flex justify-center md:block">
                    <div className="relative group">
                        <div
                            className="h-32 w-32 sm:h-44 sm:w-44 rounded-[2rem] ring-8 ring-amber-50 bg-white overflow-hidden shadow-2xl cursor-pointer relative z-20"
                            onClick={() => profile.avatar_url && onPreviewImage(profile.avatar_url)}
                        >
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-5xl text-yellow-400 font-bold">
                                    {profile.full_name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>

                        {/* Avatar Edit Button - Always Visible & High Z-Index */}
                        {isOwnProfile && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                                    className="absolute bottom-1 right-1 z-40 bg-zinc-900 text-yellow-400 p-2.5 rounded-full shadow-xl hover:scale-110 hover:bg-zinc-800 transition-all border-2 border-white"
                                    title="Change Avatar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={onAvatarChange}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Info Text & Actions */}
                <div className="pt-2 md:pt-4 flex-1 flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left">
                    <div>
                        {/* Name */}
                        <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight leading-none mb-2">
                            {profile.full_name}
                        </h1>

                        {/* Title & Location */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-zinc-600 font-medium text-sm sm:text-base mb-4">
                            {profile.title && <span className="text-zinc-900 font-bold">{profile.title}</span>}
                            {(profile.city || profile.country) && (
                                <>
                                    {profile.title && <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>}
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {[profile.city, profile.country].filter(Boolean).join(', ')}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Followers/Following - Moved Below Country */}
                        <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                            <button onClick={onViewFollowers} className="group flex items-center gap-1.5 hover:text-zinc-900 transition-colors">
                                <span className="font-black text-zinc-900 text-lg">{followersCount}</span>
                                <span className="text-zinc-500 font-bold group-hover:underline decoration-yellow-400 decoration-2 underline-offset-4">Followers</span>
                            </button>
                            <button onClick={onViewFollowing} className="group flex items-center gap-1.5 hover:text-zinc-900 transition-colors">
                                <span className="font-black text-zinc-900 text-lg">{followingCount}</span>
                                <span className="text-zinc-500 font-bold group-hover:underline decoration-yellow-400 decoration-2 underline-offset-4">Following</span>
                            </button>
                        </div>
                    </div>

                    {/* Edit Profile Button - Moved to Right Side of Info, Below Cover */}
                    {isOwnProfile && (
                        <button
                            onClick={onEdit}
                            className="mt-6 md:mt-0 px-8 py-3 bg-zinc-900 text-yellow-400 rounded-xl shadow-lg font-bold hover:bg-zinc-800 hover:scale-105 transition-all duration-200 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
