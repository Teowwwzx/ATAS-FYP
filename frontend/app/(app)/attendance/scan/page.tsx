'use client'

import React, { useState } from 'react'
import { scanAttendance } from '@/services/api'
import { toast } from 'react-hot-toast'

export default function AttendanceScanPage() {
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    if (!token.trim()) {
      toast.error('Token is required')
      return
    }
    setLoading(true)
    try {
      await scanAttendance({ token: token.trim(), email: email.trim() || undefined })
      toast.success('Attendance recorded')
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.response?.data?.detail || 'Failed to scan attendance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Scan Attendance</h1>
      <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="QR token" className="w-full px-3 py-2 border rounded" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Registration email (optional)" className="w-full px-3 py-2 border rounded" />
      <button onClick={handleScan} disabled={loading} className="px-3 py-2 rounded bg-primary-600 text-white">Scan</button>
    </div>
  )
}

