import React from 'react'
import { AppNavbar } from '@/components/ui/AppNavbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { AiAssistantFab } from '@/components/ai/AiAssistantFab'
import { FloatingChatWrapper } from '@/components/chat/FloatingChatWrapper'
import { OnboardingGuard } from '@/components/auth/OnboardingGuard'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <OnboardingGuard>
            <div className="min-h-screen bg-amber-50">
                <AppNavbar />
                <main className="py-10 pb-24 md:pb-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
                <BottomNav />
                <FloatingChatWrapper />
                <AiAssistantFab />
            </div>
        </OnboardingGuard>
    )
}