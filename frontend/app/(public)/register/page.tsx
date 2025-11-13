// frontend/app/(public)/register/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AxiosError } from 'axios'

import { LoadingBackdrop } from '@/components/ui/LoadingBackdrop'
import { register } from '@/services/api'
import { ApiErrorResponse } from '@/services/api.types'
import { FormInput } from '@/components/auth/FormInput'
import { FormButton } from '@/components/auth/FormButton'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await register({ email, password })
            toast.success('Account created! Please check your email to verify.')
            router.push('/login')
        } catch (error) {
            const err = error as AxiosError<ApiErrorResponse>
            const message =
                err.response?.data?.detail || 'An unknown error occurred.'
            toast.error(message) // e.g., "Email already registered"
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <LoadingBackdrop isLoading={isLoading} />
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
                {/* ... (h2 and p tags) ... */}
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <FormInput
                        label="Email address"
                        id="email"
                        type="email"
                        placeholder="you@university.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <FormInput
                        label="Password"
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <FormButton>Create account</FormButton>
                </form>
            </div>
        </>
    )
}