"use client"
import '@/app/(public)/experts/experts.css' // Recycle expert styles for consistency
import React, { useEffect, useState, Suspense } from 'react'
import { PublicNavbar } from '@/components/ui/PublicNavbar'
import Link from 'next/link'
import { EventStatus, EventType } from '@/services/api.types'

// Mock Data for Design (Since backend connection might be limited or we want to ensure visual quality first)
// In production, wire this to `api.getEvents`
const MOCK_EVENTS = [
    {
        id: '1',
        title: "Future of AI in Finance",
        date: "Oct 12, 2026",
        location: "Kuala Lumpur • Physical",
        image: "https://images.unsplash.com/photo-1639322537228-adbcb532a6f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        organizer: "FinTech Society",
        category: "Tech"
    },
    {
        id: '2',
        title: "Sustainable Architecture Workshop",
        date: "Nov 05, 2026",
        location: "Online Zoom",
        image: "https://images.unsplash.com/photo-1518005052304-a37d18028732?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        organizer: "Green Build Club",
        category: "Design"
    },
    {
        id: '3',
        title: "Startup Pitch Night 2026",
        date: "Dec 10, 2026",
        location: "Sunway University",
        image: "https://images.unsplash.com/photo-1559223607-a43c990c692c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        organizer: "Entrepreneurship Hub",
        category: "Business"
    },
    {
        id: '4',
        title: "React & Next.js Masterclass",
        date: "Jan 15, 2027",
        location: "Online",
        image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        organizer: "Dev Guild",
        category: "Tech"
    }
]

function EventsContent() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedLocation, setSelectedLocation] = useState('all')

    const filteredEvents = MOCK_EVENTS.filter(e => {
        // Search filter
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.category.toLowerCase().includes(searchTerm.toLowerCase())

        // Category filter
        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.includes(e.category)

        // Location filter
        const matchesLocation = selectedLocation === 'all' ||
            (selectedLocation === 'online' && e.location.toLowerCase().includes('online')) ||
            (selectedLocation === 'physical' && !e.location.toLowerCase().includes('online'))

        return matchesSearch && matchesCategory && matchesLocation
    })

    return (
        <div className="experts-page-wrapper">
            <div className="noise"></div>

            <PublicNavbar />

            {/* HERO */}
            <header className="expert-hero" style={{ minHeight: '60vh', paddingBottom: '2rem' }}>
                <div className="hero-badge" style={{ borderColor: '#60a5fa', color: '#60a5fa', boxShadow: '0 0 30px rgba(96, 165, 250, 0.4)' }}>
                    <i className="fas fa-calendar-alt"></i> Discover Experiences
                </div>
                <h1 className="hero-title font-display">
                    Campus Events <br /> <span style={{ color: '#60a5fa' }}>Reimagined.</span>
                </h1>
                <p className="hero-desc">
                    Find hackathons, workshops, and networking sessions across 500+ universities.
                </p>

                <div className="search-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search events (e.g. 'Hackathon', 'Design')..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ${showFilters ? 'bg-white/10' : ''}`}
                        title="Advanced Filters"
                    >
                        <i className="fas fa-sliders-h text-gray-400 hover:text-white"></i>
                    </button>
                </div>

                {/* Filter Dropdown */}
                {showFilters && (
                    <div className="mt-4 p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 max-w-2xl mx-auto">
                        <h3 className="text-lg font-bold text-white mb-4">Filter Events</h3>

                        {/* Category Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                            <div className="flex flex-wrap gap-2">
                                {['Tech', 'Design', 'Business'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            if (selectedCategories.includes(cat)) {
                                                setSelectedCategories(selectedCategories.filter(c => c !== cat))
                                            } else {
                                                setSelectedCategories([...selectedCategories, cat])
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategories.includes(cat)
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Location Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                            <div className="flex gap-2">
                                {[{ value: 'all', label: 'All' }, { value: 'online', label: 'Online' }, { value: 'physical', label: 'Physical' }].map(loc => (
                                    <button
                                        key={loc.value}
                                        onClick={() => setSelectedLocation(loc.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedLocation === loc.value
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                    >
                                        {loc.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear All */}
                        <button
                            onClick={() => {
                                setSelectedCategories([])
                                setSelectedLocation('all')
                            }}
                            className="w-full mt-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-all"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </header>

            {/* EVENTS GRID */}
            <section className="directory-section">
                <div className="section-header">
                    <h2 className="section-title font-display">Upcoming Events</h2>
                </div>

                <div className="expert-grid">
                    {/* Reusing expert-grid for layout consistency, but customized card */}
                    {filteredEvents.map(event => (
                        <div key={event.id} className="expert-card-glass" style={{ alignItems: 'flex-start', textAlign: 'left', padding: '0' }}>
                            <div className="w-full h-48 relative overflow-hidden">
                                <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                                    {event.category}
                                </div>
                            </div>

                            <div className="p-6 w-full">
                                <div className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wide">
                                    {event.date}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 leading-tight">{event.title}</h3>
                                <p className="text-gray-400 text-sm mb-4 flex items-center gap-2">
                                    <i className="fas fa-map-marker-alt"></i> {event.location}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10 w-full">
                                    <span className="text-xs text-gray-500">by {event.organizer}</span>
                                    <button className="text-white hover:text-blue-400 font-bold text-sm transition-colors">
                                        Details →
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

        </div>
    )
}

export default function EventsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EventsContent />
        </Suspense>
    )
}
