"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import { getProfileByUserId, getMe, createEvent } from '@/services/api'
import { ProfileResponse, UserMeResponse } from '@/services/api.types'

export default function BookingPage() {
    const params = useParams()
    const router = useRouter()
    const expertId = params.expertId as string

    const [expert, setExpert] = useState<ProfileResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)

    // Form State
    const [eventType, setEventType] = useState('Guest Speaker / Keynote')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [venue, setVenue] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [expProfile, me] = await Promise.all([
                    getProfileByUserId(expertId),
                    getMe()
                ])
                setExpert(expProfile)
                setCurrentUser(me)
            } catch (error) {
                console.error(error)
                toast.error('Failed to load expert details')
            } finally {
                setLoading(false)
            }
        }
        if (expertId) fetchData()
    }, [expertId])

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        if (!date || !time || !venue || !message) {
            toast.error('Please fill in all fields')
            setSubmitting(false)
            return
        }

        try {
            // Combine date and time
            const startDateTime = new Date(`${date}T${time}`)
            // Default 1 hour duration for now
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

            // Submit booking request (Create Event + Invite)
            // Note: This is a simplified flow. Ideally we call a specific 'book' endpoint
            // or create a private event and invite the expert.
            // For now, let's assume we create a proposed event.
            await createEvent({
                title: eventType, // Using type as title for now
                description: message,
                start_datetime: startDateTime.toISOString(),
                end_datetime: endDateTime.toISOString(),
                venue_name: venue,
                venue_remark: 'Pending Confirmation',
                type: 'offline', // Default
                format: 'seminar', // Default
                cover_url: '',
                max_participant: 50,
                registration_type: 'free',
                visibility: 'private',
                // In a real app, we would invite the expertId here
            })

            toast.success('Booking request sent successfully!')
            router.push('/main/dashboard')
        } catch (error) {
            console.error(error)
            toast.error('Failed to submit booking')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
    if (!expert) return <div className="flex h-screen items-center justify-center">Expert not found</div>

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-slate-800">
            <Toaster />

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header Link */}
                <Link href={`/main/profile/${expertId}`} className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Profile
                </Link>

                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Request a Booking</h1>

                {/* You Are Booking Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">You Are Booking</p>
                    <div className="flex items-center gap-4 mb-6">
                        <img
                            src={`https://ui-avatars.com/api/?name=${expertId}&background=random&size=128`}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                        />
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{expertId}</h3> {/* Name not in profile yet? */}
                            <p className="text-slate-500">{expert.title || 'Expert'}</p>
                        </div>
                    </div>

                    {/* Availability Banner */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="bg-emerald-100 p-1 rounded-full text-emerald-600 mt-0.5">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-emerald-800 text-sm font-medium leading-relaxed">
                            <span className="font-bold">Good news!</span> {expertId} is usually available on the days you selected based on her recent activity.
                        </p>
                    </div>
                </div>

                {/* Booking Form */}
                <form onSubmit={handleBook} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8">
                    <h2 className="text-xl font-bold text-slate-900">Event Details</h2>

                    {/* Event Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Event Type</label>
                        <select
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700 bg-white appearance-none"
                        >
                            <option>Guest Speaker / Keynote</option>
                            <option>Workshop Facilitator</option>
                            <option>Panelist</option>
                            <option>Judge / Mentor</option>
                        </select>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Time (MYT)</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Venue */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Venue / Platform</label>
                        <input
                            type="text"
                            placeholder="e.g. APU Auditorium or Zoom Link"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Proposal Message */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-700">Proposal Message</label>
                            <button
                                type="button"
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-500/20"
                            >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                AI Rewrite
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                rows={6}
                                placeholder="Describe your event and why you'd like the expert to speak..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-slate-700 placeholder:text-slate-400 bg-purple-50/10 resize-none"
                            />
                            <div className="absolute bottom-3 right-3">
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                                    ATAS AI
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Sending Request...' : 'Send Booking Request'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
