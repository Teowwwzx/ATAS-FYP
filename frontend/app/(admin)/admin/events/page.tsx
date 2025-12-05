'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { EventsTable } from '@/components/admin/EventsTable'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'

const DEFAULT_PAGE_SIZE = 10

export default function AdminEventsPage() {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [organizerFilter, setOrganizerFilter] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    const queryParams = {
        page,
        page_size: pageSize,
        q_text: debouncedSearch || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        include_all_visibility: true,
        organizer_id: organizerFilter || undefined
    }

    const { data: events, mutate } = useSWR(
        ['/admin/events', queryParams],
        () => adminService.getEvents(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/events/count', { ...queryParams, page: undefined }],
        () => adminService.getEventsCount({
            q_text: queryParams.q_text,
            status: queryParams.status,
            type: queryParams.type,
            include_all_visibility: queryParams.include_all_visibility,
            organizer_id: queryParams.organizer_id
        })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0

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
                <input
                    type="text"
                    placeholder="Organizer user id..."
                    value={organizerFilter}
                    onChange={(e) => { setOrganizerFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="declined">Declined</option>
                    <option value="ended">Ended</option>
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Types</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                </select>
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
                <EventsTable events={events || []} onRefresh={mutate} />
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
