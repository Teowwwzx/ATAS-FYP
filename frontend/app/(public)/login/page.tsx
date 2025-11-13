// frontend/app/(public)/login/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AxiosError } from 'axios'

import { LoadingBackdrop } from '@/components/ui/LoadingBackdrop'
import { login, getMyProfile } from '@/services/api'
import { ApiErrorResponse } from '@/services/api.types'
import { FormInput } from '@/components/auth/FormInput'
import { FormButton } from '@/components/auth/FormButton'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Step 1: Log in and get the token
            const { access_token } = await login({ email, password })
            localStorage.setItem('atas_token', access_token) // Save token

            // Step 2: Check if user has a profile
            try {
                await getMyProfile()
                // Success: Profile exists, go to dashboard
                toast.success('Login successful!')
                router.push('/dashboard')
            } catch (profileError) {
                // Profile check failed
                const err = profileError as AxiosError
                if (err.response?.status === 404) {
                    // 404: Profile not found, go to onboarding
                    toast.success('Welcome! Please complete your profile.')
                    router.push('/onboarding')
                } else {
                    // Other error (e.g., 500)
                    throw profileError
                }
            }
        } catch (error) {
            // Login failed
            const err = error as AxiosError<ApiErrorResponse>
            const message =
                err.response?.data?.detail || 'An unknown error occurred.'
            toast.error(message) // Display error from API
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
            <LoadingBackdrop isLoading={isLoading} />
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
                <div>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                        Sign in to ATAS
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{' '}
                        <Link
                            href="/register"
                            className="font-medium text-primary-600 hover:text-primary-500"
                        >
                            create a new account
                        </Link>
                    </p>
                </div>

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

                    <div className="text-sm">
                        <a
                            href="#" // We'll link this to the "forgot password" page later
                            className="font-medium text-primary-600 hover:text-primary-500"
                        >
                            Forgot your password?
                        </a>
                    </div>

                    <FormButton>Sign in</FormButton>
                </form>
            </div>
        </div>
    )
}