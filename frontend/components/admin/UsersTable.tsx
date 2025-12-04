'use client'

import { UserResponse } from '@/services/api.types'
import {
    CheckIcon,
    Cross2Icon,
    ChevronDownIcon,
    ChevronUpIcon,
    PersonIcon
} from '@radix-ui/react-icons'
import { useState } from 'react'
import { format } from 'date-fns'

interface UsersTableProps {
    users: UserResponse[]
    onSuspend: (userId: string) => void
    onActivate: (userId: string) => void
    onVerifyExpert: (userId: string) => void
    onRevokeExpert: (userId: string) => void
}

export function UsersTable({ users, onSuspend, onActivate, onVerifyExpert, onRevokeExpert }: UsersTableProps) {
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

    const toggleExpand = (userId: string) => {
        setExpandedUserId(expandedUserId === userId ? null : userId)
    }

    return (
        <div className="w-full overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                        <片 key={user.id}>
                            <tr
                                onClick={() => toggleExpand(user.id)}
                                className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedUserId === user.id ? 'bg-gray-50' : ''}`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(user.id); }}
                                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                    >
                                        {expandedUserId === user.id ? (
                                            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <PersonIcon className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.roles?.map(r => r.name).join(', ') || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' :
                                        user.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.is_verified ? (
                                        <CheckIcon className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Cross2Icon className="w-5 h-5 text-gray-400" />
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                        {user.status === 'active' ? (
                                            <button
                                                onClick={() => onSuspend(user.id)}
                                                className="text-red-600 hover:text-red-900 font-medium"
                                            >
                                                Suspend
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onActivate(user.id)}
                                                className="text-green-600 hover:text-green-900 font-medium"
                                            >
                                                Activate
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {expandedUserId === user.id && (
                                <tr className="bg-gray-50">
                                    <td colSpan={6} className="px-6 py-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">User Details</h4>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-gray-500">User ID:</span>
                                                        <span className="ml-2 font-mono text-xs text-gray-700">{user.id}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Joined:</span>
                                                        <span className="ml-2 text-gray-700">
                                                            {user.created_at ? format(new Date(user.created_at), 'PPP pp') : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Roles & Permissions</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {user.roles?.map(role => (
                                                        <span key={role.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                                                            {role.name}
                                                        </span>
                                                    )) || <span className="text-gray-500">No roles assigned</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </片>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const 片 = ({ children }: { children: React.ReactNode }) => <>{children}</>
