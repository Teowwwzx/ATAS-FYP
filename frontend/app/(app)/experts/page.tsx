"use client"
import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { discoverProfiles, semanticSearchProfiles } from '@/services/api'
import { ProfileResponse } from '@/services/api.types'
import { ExpertCard } from '@/components/ui/ExpertCard'

function ExpertsContent() {
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''
    const [experts, setExperts] = useState<ProfileResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState(initialQuery)
    // We separate the input state from the search trigger to prevent auto-search
    const [searchInput, setSearchInput] = useState(initialQuery)

    const [error, setError] = useState<string | null>(null)

    // Update input when URL parameter changes (e.g. from FAB)
    useEffect(() => {
        setSearchInput(initialQuery)
        setSearchTerm(initialQuery)
    }, [initialQuery])

    // Fetch experts only when searchTerm (the triggered search) changes
    useEffect(() => {
        const fetchExperts = async () => {
            setLoading(true)
            setError(null)
            try {
                let data: ProfileResponse[] = []
                if (searchTerm.trim()) {
                    data = await semanticSearchProfiles({ q_text: searchTerm })
                } else {
                    data = await discoverProfiles({})
                }
                setExperts(data)
            } catch (error) {
                console.error(error)
                setError('Unable to connect to the search service. Please try again later.')
            } finally {
                setLoading(false)
            }
        }
        
        fetchExperts()
    }, [searchTerm])

    const handleSearch = () => {
        setSearchTerm(searchInput)
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Find an Expert</h1>
                    <p className="text-gray-500 mt-1">Discover mentors and industry professionals for your event</p>
                </div>
                <div className="w-full md:w-auto flex gap-2">
                    <input
                        type="text"
                        placeholder="Search by name, topic, or availability..."
                        className="w-full md:w-96 px-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder-gray-500 text-base"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button 
                        onClick={handleSearch}
                        className="px-6 py-3 bg-yellow-500 text-white font-medium rounded-2xl hover:bg-yellow-600 transition-colors shadow-sm whitespace-nowrap"
                    >
                        Search
                    </button>
                </div>
            </div>

            {error ? (
                <div className="text-center py-12">
                    <div className="text-red-500 mb-2 font-medium">Connection Error</div>
                    <div className="text-gray-600">{error}</div>
                </div>
            ) : loading ? (
                <div className="space-y-8">
                    {/* Beautiful AI Loading State */}
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-4 border-yellow-200 rounded-full animate-ping opacity-25"></div>
                            <div className="absolute inset-0 border-4 border-t-yellow-500 border-r-yellow-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-4 bg-yellow-50 rounded-full flex items-center justify-center">
                                <span className="text-2xl">🤖</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 animate-pulse">
                            AI Agent is analyzing profiles...
                        </h3>
                        <p className="text-gray-500 mt-2 max-w-md">
                            Our AI is reading through expert bios to find the best match for your specific requirements.
                        </p>
                    </div>
                    
                    {/* Skeleton Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                </div>
            ) : experts.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No experts found</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                        We couldn't find anyone matching "{searchTerm}". 
                        Try adjusting your search terms or browsing all experts.
                    </p>
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-6 px-6 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                        View All Experts
                    </button>
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

export default function ExpertsPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <ExpertsContent />
        </Suspense>
    )
}
