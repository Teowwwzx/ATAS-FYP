'use client'

import Link from 'next/link'

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-amber-50">
            <div className="max-w-4xl mx-auto px-4 py-16">
                <h1 className="text-4xl font-black text-zinc-900 mb-6">About ATAS</h1>
                <p className="text-xl text-zinc-600 mb-12 font-medium">
                    The platform connecting universities with industry experts for seamless event collaboration.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    <div className="bg-white p-8 rounded-2xl border border-yellow-100 shadow-sm">
                        <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 mb-4">Our Mission</h2>
                        <p className="text-zinc-600">
                            To bridge the gap between academia and industry by simplifying the process of finding, verifying, and booking experts for university events.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl border border-yellow-100 shadow-sm">
                        <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 mb-4">Our Community</h2>
                        <p className="text-zinc-600">
                            A growing network of university organizers, student committees, and industry professionals working together to create impactful learning experiences.
                        </p>
                    </div>
                </div>

                <div className="bg-zinc-900 text-white rounded-[2.5rem] p-12 text-center">
                    <h2 className="text-3xl font-black mb-6">Ready to get started?</h2>
                    <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                        Join hundreds of organizers and experts making events better, faster, and more professional.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link href="/register" className="px-8 py-4 bg-yellow-400 text-zinc-900 rounded-full font-bold hover:bg-yellow-300 transition-colors">
                            Join Now
                        </Link>
                        <Link href="/discover" className="px-8 py-4 bg-transparent border border-zinc-700 text-white rounded-full font-bold hover:bg-zinc-800 transition-colors">
                            Explore Events
                        </Link>
                    </div>
                </div>

                <div className="mt-16 text-center border-t border-zinc-200 pt-8">
                    <Link href="/" className="text-zinc-500 font-bold hover:text-zinc-900 transition-colors">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
