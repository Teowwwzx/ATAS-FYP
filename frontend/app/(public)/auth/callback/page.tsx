'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getMyProfile } from '@/services/api'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    const tokenFromParam = searchParams.get('access_token')
    const next = searchParams.get('next')
    if (tokenFromParam) {
      try { localStorage.setItem('atas_token', tokenFromParam) } catch {}
      // Fetch profile to check onboarding status and update local state
      setStatus('loading')
      const timeout = setTimeout(() => {
        router.replace(next || '/dashboard')
      }, 4000)
      getMyProfile()
        .then((profile) => {
           clearTimeout(timeout)
           if (!profile.is_onboarded) {
             toast('Please complete your onboarding!', { icon: '👋' })
             router.replace('/onboarding')
           } else {
             toast.success('Welcome back!')
             router.replace(next || '/dashboard')
           }
        })
        .catch(() => {
           // Fallback if profile fetch fails
           clearTimeout(timeout)
           router.replace(next || '/dashboard')
        })
      return
    }
    const code = searchParams.get('code')
    if (!code) {
      setStatus('error')
      toast.error('Missing authorization code')
      return
    }
    const run = async () => {
      try {
        setStatus('loading')
        const base = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000')
        const r = await fetch(`${base}/api/v1/auth/google/callback?code=${encodeURIComponent(code)}`)
        if (!r.ok) {
          setStatus('error')
          toast.error('Google authorization failed')
          return
        }
        const body = await r.json()
        const token = body?.access_token
        if (!token) {
          setStatus('error')
          toast.error('No access token returned')
          return
        }
        try { localStorage.setItem('atas_token', token) } catch {}
        try {
          const profile = await getMyProfile()
          if (!profile.is_onboarded) {
            toast('Please complete your onboarding!', { icon: '👋' })
            router.replace('/onboarding')
          } else {
            toast.success('Welcome back!')
            router.replace('/dashboard')
          }
        } catch {
          router.replace('/dashboard')
        }
      } catch {
        setStatus('error')
        toast.error('Sign-in failed')
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="bg-white rounded-2xl p-8 shadow-xl">
        <div className="text-center font-black text-zinc-900 text-2xl">Signing you in…</div>
        {status === 'error' && (
          <div className="mt-4 text-red-600 font-bold">Something went wrong. Please try again.</div>
        )}
      </div>
    </div>
  )
}
