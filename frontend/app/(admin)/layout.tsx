'use client'

import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe, logout } from '@/services/api'
import { UserMeResponse } from '@/services/api.types'
import { LoadingBackdrop } from '@/components/ui/LoadingBackdrop'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const [user, setUser] = useState<UserMeResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        checkAdmin()
    }, [])

    const checkAdmin = async () => {
        try {
            const me = await getMe()
            const allowedRoles = ['admin', 'customer_support', 'content_moderator']
            if (!me.roles.some(r => allowedRoles.includes(r))) {
                // Not an admin
                setUser(null)
            } else {
                setUser(me)
            }
        } catch (error) {
            console.error('Failed to check admin status', error)
            // If 401, api interceptor handles redirect to login
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    if (isLoading) {
        return <LoadingBackdrop isLoading={true} />
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-6">
                        You do not have permission to access the Admin Dashboard.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Logout & Switch Account
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
