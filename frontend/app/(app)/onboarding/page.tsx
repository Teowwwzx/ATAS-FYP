'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/services/api'
import { FormInput } from '@/components/auth/FormInput'

export default function OnboardingPage() {
    const router = useRouter()
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<'student' | 'expert'>('student')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await completeOnboarding({ full_name: fullName, role })
            router.push('/dashboard')
        } catch (err: any) {
            console.error(err)
            if (err.response?.data?.detail) {
                setError(err.response.data.detail)
            } else {
                setError('Failed to complete onboarding. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col justify-center bg-amber-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
                <div className="mx-auto h-20 w-20 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 mb-6">
                    <span className="text-3xl font-black text-zinc-900">AT</span>
                </div>
                <h2 className="text-center text-4xl font-black text-zinc-900 tracking-tight">
                    Welcome to ATAS!
                </h2>
                <p className="mt-3 text-center text-lg text-zinc-500 font-medium">
                    Let's get to know you better.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-6 shadow-sm sm:rounded-[2.5rem] sm:px-12 border border-yellow-100">
                    <form className="space-y-8" onSubmit={handleSubmit}>
                        <FormInput
                            id="fullName"
                            label="Full Name"
                            type="text"
                            placeholder="e.g. John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />

                        <div>
                            <label className="block text-sm font-bold text-zinc-900 mb-3 ml-1">
                                I am a...
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole('student')}
                                    className={`flex items-center justify-center px-4 py-4 border-2 rounded-2xl text-sm font-bold transition-all duration-200 ${role === 'student'
                                        ? 'border-yellow-400 bg-yellow-50 text-zinc-900 shadow-md transform -translate-y-1'
                                        : 'border-zinc-100 bg-white text-zinc-500 hover:border-yellow-200 hover:bg-yellow-50/50'
                                        }`}
                                >
                                    Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('expert')}
                                    className={`flex items-center justify-center px-4 py-4 border-2 rounded-2xl text-sm font-bold transition-all duration-200 ${role === 'expert'
                                        ? 'border-yellow-400 bg-yellow-50 text-zinc-900 shadow-md transform -translate-y-1'
                                        : 'border-zinc-100 bg-white text-zinc-500 hover:border-yellow-200 hover:bg-yellow-50/50'
                                        }`}
                                >
                                    Expert / Speaker
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-2xl bg-red-50 p-4 border border-red-100">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-bold text-red-800">
                                            Error
                                        </h3>
                                        <div className="mt-1 text-sm text-red-700 font-medium">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-lg text-base font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {loading ? 'Saving...' : 'Get Started'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}