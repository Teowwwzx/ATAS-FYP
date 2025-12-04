'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { verifyEmail } from '@/services/api'
import { toast } from 'react-hot-toast'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Invalid or missing verification token.')
        toast.error('Invalid or missing verification token.')
        return
      }
      setStatus('loading')
      try {
        const res = await verifyEmail(token)
        setMessage(res.message || 'Email verified successfully.')
        setStatus('success')
        toast.success('Email verified!')
      } catch (err: unknown) {
        const e = err as { response?: { data?: { detail?: string } } }
        const errorMsg = e?.response?.data?.detail || 'Failed to verify email.'
        setMessage(errorMsg)
        setStatus('error')
        toast.error(errorMsg)
      }
    }
    run()
  }, [token])

  if (status === 'loading') {
    return (
      <div className="text-center lg:text-left">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 mb-6">
          <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2">Verifying Email</h3>
        <p className="text-zinc-500 font-medium">Please wait while we verify your email…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center lg:text-left animate-fade-in">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2">Email Verified</h3>
        <p className="text-zinc-500 font-medium mb-8">{message}</p>
        <Link
          href="/login"
          className="w-full flex justify-center py-4 px-6 border border-transparent rounded-full shadow-lg text-base font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center lg:text-left animate-fade-in">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
        <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-2xl font-black text-zinc-900 mb-2">Verification Failed</h3>
      <p className="text-zinc-500 font-medium mb-8">{message}</p>
      <Link
        href="/login"
        className="font-bold text-zinc-900 hover:text-yellow-600 transition-colors underline decoration-2 decoration-yellow-400 underline-offset-4"
      >
        Return to Login
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex bg-amber-50 font-sans">
      <div className="hidden lg:flex lg:w-1/2 bg-yellow-400 relative flex-col justify-between p-12 lg:p-16 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 bg-zinc-900 rounded-full flex items-center justify-center text-yellow-400 font-bold text-2xl">A</div>
            <span className="text-3xl font-black text-zinc-900 tracking-tight">ATAS</span>
          </div>
          <h1 className="text-6xl font-black text-zinc-900 leading-[1.1] mb-6">
            Verify <br /> Email
          </h1>
          <p className="text-xl text-zinc-900/80 font-medium max-w-md leading-relaxed">
            Confirm your email to access your dashboard and manage events.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white rounded-l-[3rem] shadow-[-20px_0_60px_rgba(0,0,0,0.05)] z-20">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-black text-zinc-900 mb-3">Email Verification</h2>
            <p className="text-gray-500 font-medium">We are processing your verification.</p>
          </div>
          <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
