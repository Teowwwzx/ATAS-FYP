'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getEventById, walkInAttendance } from '@/services/api'
import { EventDetails } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { formatEventDate } from '@/lib/date'
import Link from 'next/link'

export default function WalkInRegistrationPage() {
    const params = useParams()
    const id = params?.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({ name: '', email: '' })

    useEffect(() => {
        if (id) {
            loadEvent()
        }
    }, [id])

    const loadEvent = async () => {
        try {
            const data = await getEventById(id)
            setEvent(data)
        } catch (error) {
            toast.error('Event not found or access denied')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.email) {
            toast.error('Please fill in all fields')
            return
        }

        setSubmitting(true)
        try {
            await walkInAttendance(id, {
                name: formData.name,
                email: formData.email
            })
            setSuccess(true)
            toast.success('Registration successful!')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Registration failed')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Event Not Found</h1>
                <p className="text-gray-600 mb-8">The event you are looking for does not exist or is not available.</p>
                <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
                    Go to Home
                </Link>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                    <p className="text-gray-600 mb-6">
                        You have successfully registered for <span className="font-semibold text-gray-900">{event.title}</span>.
                    </p>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Create an account to track your attendance, connect with others, and access exclusive materials.
                        </p>
                        <Link
                            href={`/auth/register?email=${encodeURIComponent(formData.email)}`}
                            className="block w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                            Create Account
                        </Link>
                        <Link href="/" className="block w-full text-gray-600 font-medium py-2 hover:text-gray-900">
                            Maybe Later
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="relative h-48 bg-gray-200">
                    <ImageWithFallback
                        src={event.cover_url || ''}
                        alt={event.title}
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h1 className="text-2xl font-bold leading-tight mb-2">{event.title}</h1>
                        <div className="flex items-center text-sm text-white/90">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatEventDate(event.start_datetime)}
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Walk-in Registration</h2>
                        <p className="text-gray-600 text-sm">
                            Please provide your details to register your attendance for this event.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                placeholder="john@example.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Registering...
                                </>
                            ) : (
                                'Check In'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Why join ATAS?</h3>
                        <ul className="space-y-2">
                            <li className="flex items-start text-sm text-gray-600">
                                <svg className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Track your event history and participation
                            </li>
                            <li className="flex items-start text-sm text-gray-600">
                                <svg className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Access exclusive event materials and recordings
                            </li>
                            <li className="flex items-start text-sm text-gray-600">
                                <svg className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Connect with speakers and other attendees
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
