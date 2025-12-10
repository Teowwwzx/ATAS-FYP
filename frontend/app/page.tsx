'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'

export default function HomePage() {
    const router = useRouter()
    const [hasToken, setHasToken] = useState<boolean | null>(null)

    useEffect(() => {
        try {
            // Check for token only on client side
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('atas_token')
                if (token) {
                    router.replace('/dashboard')
                    // Avoid setting state synchronously if redirecting, but needed to hide content?
                    // The linter warning "Calling setState synchronously within an effect" refers to causing a re-render immediately.
                    // Since we are redirecting, we can probably skip the state update if the redirect is fast, 
                    // OR we can wrap strictly in a condition that doesn't trigger immediately on mount if possible, 
                    // but here it IS on mount.
                    setHasToken(true)
                } else {
                    setHasToken(false)
                }
            }
        } catch {
            setHasToken(false)
        }
    }, [router])

    if (hasToken) {
        return null
    }

    return (
        <div className="min-h-screen bg-amber-50">
            <Navbar />
            <main className="container mx-auto px-4">
                <section className="py-16 sm:py-24">
                    <div className="grid md:grid-cols-2 gap-10 items-center">
                        <div>
                            <h1 className="text-4xl sm:text-6xl font-black text-zinc-900 leading-tight tracking-tight">
                                Structured Event Tool for Universities
                            </h1>
                            <p className="mt-6 text-lg sm:text-xl text-zinc-600 font-medium max-w-xl">
                                Discover verified experts, send standardized event requests, and manage confirmations with zero admin overhead.
                            </p>
                            <div className="mt-8 flex gap-4">
                                <Link href="/register" className="px-6 py-3 bg-zinc-900 text-yellow-400 rounded-full text-sm font-bold hover:bg-zinc-800 hover:scale-105 transition-all duration-200 shadow-md">
                                    Get Started
                                </Link>
                                <Link href="/login" className="px-6 py-3 bg-white border border-zinc-200 text-zinc-900 rounded-full text-sm font-bold hover:bg-zinc-50 transition-all duration-200">
                                    I already have an account
                                </Link>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="rounded-[2rem] bg-yellow-400 p-6 sm:p-10 shadow-xl">
                                <div className="bg-white/30 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-lg">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                                            <img src="/globe.svg" alt="Globe" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-900 text-sm">Verified Expert</p>
                                            <p className="text-xs text-zinc-900/60">Tech Week Speaker</p>
                                        </div>
                                    </div>
                                    <p className="text-zinc-900/80 text-sm font-medium">
                                        &quot;ATAS made finding a speaker for our tech week incredibly easy. Highly recommend!&quot;
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-12">
                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 border border-yellow-100 shadow-sm">
                            <h3 className="text-lg font-bold text-zinc-900 mb-2">Expert Discovery</h3>
                            <p className="text-zinc-600 text-sm">Search by name, company, and tags. Verified profiles only.</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-yellow-100 shadow-sm">
                            <h3 className="text-lg font-bold text-zinc-900 mb-2">Structured Requests</h3>
                            <p className="text-zinc-600 text-sm">Standardized event forms ensure clarity and quick decisions.</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-yellow-100 shadow-sm">
                            <h3 className="text-lg font-bold text-zinc-900 mb-2">Two-Way Ratings</h3>
                            <p className="text-zinc-600 text-sm">Post-event reviews improve quality and trust on both sides.</p>
                        </div>
                    </div>
                </section>

                <footer className="py-12 border-t border-yellow-100 text-sm text-zinc-600">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="font-medium">© {new Date().getFullYear()} ATAS Platform</p>
                        <div className="flex items-center gap-6">
                            <Link href="/privacy" className="hover:text-zinc-900">Privacy Policy</Link>
                            <Link href="/terms" className="hover:text-zinc-900">Terms & Conditions</Link>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    )
}
