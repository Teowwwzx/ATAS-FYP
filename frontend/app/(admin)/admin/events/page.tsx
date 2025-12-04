'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { EventsTable } from '@/components/admin/EventsTable'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'

const PAGE_SIZE = 10

export default function AdminEventsPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const queryParams = {
        page,
        page_size: PAGE_SIZE,
        q_text: search || undefined,
        status: statusFilter || undefined,
        include_all_visibility: true
    }

    const { data: events, mutate } = useSWR(
        ['/admin/events', queryParams],
        () => adminService.getEvents(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/events/count', { ...queryParams, page: undefined, page_size: undefined }],
        () => adminService.getEventsCount({ ...queryParams, page: undefined, page_size: undefined })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Events</h1>
                    <p className="text-gray-500 mt-1">Manage all events on the platform</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <EventsTable events={events || []} onRefresh={mutate} />
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
