"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPublicEvents } from '@/services/api'
import type { EventDetails } from '@/services/api.types'

export default function EventsPage() {
  const [events, setEvents] = useState<EventDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getPublicEvents()
        setEvents(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Public Events</h1>
        <Link href="/main/events/create" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Create Event</Link>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-gray-600">No events yet.</div>
      ) : (
        <ul className="space-y-4">
          {events.map((evt) => (
            <li key={evt.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">{evt.title}</h2>
                  <p className="text-sm text-gray-600">{new Date(evt.start_datetime).toLocaleString()} - {new Date(evt.end_datetime).toLocaleString()}</p>
                  <p className="text-sm text-gray-600 capitalize">{evt.format.replace('_', ' ')} • {evt.type} • {evt.registration_type}</p>
                </div>
                {/* Placeholder for details link */}
                <Link href={`/main/events/${evt.id}`} className="text-primary-600 hover:underline">View</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}