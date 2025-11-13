"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getEventById, getEventParticipants, joinPublicEvent, leaveEvent, setEventReminder } from '@/services/api'
import type { EventDetails, EventParticipantDetails, EventReminderOption } from '@/services/api.types'
import { useUser } from '@/hooks/useUser'
import { toast } from 'react-hot-toast'

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id as string
  const [event, setEvent] = useState<EventDetails | null>(null)
  const [participants, setParticipants] = useState<EventParticipantDetails[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const { user } = useUser()

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return
      setLoading(true)
      try {
        const data = await getEventById(eventId)
        setEvent(data)
        try {
          const parts = await getEventParticipants(eventId)
          setParticipants(parts)
        } catch {
          setParticipants(null)
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.response?.data?.detail || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const myParticipant = useMemo(() => {
    if (!participants || !user) return null
    return participants.find(p => p.user_id === user.user_id) || null
  }, [participants, user])

  const canJoin = useMemo(() => {
    if (!event || !user) return false
    if (myParticipant) return false
    const now = new Date()
    const start = new Date(event.start_datetime)
    return event.visibility === 'public' && event.status === 'opened' && now < start
  }, [event, user, myParticipant])

  const canQuit = useMemo(() => {
    if (!event || !user || !myParticipant) return false
    return myParticipant.role !== 'organizer'
  }, [event, user, myParticipant])

  const handleJoin = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await joinPublicEvent(eventId)
      toast.success('Joined event successfully')
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to join event'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleQuit = async () => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await leaveEvent(eventId)
      toast.success('You have left the event')
      const parts = await getEventParticipants(eventId)
      setParticipants(parts)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to leave event'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetReminder = async (option: EventReminderOption) => {
    if (!eventId) return
    setActionLoading(true)
    try {
      await setEventReminder(eventId, { option })
      const label = option === 'one_week' ? '1 week' : option === 'three_days' ? '3 days' : '1 day'
      toast.success(`Reminder set: ${label} before start`)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to set reminder'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6">Loading...</div>
  }

  if (error) {
    return <div className="max-w-3xl mx-auto p-6 text-red-600">{error}</div>
  }

  if (!event) {
    return <div className="max-w-3xl mx-auto p-6">Event not found</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      {event.description && (
        <p className="text-gray-700">{event.description}</p>
      )}
      <div className="text-sm text-gray-600">
        <div>
          <span className="font-medium">Schedule:</span> {new Date(event.start_datetime).toLocaleString()} — {new Date(event.end_datetime).toLocaleString()}
        </div>
        <div className="capitalize">
          <span className="font-medium">Format:</span> {event.format.replace('_', ' ')} • <span className="font-medium">Type:</span> {event.type} • <span className="font-medium">Registration:</span> {event.registration_type}
        </div>
        <div>
          <span className="font-medium">Visibility:</span> {event.visibility}
        </div>
      </div>

      {/* Join/Quit Controls */}
      <div className="mt-4">
        {user ? (
          <div className="space-y-2">
            {myParticipant ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">You are in this event as <span className="font-medium">{myParticipant.role}</span>.</span>
                {canQuit && (
                  <button
                    onClick={handleQuit}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Quit event
                  </button>
                )}
              </div>
            ) : (
              <div>
                {canJoin ? (
                  <button
                    onClick={handleJoin}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    Join event
                  </button>
                ) : (
                  <span className="text-sm text-gray-600">Joining is not available.</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Please log in to join or set reminders.</div>
        )}
      </div>

      {/* Reminder Options */}
      {(user && (myParticipant || (event.organizer_id === user?.user_id))) && (
        <div className="mt-6 border rounded p-4">
          <div className="font-medium mb-2">Set a reminder</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetReminder('one_week')}
              disabled={actionLoading}
              className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              1 week before
            </button>
            <button
              onClick={() => handleSetReminder('three_days')}
              disabled={actionLoading}
              className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              3 days before
            </button>
            <button
              onClick={() => handleSetReminder('one_day')}
              disabled={actionLoading}
              className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              1 day before
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">You must be joined to this event to set reminders.</p>
        </div>
      )}
    </div>
  )
}