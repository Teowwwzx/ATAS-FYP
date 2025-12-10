'use client'

import Link from 'next/link'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-amber-50">
            <div className="max-w-3xl mx-auto px-4 py-16">
                <h1 className="text-3xl font-black text-zinc-900 mb-4">Terms & Conditions</h1>
                <p className="text-zinc-600 mb-6 font-medium">
                    These terms govern your use of ATAS. By using the platform, you agree to the following.
                </p>
                <div className="space-y-6 bg-white p-8 rounded-2xl border border-yellow-100 shadow-sm">
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Use of Service</h2>
                        <p className="text-zinc-700 text-sm">You agree to use ATAS responsibly and comply with applicable laws.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Accounts</h2>
                        <p className="text-zinc-700 text-sm">Keep your credentials secure. Admins may verify or suspend accounts per policy.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Content</h2>
                        <p className="text-zinc-700 text-sm">Ensure event information is accurate and non-infringing.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Liability</h2>
                        <p className="text-zinc-700 text-sm">ATAS is provided &quot;as is&quot;. We are not liable for indirect damages.</p>
                    </section>
                    <section>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Changes</h2>
                        <p className="text-zinc-700 text-sm">We may update these terms. Continued use implies acceptance.</p>
                    </section>
                </div>
                <div className="mt-8">
                    <Link href="/" className="text-zinc-900 font-bold hover:underline">Back to Home</Link>
                </div>
            </div>
        </div>
    )
}
