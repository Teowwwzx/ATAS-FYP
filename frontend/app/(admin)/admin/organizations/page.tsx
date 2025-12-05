'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { OrganizationsTable } from '@/components/admin/OrganizationsTable'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'
import toast from 'react-hot-toast'
import { toastError } from '@/lib/utils'
import { OrganizationType } from '@/services/api.types'

const PAGE_SIZE = 10

export default function OrganizationsPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    const queryParams = {
        page,
        page_size: PAGE_SIZE,
        name: debouncedSearch || undefined,
        type: (typeFilter as OrganizationType) || undefined
    }

    const { data: organizations, mutate } = useSWR(
        ['/organizations', queryParams],
        () => adminService.getOrganizations(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/organizations/count', { ...queryParams, page: undefined, page_size: undefined }],
        () => adminService.getOrganizationsCount({
            name: queryParams.name,
            type: queryParams.type
        })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0

    const handleDelete = async (orgId: string) => {
        try {
            await adminService.deleteOrganization(orgId)
            toast.success('Organization deleted')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to delete organization')
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                    <p className="text-gray-500 mt-1">Manage all organizations</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Types</option>
                    <option value="company">Company</option>
                    <option value="university">University</option>
                    <option value="community">Community</option>
                    <option value="nonprofit">Nonprofit</option>
                    <option value="government">Government</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <OrganizationsTable
                    organizations={organizations || []}
                    onDelete={handleDelete}
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
