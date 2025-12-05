'use client'

import Link from 'next/link'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-amber-50">
            <div className="max-w-3xl mx-auto px-4 py-16">
                <h1 className="text-3xl font-black text-zinc-900 mb-4">Privacy Policy</h1>
                <p className="text-zinc-600 mb-6 font-medium">
                    We respect your privacy. This page describes how ATAS collects, uses, and protects your information.
                </p>
                <div className="space-y-6 bg-white p-8 rounded-2xl border border-yellow-100 shadow-sm">
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Information We Collect</h2>
                        <p className="text-zinc-700 text-sm">Account info (email, name), profile details, and event-related data you provide.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">How We Use Information</h2>
                        <p className="text-zinc-700 text-sm">To authenticate, display profiles, manage events, send notifications, and improve the platform.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Data Sharing</h2>
                        <p className="text-zinc-700 text-sm">We do not sell personal data. Public profiles and events are visible to other users by design.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Security</h2>
                        <p className="text-zinc-700 text-sm">We apply industry practices to protect data. Do not share your login credentials.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Contact</h2>
                        <p className="text-zinc-700 text-sm">Questions? Contact support via the dashboard or email.</p>
                    </section>
                </div>
                <div className="mt-8">
                    <Link href="/" className="text-zinc-900 font-bold hover:underline">Back to Home</Link>
                </div>
            </div>
        </div>
    )
}
