// frontend/app/(app)/onboarding/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { completeOnboarding } from '@/services/api'
import { LoadingBackdrop } from '@/components/ui/LoadingBackdrop'
import { ProfileForm } from '@/components/onboarding/ProfileForm'
import { RoleSelector } from '@/components/onboarding/RoleSelector'
import { useUser } from '@/hooks/useUser'
import axios, { AxiosError } from 'axios'

interface ApiErrorResponse {
    detail?: string
}

export default function OnboardingPage() {
    const [step, setStep] = useState(1)
    const [role, setRole] = useState<'student' | 'expert' | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { user } = useUser({ redirectTo: '/dashboard', redirectIfFound: true })

    const handleSelectRole = (selectedRole: 'student' | 'expert') => {
        setRole(selectedRole)
        setStep(2)
    }

    const handleSubmitProfile = async (fullName: string) => {
        if (!role) return
        setIsLoading(true)

        try {
            await completeOnboarding({ full_name: fullName, role })
            toast.success('Profile created successfully!')
            router.push('/dashboard') // Onboarding complete, go to dashboard
        } catch (error) {
            const err = error as AxiosError<ApiErrorResponse>
            const message =
                err.response?.data?.detail || 'Could not update profile.'
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <LoadingBackdrop isLoading={isLoading} />
            {/* This page doesn't use the (app) layout.
        It's a full-screen modal-like experience.
      */}
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100">
                <div className="w-full max-w-2xl rounded-2xl bg-white p-10 shadow-2xl border border-gray-100 mx-4">
                    {step === 1 && <RoleSelector onSelectRole={handleSelectRole} />}
                    {step === 2 && role && (
                        <ProfileForm role={role} onSubmit={handleSubmitProfile} />
                    )}
                </div>
            </div>
        </>
    )
}