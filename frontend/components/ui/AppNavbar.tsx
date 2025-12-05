'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getMyProfile, logout, pingApi } from '@/services/api'
import { isTokenExpired } from '@/lib/auth'
import { ProfileResponse } from '@/services/api.types'
import { SearchModal } from './SearchModal'

export function AppNavbar() {
    const router = useRouter()
    const pathname = usePathname()
    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        const load = async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('atas_token') : null
            if (!token || isTokenExpired(token)) {
                logout()
                router.push('/login')
                return
            }
            try {
                await pingApi()
                const data = await getMyProfile()
                setProfile(data)
            } catch (error: unknown) {
                const e = error as { message?: string; response?: { status?: number } }
                if (e.message === 'Network Error' || e.response?.status === 0) {
                    return
                }
                if (e.response?.status === 401) {
                    logout()
                    router.push('/login')
                    return
                }
                console.error('Failed to load profile', error)
            }
        }
        load()
    }, [router])

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    const isActive = (path: string) => pathname === path

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-yellow-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/dashboard" className="flex items-center gap-2 group">
                                <div className="bg-yellow-400 text-zinc-900 h-10 w-10 flex items-center justify-center rounded-xl font-black text-xl transform group-hover:rotate-12 transition-transform duration-300 shadow-sm">
                                    AT
                                </div>
                                <span className="font-black text-2xl tracking-tight text-zinc-900">ATAS</span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                            <Link
                                href="/dashboard"
                                className={`inline-flex items-center px-1 pt-1 border-b-4 text-sm font-bold transition-all duration-200 ${isActive('/dashboard')
                                    ? 'border-yellow-400 text-zinc-900'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-yellow-200'
                                    }`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/discover"
                                className={`inline-flex items-center px-1 pt-1 border-b-4 text-sm font-bold transition-all duration-200 ${isActive('/discover')
                                    ? 'border-yellow-400 text-zinc-900'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-yellow-200'
                                    }`}
                            >
                                Discover
                            </Link>
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        <div className="ml-3 relative">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSearchOpen(true)}
                                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
                                >
                                    <span className="sr-only">Search</span>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </button>

                                <Link
                                    href="/events/create"
                                    className="bg-zinc-900 text-yellow-400 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-zinc-800 hover:scale-105 transition-all duration-200 shadow-md"
                                >
                                    Create Event
                                </Link>

                                <div className="relative">
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 items-center gap-3 pl-2 pr-1 h-11 border border-gray-100 hover:shadow-md transition-all"
                                    >
                                        <span className="sr-only">Open user menu</span>
                                        <span className="text-zinc-700 font-bold hidden md:block pl-2">
                                            {profile?.full_name || 'User'}
                                        </span>
                                        {profile?.avatar_url && !imageError ? (
                                            <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-white">
                                                <Image
                                                    className="object-cover"
                                                    src={profile.avatar_url}
                                                    alt=""
                                                    fill
                                                    sizes="36px"
                                                    onError={() => setImageError(true)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold ring-2 ring-white">
                                                {profile?.full_name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                    </button>

                                    {isMenuOpen && (
                                        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-xl py-2 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fadeIn border border-gray-100">
                                            <div className="px-4 py-3 border-b border-gray-100 mb-1">
                                                <p className="text-sm text-zinc-500">Signed in as</p>
                                                <p className="text-sm font-bold text-zinc-900 truncate">{profile?.full_name}</p>
                                            </div>
                                            <Link
                                                href="/profile"
                                                className="block px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-yellow-50 hover:text-zinc-900 mx-2 rounded-xl transition-colors"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                Your Profile
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 mx-2 rounded-xl transition-colors mt-1"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-zinc-400 hover:text-zinc-500 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-400"
                        >
                            <span className="sr-only">Open main menu</span>
                            <svg
                                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <svg
                                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="sm:hidden bg-white border-t border-gray-100">
                    <div className="pt-2 pb-3 space-y-1 px-2">
                        <Link
                            href="/dashboard"
                            className={`block px-3 py-2 rounded-xl text-base font-bold ${isActive('/dashboard')
                                ? 'bg-yellow-50 text-zinc-900'
                                : 'text-zinc-500 hover:bg-gray-50 hover:text-zinc-900'
                                }`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/discover"
                            className={`block px-3 py-2 rounded-xl text-base font-bold ${isActive('/discover')
                                ? 'bg-yellow-50 text-zinc-900'
                                : 'text-zinc-500 hover:bg-gray-50 hover:text-zinc-900'
                                }`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Discover
                        </Link>
                        <button
                            onClick={() => {
                                setIsMenuOpen(false)
                                setSearchOpen(true)
                            }}
                            className="block w-full text-left px-3 py-2 rounded-xl text-base font-bold text-zinc-500 hover:bg-gray-50 hover:text-zinc-900"
                        >
                            Search
                        </button>
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left px-3 py-2 rounded-xl text-base font-bold text-red-600 hover:bg-red-50"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            )}
            <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
        </nav>
    )
}
