'use client'

import { useEffect, useState } from 'react'
import { listCategories, createCategory } from '@/services/api'
import type { CategoryResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<CategoryResponse[]>([])
    const [name, setName] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const fetchData = async () => {
        try {
            const list = await listCategories()
            setCategories(list)
        } catch (e) {
            toast.error('Failed to load categories')
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error('Category name is required')
            return
        }
        setIsLoading(true)
        try {
            await createCategory({ name })
            toast.success('Category created')
            setName('')
            fetchData()
        } catch (e) {
            toast.error('Failed to create category')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-gray-500 mt-1">Manage tag library used for discovery</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4">
                        <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {categories.map((c) => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr>
                                            <td className="px-6 py-4 text-sm text-gray-500" colSpan={2}>No categories yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Category</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors"
                                placeholder="e.g., Python"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Creating...' : 'Create'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
