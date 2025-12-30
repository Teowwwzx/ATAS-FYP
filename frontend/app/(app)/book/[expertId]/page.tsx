"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import { 
    getProfileByUserId, 
    getMe, 
    createEvent, 
    getMyEventHistory, 
    createEventProposal, 
    inviteEventParticipant, 
    generateAiText 
} from '@/services/api'
import { ProfileResponse, UserMeResponse, EventDetails } from '@/services/api.types'

export default function BookingPage() {
    const params = useParams()
    const router = useRouter()
    const expertId = params.expertId as string

    const [expert, setExpert] = useState<ProfileResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)

    // Form State
    const [existingEvents, setExistingEvents] = useState<EventDetails[]>([])
    const [selectedEventId, setSelectedEventId] = useState<string>('new') // 'new' or UUID
    
    const [eventType, setEventType] = useState('Guest Speaker / Keynote')
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [venue, setVenue] = useState('')
    const [message, setMessage] = useState('')
    
    const [aiLoading, setAiLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [expProfile, me, myEvents] = await Promise.all([
                    getProfileByUserId(expertId),
                    getMe(),
                    getMyEventHistory('organized')
                ])
                setExpert(expProfile)
                setCurrentUser(me)
                setExistingEvents(myEvents || [])
            } catch (error) {
                console.error(error)
                toast.error('Failed to load expert details')
            } finally {
                setLoading(false)
            }
        }
        if (expertId) fetchData()
    }, [expertId])

    // Effect to pre-fill form when existing event is selected
    useEffect(() => {
        if (selectedEventId !== 'new') {
            const ev = existingEvents.find(e => e.id === selectedEventId)
            if (ev) {
                setEventType(ev.title) // Assuming title matches or is relevant
                setVenue(ev.venue_remark || ev.venue_name || '')
                if (ev.start_datetime) {
                    const dt = new Date(ev.start_datetime)
                    setDate(dt.toISOString().split('T')[0])
                    setStartTime(dt.toTimeString().slice(0, 5))
                }
                if (ev.end_datetime) {
                    const dt = new Date(ev.end_datetime)
                    setEndTime(dt.toTimeString().slice(0, 5))
                }
            }
        }
    }, [selectedEventId, existingEvents])

    const durationStr = useMemo(() => {
        if (!startTime || !endTime) return ''
        const start = new Date(`2000-01-01T${startTime}`)
        const end = new Date(`2000-01-01T${endTime}`)
        const diff = (end.getTime() - start.getTime()) / (1000 * 60)
        
        if (diff <= 0) return 'Invalid time range'
        
        const hours = Math.floor(diff / 60)
        const mins = diff % 60
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
        if (hours > 0) return `${hours}h`
        return `${mins}m`
    }, [startTime, endTime])

    const handleAiRewrite = async () => {
        if (!message) {
            toast.error("Please write a draft message first")
            return
        }
        setAiLoading(true)
        try {
            const prompt = `
            Rewrite this booking request message to be professional, persuasive, and polite.
            It is for an expert speaker invitation.
            
            Context:
            - Expert Name: ${expert?.full_name}
            - Event Type: ${eventType}
            - User Draft: "${message}"
            
            Output only the rewritten message.
            `
            const res = await generateAiText(prompt)
            if (res.result && !res.result.startsWith("Error")) {
                setMessage(res.result)
                toast.success("Rewritten by AI!")
            } else {
                toast.error("AI service unavailable")
            }
        } catch (e) {
            console.error(e)
            toast.error("AI Rewrite failed")
        } finally {
            setAiLoading(false)
        }
    }

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        if (!date || !startTime || !endTime || !message) {
            toast.error('Please fill in all fields')
            setSubmitting(false)
            return
        }

        const startDateTimeCheck = new Date(`${date}T${startTime}`)
        const endDateTimeCheck = new Date(`${date}T${endTime}`)
        if (endDateTimeCheck <= startDateTimeCheck) {
            toast.error('End time must be after start time')
            setSubmitting(false)
            return
        }

        try {
            let eventId = selectedEventId

            // 1. Create Event if 'new'
            if (eventId === 'new') {
                const startDateTime = new Date(`${date}T${startTime}`)
                const endDateTime = new Date(`${date}T${endTime}`)
                
                const newEvent = await createEvent({
                    title: eventType,
                    description: message, // Initial description
                    start_datetime: startDateTime.toISOString(),
                    end_datetime: endDateTime.toISOString(),
                    venue_place_id: null,
                    venue_remark: venue,
                    type: 'physical',
                    format: 'seminar',
                    cover_url: undefined,
                    logo_url: undefined,
                    registration_type: 'free',
                    visibility: 'private',
                    max_participant: 50,
                    remark: 'Created via Expert Booking',
                })
                eventId = newEvent.id
            }

            // 2. Create Proposal (Inherit info)
            // This links the specific booking intent to the event
            const proposal = await createEventProposal(eventId, {
                title: `Invitation: ${eventType}`,
                description: message,
                file_url: null
            })

            // 3. Invite Expert
            // Link proposal_id so they see the details
            await inviteEventParticipant(eventId, {
                user_id: expertId,
                role: 'speaker',
                description: message,
                proposal_id: proposal.id
            })

            toast.success('Booking request sent successfully!')
            router.push('/dashboard')
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
                <Link href={`/profile/${expertId}`} className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Profile
                </Link>

                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Request a Booking</h1>

                {/* You Are Booking Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">You Are Booking</p>
                    <div className="flex items-center gap-4 mb-6">
                        <img
                            src={`https://placehold.co/128x128/png?text=${encodeURIComponent(expert.full_name)}`}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                        />
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{expert.full_name}</h3>
                            <p className="text-slate-500">{expert.title || 'Expert'}</p>
                        </div>
                    </div>

                    {/* Availability Banner */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="bg-emerald-100 p-1 rounded-full text-emerald-600 mt-0.5">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-emerald-800 text-sm font-medium leading-relaxed">
                            <span className="font-bold">Good news!</span> {expert.full_name} is usually available on the days you selected based on her recent activity.
                        </p>
                    </div>
                </div>

                {/* Booking Form */}
                <form onSubmit={handleBook} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Event Details</h2>
                        
                        {/* Event Selection */}
                        <div className="w-1/2">
                             <select
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-slate-500 text-sm"
                            >
                                <option value="new">+ Create New Event</option>
                                {existingEvents.map(ev => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.title} ({new Date(ev.start_datetime).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Event Type (Only show if New) */}
                    {selectedEventId === 'new' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Event Type / Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Keynote Speech at Tech Summit"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                            />
                        </div>
                    )}
                     {selectedEventId !== 'new' && (
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">Event Title</label>
                             <div className="px-4 py-3 bg-slate-100 rounded-xl text-slate-600 border border-slate-200">
                                 {eventType}
                             </div>
                        </div>
                     )}

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">Start Time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">End Time</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                            />
                        </div>
                    </div>
                    
                    {/* Duration Display */}
                    {durationStr && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Duration: <span className="text-slate-900 font-bold">{durationStr}</span>
                        </div>
                    )}

                    {/* Venue */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Venue / Platform</label>
                        <input
                            type="text"
                            placeholder="e.g. APU Auditorium or Zoom Link"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            disabled={selectedEventId !== 'new'}
                            className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700 placeholder:text-slate-400 ${selectedEventId !== 'new' ? 'bg-slate-100' : ''}`}
                        />
                    </div>

                    {/* Proposal Message */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-700">Proposal Message</label>
                            <button
                                type="button"
                                onClick={handleAiRewrite}
                                disabled={aiLoading}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                {aiLoading ? (
                                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                )}
                                {aiLoading ? 'Rewriting...' : 'AI Rewrite'}
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
