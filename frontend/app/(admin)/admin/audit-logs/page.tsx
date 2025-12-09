'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { AuditLogsTable } from '@/components/admin/AuditLogsTable'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'

const DEFAULT_PAGE_SIZE = 20

export default function AuditLogsPage() {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [actionFilter, setActionFilter] = useState('')
    const [actorFilter, setActorFilter] = useState('')
    const [targetTypeFilter, setTargetTypeFilter] = useState('')
    const [targetIdFilter, setTargetIdFilter] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const queryParams = {
        page,
        page_size: pageSize,
        action: actionFilter || undefined,
        start_after: startDate || undefined,
        end_before: endDate || undefined,
        actor_user_id: actorFilter || undefined,
        target_type: targetTypeFilter || undefined,
        target_id: targetIdFilter || undefined,
    }

    const { data: logs, mutate } = useSWR(
        ['/admin/audit-logs', queryParams],
        () => adminService.getAuditLogs(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/admin/audit-logs/count', { ...queryParams, page: undefined }],
        () => {
            const { page, page_size, ...countParams } = queryParams
            return adminService.getAuditLogsCount(countParams)
        }
    )

    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-gray-500 mt-1">View system activities</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Filter by action..."
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <input
                    type="text"
                    placeholder="Actor user id..."
                    value={actorFilter}
                    onChange={(e) => { setActorFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <select
                    value={targetTypeFilter}
                    onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Target Types</option>
                    <option value="user">user</option>
                    <option value="event">event</option>
                    <option value="organization">organization</option>
                    <option value="notification">notification</option>
                </select>
                <input
                    type="text"
                    placeholder="Target id..."
                    value={targetIdFilter}
                    onChange={(e) => { setTargetIdFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <AuditLogsTable logs={logs || []} />
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalCount}
                    pageSize={pageSize}
                />
            </div>
        </div>
    )
}
