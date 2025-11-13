"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent } from '@/services/api'
import type { EventCreate, EventFormat, EventType, EventRegistrationType, EventVisibility } from '@/services/api.types'

const formats: EventFormat[] = ['panel_discussion', 'workshop', 'webinar', 'seminar', 'club_event', 'other']
const types: EventType[] = ['online', 'offline', 'hybrid']
const registrations: EventRegistrationType[] = ['free', 'paid']
const visibilities: EventVisibility[] = ['public', 'private']

export default function CreateEventPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [format, setFormat] = useState<EventFormat>('workshop')
  const [type, setType] = useState<EventType>('online')
  const [registrationType, setRegistrationType] = useState<EventRegistrationType>('free')
  const [visibility, setVisibility] = useState<EventVisibility>('public')
  const [startDatetime, setStartDatetime] = useState('')
  const [endDatetime, setEndDatetime] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !startDatetime || !endDatetime) {
      alert('Please fill in title, start and end date/time')
      return
    }
    const start = new Date(startDatetime)
    const end = new Date(endDatetime)
    if (end.getTime() <= start.getTime()) {
      alert('End date/time must be after start date/time')
      return
    }
    if (title.trim().length < 3) {
      alert('Title must be at least 3 characters')
      return
    }
    setIsSubmitting(true)
    try {
      const payload: EventCreate = {
        title,
        description: description || undefined,
        format,
        type,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        registration_type: registrationType,
        visibility,
      }
      await createEvent(payload)
      alert('Event created successfully')
      router.push('/main/events')
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.detail || 'Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Create Event</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., AI Workshop for Beginners"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as EventFormat)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {formats.map((f) => (
                <option key={f} value={f}>{f.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Registration</label>
            <select
              value={registrationType}
              onChange={(e) => setRegistrationType(e.target.value as EventRegistrationType)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {registrations.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as EventVisibility)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {visibilities.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input
              type="datetime-local"
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input
              type="datetime-local"
              value={endDatetime}
              onChange={(e) => setEndDatetime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe your event (optional)"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}