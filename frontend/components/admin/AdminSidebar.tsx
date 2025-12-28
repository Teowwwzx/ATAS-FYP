'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    DashboardIcon,
    PersonIcon,
    BackpackIcon,
    ReaderIcon,
    ExitIcon,
    CalendarIcon,
    BellIcon,
    EnvelopeClosedIcon
} from '@radix-ui/react-icons'
import { useRouter } from 'next/navigation'

import { useEffect, useState } from 'react'
import { getMe } from '@/services/api'
import { UserMeResponse } from '@/services/api.types'

const menuItems = [
    { name: 'Overview', href: '/admin', icon: DashboardIcon, roles: ['admin', 'customer_support', 'content_moderator'] },
    { name: 'Users', href: '/admin/users', icon: PersonIcon, roles: ['admin', 'customer_support'] },
    { name: 'Onboarding', href: '/admin/onboarding', icon: ReaderIcon, roles: ['admin'] },
    { name: 'Organizations', href: '/admin/organizations', icon: BackpackIcon, roles: ['admin', 'customer_support'] },
    { name: 'Events', href: '/admin/events', icon: CalendarIcon, roles: ['admin', 'content_moderator'] },
    { name: 'Categories', href: '/admin/categories', icon: ReaderIcon, roles: ['admin'] },
    { name: 'Notifications', href: '/admin/notifications', icon: BellIcon, roles: ['admin'] },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: ReaderIcon, roles: ['admin'] },
    { name: 'Email Templates', href: '/admin/email-templates', icon: EnvelopeClosedIcon, roles: ['admin'] },
    { name: 'Communication Logs', href: '/admin/communications', icon: EnvelopeClosedIcon, roles: ['admin'] },
]

export function AdminSidebar() {
    const pathname = usePathname()
    // const router = useRouter() // Not used directly, using Link and window.location
    const [user, setUser] = useState<UserMeResponse | null>(null)

    useEffect(() => {
        getMe().then(setUser).catch(console.error)
    }, [])

    if (!user) return null

    const userRoles = user.roles || []

    return (
        <div className="w-72 bg-white border-r border-gray-100 min-h-screen flex flex-col sticky top-0 h-screen font-sans">
            <div className="p-8 pb-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm">
                        <span className="font-black text-xl text-zinc-900">A</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">ATAS</h1>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin Panel</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu</div>
                {menuItems.filter(item => item.roles.some(r => userRoles.includes(r))).map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center px-4 py-3.5 text-sm font-medium rounded-2xl transition-all duration-200 ${isActive
                                ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/10'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{user.full_name || 'Admin User'}</p>
                        <p className="text-xs text-gray-500 truncate capitalize">
                            {userRoles.includes('admin') ? 'Administrator' :
                                userRoles.includes('customer_support') ? 'Support Agent' :
                                    userRoles.includes('content_moderator') ? 'Moderator' : 'Staff'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={async () => {
                        localStorage.removeItem('atas_token')
                        window.location.href = '/admin/login'
                    }}
                    className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                    <ExitIcon className="w-4 h-4 mr-2" />
                    Logout
                </button>
            </div>
        </div>
    )
}
