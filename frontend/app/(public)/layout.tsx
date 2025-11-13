// frontend/app/(public)/layout.tsx
import React from 'react'

// This layout is for all public pages (landing, login, register)
// It ensures they share a consistent public-facing style
export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        // We add a min-height to ensure the content area can be centered
        <div className="flex min-h-screen flex-col bg-gray-50">
            {/* We can add a public <Navbar /> or <Footer /> here later
        if we want one for the landing page.
      */}
            <main className="flex flex-1 items-center justify-center p-4">
                {children}
            </main>
        </div>
    )
}