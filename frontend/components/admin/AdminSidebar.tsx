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
]

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<UserMeResponse | null>(null)

    useEffect(() => {
        getMe().then(setUser).catch(console.error)
    }, [])

    if (!user) return null

    const userRoles = user.roles || []

    return (
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-900">ATAS Admin</h1>
                <div className="mt-2 text-xs font-medium text-gray-500 px-2 py-1 bg-gray-100 rounded-full inline-block">
                    {userRoles.includes('admin') ? 'Administrator' :
                        userRoles.includes('customer_support') ? 'Support Agent' :
                            userRoles.includes('content_moderator') ? 'Moderator' : 'Staff'}
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {menuItems.filter(item => item.roles.some(r => userRoles.includes(r))).map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-gray-400' : 'text-gray-400'}`} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">

                <button
                    onClick={async () => {
                        localStorage.removeItem('atas_token')
                        window.location.href = '/admin/login'
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 hover:text-red-900 mt-2"
                >
                    <ExitIcon className="w-5 h-5 mr-3 text-red-400" />
                    Logout
                </button>
            </div>
        </div>
    )
}
