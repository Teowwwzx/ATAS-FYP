'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { UsersTable } from '@/components/admin/UsersTable'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function UsersPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const queryParams = {
        page,
        page_size: PAGE_SIZE,
        email: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined
    }

    const { data: users, mutate } = useSWR(
        ['/users', queryParams],
        () => adminService.getUsers(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/users/count', { ...queryParams, page: undefined, page_size: undefined }],
        () => adminService.getUsersCount({ ...queryParams, page: undefined, page_size: undefined })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0

    const handleSuspend = async (userId: string) => {
        try {
            await adminService.suspendUser(userId)
            toast.success('User suspended')
            mutate()
        } catch (e) {
            toast.error('Failed to suspend user')
        }
    }

    const handleActivate = async (userId: string) => {
        try {
            await adminService.activateUser(userId)
            toast.success('User activated')
            mutate()
        } catch (e) {
            toast.error('Failed to activate user')
        }
    }

    const handleVerifyExpert = async (userId: string) => {
        try {
            await adminService.verifyExpert(userId)
            toast.success('Expert verified')
            mutate()
        } catch (e) {
            toast.error('Failed to verify expert')
        }
    }

    const handleRevokeExpert = async (userId: string) => {
        try {
            await adminService.revokeExpert(userId)
            toast.success('Expert revoked')
            mutate()
        } catch (e) {
            toast.error('Failed to revoke expert')
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                    <p className="text-gray-500 mt-1">Manage all registered users</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="organizer">Organizer</option>
                    <option value="admin">Admin</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <UsersTable
                    users={users || []}
                    onSuspend={handleSuspend}
                    onActivate={handleActivate}
                    onVerifyExpert={handleVerifyExpert}
                    onRevokeExpert={handleRevokeExpert}
                />
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalCount}
                    pageSize={PAGE_SIZE}
                />
            </div>
        </div>
    )
}
