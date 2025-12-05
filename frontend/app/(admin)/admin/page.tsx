'use client'

import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { PersonIcon, BackpackIcon, ReaderIcon } from '@radix-ui/react-icons'

export default function AdminDashboardPage() {
    const { data: stats, error, isLoading } = useSWR('admin-stats', async () => {
        return adminService.getStats()
    })

    if (isLoading) {
        return <div className="p-8">Loading stats...</div>
    }

    if (error) {
        return <div className="p-8 text-red-500">Error loading stats</div>
    }

    const cards = [
        {
            name: 'Total Users',
            value: stats?.total_users,
            icon: PersonIcon,
            bg: 'bg-blue-500/10',
            text: 'text-blue-600',
        },
        {
            name: 'Total Organizations',
            value: stats?.total_organizations,
            icon: BackpackIcon,
            bg: 'bg-purple-500/10',
            text: 'text-purple-600',
        },
        {
            name: 'Audit Logs',
            value: stats?.total_audit_logs,
            icon: ReaderIcon,
            bg: 'bg-orange-500/10',
            text: 'text-orange-600',
        },
    ]

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={card.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                        <div className={`p-4 rounded-lg ${card.bg} mr-4`}>
                            <card.icon className={`w-8 h-8 ${card.text}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{card.name}</p>
                            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
