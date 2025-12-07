"use client"
import React, { useEffect, useState } from 'react'
import { discoverProfiles } from '@/services/api'
import { ProfileResponse } from '@/services/api.types'
import { ExpertCard } from '@/components/ui/ExpertCard'

export default function ExpertsPage() {
    const [experts, setExperts] = useState<ProfileResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchExperts = async () => {
            try {
                const data = await discoverProfiles({ name: searchTerm })
                setExperts(data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        const timer = setTimeout(() => {
            fetchExperts()
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Find an Expert</h1>
                    <p className="text-gray-500 mt-1">Discover mentors and industry professionals for your event</p>
                </div>
                <div className="w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        className="w-full md:w-64 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : experts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No experts found matching your search.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {experts.map(expert => (
                        <ExpertCard key={expert.id} expert={expert} />
                    ))}
                </div>
            )}
        </div>
    )
}
