// frontend/app/(app)/layout.tsx
import React from 'react'
import Link from 'next/link'

// Placeholder for a user icon
function UserCircleIcon() {
    return (
        <svg className="h-8 w-8 rounded-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zM12 15c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zM12 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
        </svg>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-100">
            {/* --- Sidebar --- */}
            <div className="hidden w-64 flex-col bg-white p-4 shadow-lg md:flex">
                <div className="mb-8 text-2xl font-bold text-primary-600">
                    <Link href="/dashboard">ATAS</Link>
                </div>
                <nav className="flex-1 space-y-2">
                    <Link
                        href="/dashboard"
                        className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/experts"
                        className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Find Experts
                    </Link>
                    <Link
                        href="/events"
                        className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        My Events
                    </Link>
                </nav>
            </div>

            {/* --- Main Content Area --- */}
            <div className="flex flex-1 flex-col">
                {/* --- Top Header --- */}
                <header className="flex h-16 w-full items-center justify-between bg-white px-6 shadow-sm">
                    <div className="text-lg font-semibold text-gray-800">
                        {/* We will make this title dynamic later */}
                        Dashboard
                    </div>
                    <div className="flex items-center">
                        {/* User Menu Button */}
                        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                            <UserCircleIcon />
                        </button>
                    </div>
                </header>

                {/* --- Page Content --- */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}