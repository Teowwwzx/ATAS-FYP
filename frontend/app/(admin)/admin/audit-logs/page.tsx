'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { AuditLogsTable } from '@/components/admin/AuditLogsTable'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'

const PAGE_SIZE = 20

export default function AuditLogsPage() {
    const [page, setPage] = useState(1)
    const [actionFilter, setActionFilter] = useState('')

    const queryParams = {
        page,
        page_size: PAGE_SIZE,
        action: actionFilter || undefined
    }

    const { data: logs, mutate } = useSWR(
        ['/admin/audit-logs', queryParams],
        () => adminService.getAuditLogs(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/admin/audit-logs/count', { ...queryParams, page: undefined, page_size: undefined }],
        () => adminService.getAuditLogsCount({ ...queryParams, page: undefined, page_size: undefined })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0

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
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <AuditLogsTable logs={logs || []} />
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
