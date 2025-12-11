'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { scanAttendance } from '@/services/api'
import { toast } from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Dynamically import QR scanner to avoid SSR issues
const Html5QrcodePlugin = dynamic(() => import('@/components/attendance/QRScanner'), { ssr: false })

function AttendanceScanInner() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId') || ''

  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  // Guard to prevent spam processing of the same scan event
  const processingRef = useRef(false)

  const handleScan = async (scannedToken: string) => {
    const cleanToken = scannedToken?.trim()

    // Prevent invalid or duplicate scans or concurrent processing
    if (!cleanToken) return
    if (processingRef.current) return
    if (cleanToken === lastScanned) return

    processingRef.current = true
    setLoading(true)
    setLastScanned(cleanToken)

    try {
      await scanAttendance(eventId, cleanToken)
      toast.success('✅ Attendance recorded!', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold',
        }
      })
      // Reset after 3 seconds to allow next scan
      setTimeout(() => {
        setLastScanned(null)
      }, 3000)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to record attendance')
      // Allow retry sooner on error? Or keep standard cooldown
      setLastScanned(null) // Reset immediately on error to allow retry
    } finally {
      setLoading(false)
      // Small cooldown before releasing processing guard to prevent double-fire
      setTimeout(() => {
        processingRef.current = false
      }, 1000)
    }
  }

  const handleManualScan = async () => {
    await handleScan(token)
    setToken('') // Clear input after scan
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 mb-2">Scan Attendance</h1>
          <p className="text-zinc-600 font-medium">Scan participant QR codes to record attendance</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${mode === 'camera'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-zinc-700 border-2 border-zinc-200 hover:border-blue-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Camera Scan
            </div>
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${mode === 'manual'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-zinc-700 border-2 border-zinc-200 hover:border-blue-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Manual Entry
            </div>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100">
          {mode === 'camera' ? (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Position QR Code in Frame</h3>
                <p className="text-sm text-zinc-500">The camera will automatically scan when detected</p>
              </div>

              <div className="relative">
                <Html5QrcodePlugin
                  fps={10}
                  qrbox={250}
                  disableFlip={false}
                  qrCodeSuccessCallback={handleScan}
                />
              </div>

              {loading && (
                <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-bold text-blue-900">Recording attendance...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wider">
                  QR Token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter or paste QR token"
                  className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-zinc-900 font-medium"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wider">
                  Registration Email <span className="text-zinc-400 normal-case">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="participant@example.com"
                  className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-zinc-900 font-medium"
                />
              </div>

              <button
                onClick={handleManualScan}
                disabled={loading || !token.trim()}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Record Attendance
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-zinc-50 rounded-2xl p-6 border border-zinc-200">
          <h4 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Use
          </h4>
          <ul className="space-y-2 text-sm text-zinc-700">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Ask participants to show their attendance QR code</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Use Camera Scan mode for quick scanning, or Manual Entry for pasted tokens</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Successful scans will show a green confirmation message</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function AttendanceScanPage() {
  return (
    <Suspense>
      <AttendanceScanInner />
    </Suspense>
  )
}
