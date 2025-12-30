import React from 'react'
import { AppNavbar } from '@/components/ui/AppNavbar'
import { AiAssistantFab } from '@/components/ai/AiAssistantFab'
import { FloatingChatWrapper } from '@/components/chat/FloatingChatWrapper'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-amber-50">
            <AppNavbar />
            <main className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
            <FloatingChatWrapper />
            <AiAssistantFab />
        </div>
    )
}