'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AxiosError } from 'axios'

import { register } from '@/services/api'
import { ApiErrorResponse } from '@/services/api.types'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('atas_token')
        if (token) {
            router.replace('/dashboard')
        }
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isLoading) return

        if (password !== confirmPassword) {
            toast.error('Passwords do not match', { id: 'password-mismatch' })
            return
        }

        setIsLoading(true)

        try {
            await register({ email, password })
            toast.success('Account created! Please check your email to verify.')
            router.push('/login')
        } catch (error) {
            const err = error as AxiosError<ApiErrorResponse>
            const message = err.response?.data?.detail || 'Registration failed.'
            toast.error(message, { id: 'register-error' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-amber-50 font-sans">
            {/* Left Side - Playful Yellow */}
            <div className="hidden lg:flex lg:w-1/2 bg-yellow-400 relative flex-col justify-between p-12 lg:p-16 overflow-hidden">
                {/* Abstract Shapes */}
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white rounded-full opacity-20 blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-400 rounded-full opacity-20 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="h-12 w-12 bg-zinc-900 rounded-full flex items-center justify-center text-yellow-400 font-bold text-2xl">
                            A
                        </div>
                        <span className="text-3xl font-black text-zinc-900 tracking-tight">ATAS</span>
                    </div>

                    <h1 className="text-6xl font-black text-zinc-900 leading-[1.1] mb-6">
                        Join the <br />
                        <span className="text-white inline-block transform rotate-2 bg-zinc-900 px-4 py-1 rounded-lg shadow-xl">Community</span>
                    </h1>
                    <p className="text-xl text-zinc-900/80 font-medium max-w-md leading-relaxed">
                        Create an account to start booking events, managing your schedule, and connecting with experts.
                    </p>
                </div>

                <div className="relative z-10">
                    <div className="bg-white/30 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-xl max-w-sm transform -rotate-1 hover:rotate-0 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="User" />
                            </div>
                            <div>
                                <p className="font-bold text-zinc-900 text-sm">Alex Chen</p>
                                <p className="text-xs text-zinc-900/60">Student Leader</p>
                            </div>
                        </div>
                        <p className="text-zinc-900/80 text-sm font-medium">
                            "The platform is so fun to use! I love how easy it is to connect with speakers."
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white rounded-l-[3rem] shadow-[-20px_0_60px_rgba(0,0,0,0.05)] z-20">
                <div className="w-full max-w-md space-y-10">
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-black text-zinc-900 mb-3">
                            Create <br />Account
                        </h2>
                        <p className="text-gray-500 font-medium">
                            Already have an account? <Link href="/login" className="text-zinc-900 font-bold hover:underline decoration-yellow-400 decoration-4 underline-offset-2">Sign in</Link>
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div className="group">
                                <label htmlFor="email" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@university.edu.my"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-2xl bg-gray-100 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200 placeholder-gray-400"
                                />
                            </div>

                            <div className="group">
                                <label htmlFor="password" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-2xl bg-gray-100 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200 placeholder-gray-400"
                                />
                            </div>

                            <div className="group">
                                <label htmlFor="confirmPassword" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full rounded-2xl bg-gray-100 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-full bg-yellow-400 text-zinc-900 font-black text-lg shadow-[0_4px_0_rgb(0,0,0)] hover:shadow-[0_2px_0_rgb(0,0,0)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>

                        <p className="text-xs text-center text-gray-400 font-bold mt-4">
                            By clicking "Create account", you agree to our <a href="#" className="underline hover:text-zinc-900">Terms</a> and <a href="#" className="underline hover:text-zinc-900">Privacy Policy</a>.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}